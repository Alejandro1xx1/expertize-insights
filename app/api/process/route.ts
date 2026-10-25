import { z } from "zod/v4";
import { describeError, getClient, type ToolActivity } from "@/lib/claude";
import { extraerDeEnlace, extraerDeFilas, extraerDeTexto, type ResultadoFuente } from "@/lib/extract";
import { urlValida } from "@/lib/hints";
import { claveDuplicado } from "@/lib/coherencia";
import { formatoMoneda } from "@/lib/format";
import { generarInsights } from "@/lib/insights";
import { obtenerMercado } from "@/lib/market";
import type { Mercado, Producto } from "@/lib/schemas";
import { conTimeout, crearSSE } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Procesos de hasta ~2 minutos; 300 s es el máximo del plan Hobby con Fluid Compute.
export const maxDuration = 300;

const TIEMPO_ENLACE = 75_000;
const TIEMPO_MERCADO = 80_000;
const TIEMPO_INSIGHTS = 55_000;
const MAX_PRODUCTOS = 12;

const EntradaSchema = z.object({
  enlaces: z.array(z.string()).max(12).default([]),
  mensaje: z.string().max(4000).default(""),
  ciudad: z.string().max(80).default(""),
  textoManual: z.string().max(60_000).nullable().default(null),
  archivo: z.object({ nombre: z.string().max(200), csv: z.string().max(400_000) }).nullable().default(null),
});

function dominio(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export async function POST(req: Request) {
  let entrada: z.infer<typeof EntradaSchema>;
  try {
    entrada = EntradaSchema.parse(await req.json());
  } catch {
    return Response.json({ error: "Datos de entrada inválidos." }, { status: 400 });
  }

  const controlador = new AbortController();
  req.signal.addEventListener("abort", () => controlador.abort());
  const { response, emit, cerrar } = crearSSE(() => controlador.abort());
  const signal = controlador.signal;
  const log = (texto: string, nivel: "info" | "ok" | "warn" | "error" | "dato" = "info") =>
    emit({ tipo: "log", nivel, texto });

  const inicio = Date.now();
  const ctx = { ciudad: entrada.ciudad.trim(), mensaje: entrada.mensaje.trim() };

  (async () => {
    try {
      getClient(); // valida la API key antes de empezar

      const enlaces: string[] = [];
      for (const raw of entrada.enlaces.map((e) => e.trim()).filter(Boolean)) {
        if (urlValida(raw)) enlaces.push(raw);
        else log(`Enlace ignorado (no es una URL válida): ${raw.slice(0, 80)}`, "warn");
      }
      if (!enlaces.length && !entrada.textoManual?.trim() && !entrada.archivo) {
        emit({ tipo: "error", mensaje: "Agrega al menos un enlace, texto pegado o un archivo de inventario." });
        return;
      }

      log(`Iniciando análisis · ${enlaces.length} enlace(s)${entrada.textoManual ? " + texto pegado" : ""}${entrada.archivo ? " + inventario" : ""}`);

      /* ── Mercado (en paralelo con la lectura de productos) ── */
      const totalFuentes = enlaces.length + (entrada.textoManual?.trim() ? 1 : 0) + (entrada.archivo ? 1 : 0);
      let progreso = 0.03;
      const avanzar = (delta: number, texto: string) => {
        progreso = Math.min(0.97, progreso + delta);
        emit({ tipo: "avance", progreso, texto });
      };
      emit({ tipo: "avance", progreso, texto: totalFuentes > 1 ? `Revisando ${totalFuentes} fuentes…` : "Revisando el carro…" });

      const mercadoP: Promise<Mercado | null> = obtenerMercado(
        ctx.ciudad,
        conTimeout(signal, TIEMPO_MERCADO),
        {
          onOrigen: (o) => {
            if (o === "cache-repositorio") log("Investigación de mercado cargada desde la caché del repositorio.", "ok");
            else if (o === "cache-memoria") log("Investigación de mercado reutilizada (caché en memoria).", "ok");
            else log(`Investigando el mercado de ${ctx.ciudad || "Colombia"} en vivo…`);
          },
          onActivity: (a) => {
            if (a.tipo === "busqueda") log(`Investigando el mercado: “${a.consulta}”`);
            else if (a.tipo === "lectura") log(`Revisando fuente de mercado: ${dominio(a.url)}`);
          },
        },
      )
        .then((m) => {
          log(`Mercado listo: ${m.rangosPrecio.length} rangos de precio, ${m.fuentes.length} fuentes.`, "ok");
          emit({ tipo: "mercado", mercado: m });
          avanzar(0.17, `Mercado de ${ctx.ciudad || "Colombia"} analizado`);
          return m;
        })
        .catch((err) => {
          log(`No se pudo completar la investigación de mercado (${describeError(err)}). Se continúa sin comparación de precios.`, "warn");
          avanzar(0.17, "Continuando sin datos de mercado");
          return null;
        });

      /* ── Productos ── */
      const productos: Producto[] = [];
      const vistos = new Set<string>();
      const motivosFallo: string[] = [];
      const publicar = (r: ResultadoFuente, etiqueta: string) => {
        for (const aviso of r.avisos) log(`${etiqueta}: ${aviso}`, "warn");
        if (!r.productos.length && r.avisos.length) {
          const motivo = r.avisos[0];
          motivosFallo.push(`${etiqueta}: ${motivo.length > 140 ? `${motivo.slice(0, 140)}…` : motivo}`);
        }
        for (const p of r.productos) {
          if (productos.length >= MAX_PRODUCTOS) {
            log(`Se alcanzó el máximo de ${MAX_PRODUCTOS} productos; el resto se omite.`, "warn");
            break;
          }
          const clave = claveDuplicado(p);
          if (vistos.has(clave)) {
            log(`${etiqueta}: "${p.nombre}" ya estaba en la lista; se omite el duplicado.`, "warn");
            continue;
          }
          vistos.add(clave);
          const producto: Producto = { ...p, id: `p${productos.length + 1}` };
          productos.push(producto);
          const precio = producto.precio !== null ? formatoMoneda(producto.precio, producto.moneda) : "precio sin dato";
          const claves = producto.atributos.slice(0, 2).map((a) => a.valor).join(", ");
          log(`Encontrado: ${producto.nombre}${claves ? `, ${claves}` : ""}, ${precio}`, "dato");
          emit({ tipo: "producto", producto });
        }
      };

      const tareas: Promise<void>[] = enlaces.map(async (url, i) => {
        const n = i + 1;
        log(`Leyendo enlace ${n}… (${dominio(url)})`);
        const onActivity = (a: ToolActivity) => {
          if (a.tipo === "lectura") log(`Enlace ${n}: abriendo la página…`);
          else if (a.tipo === "lectura_fallida") log(`Enlace ${n}: el sitio no permitió la lectura (${a.codigo}).`, "warn");
        };
        try {
          const r = await extraerDeEnlace(url, n, ctx, conTimeout(signal, TIEMPO_ENLACE), onActivity);
          if (r.productos.length > 1) log(`Enlace ${n}: catálogo detectado con ${r.productos.length} productos.`, "ok");
          publicar(r, `Enlace ${n}`);
          avanzar(0.48 / totalFuentes, r.productos[0] ? `Listo: ${r.productos[0].nombre}` : `Fuente ${n} revisada`);
        } catch (err) {
          avanzar(0.48 / totalFuentes, `No se pudo leer la fuente ${n}`);
          motivosFallo.push(`Enlace ${n}: ${describeError(err)}`);
          log(`Enlace ${n} falló: ${describeError(err)} Se continúa con los demás. Puedes usar “Pegar texto manualmente”.`, "error");
        }
      });

      if (entrada.textoManual?.trim()) {
        tareas.push(
          (async () => {
            log("Leyendo el texto pegado manualmente…");
            try {
              publicar(await extraerDeTexto(entrada.textoManual!, ctx, conTimeout(signal, TIEMPO_ENLACE)), "Texto pegado");
            } catch (err) {
              log(`No se pudo leer el texto pegado: ${describeError(err)}`, "error");
            } finally {
              avanzar(0.48 / totalFuentes, "Texto pegado revisado");
            }
          })(),
        );
      }

      if (entrada.archivo) {
        const archivo = entrada.archivo;
        tareas.push(
          (async () => {
            log(`Leyendo inventario “${archivo.nombre}”…`);
            try {
              publicar(await extraerDeFilas(archivo.csv, archivo.nombre, ctx, conTimeout(signal, TIEMPO_ENLACE)), "Inventario");
            } catch (err) {
              log(`No se pudo leer el inventario: ${describeError(err)}`, "error");
            } finally {
              avanzar(0.48 / totalFuentes, "Inventario revisado");
            }
          })(),
        );
      }

      await Promise.all(tareas);
      emit({ tipo: "productos_listos", total: productos.length });

      if (!productos.length) {
        emit({
          tipo: "error",
          mensaje: `No se pudo extraer ningún producto.${motivosFallo.length ? ` Motivo: ${motivosFallo.slice(0, 3).join(" · ")}` : ""} Prueba con “Pegar texto manualmente” o sube el inventario en Excel/CSV.`,
        });
        return;
      }
      log(`${productos.length} producto(s) listos. Esperando la investigación de mercado…`, "ok");

      if (progreso < 0.5) avanzar(0, "Estudiando el mercado…");
      const mercado = await mercadoP;
      avanzar(0, "Comparando precios y armando tu recomendación…");

      /* ── Insights ── */
      log(mercado ? "Comparando precios contra el mercado…" : "Calculando puntuaciones…");
      log("Generando puntuaciones, pros y contras según el contexto…");
      try {
        const ins = await generarInsights(productos, mercado, ctx, conTimeout(signal, TIEMPO_INSIGHTS));
        emit({ tipo: "insights", insights: ins });
        log("Insights listos.", "ok");
      } catch (err) {
        log(`No se pudieron generar los insights: ${describeError(err)}`, "error");
      }
      avanzar(0.3, "Recomendación lista");

      const segundos = Math.round((Date.now() - inicio) / 100) / 10;
      log(`Análisis completo en ${segundos} s.`, "ok");
      emit({ tipo: "avance", progreso: 1, texto: "Análisis completo" });
      emit({ tipo: "fin", segundos });
    } catch (err) {
      emit({ tipo: "error", mensaje: describeError(err) });
    } finally {
      cerrar();
    }
  })();

  return response;
}
