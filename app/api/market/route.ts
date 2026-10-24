import { describeError, getClient } from "@/lib/claude";
import { claveMercado, obtenerMercado } from "@/lib/market";
import { conTimeout, crearSSE } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Genera (o lee de caché) la investigación del mercado de carros de una ciudad. Usado por /admin. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const ciudad = (params.get("ciudad") ?? "").slice(0, 80);
  const forzar = params.get("forzar") === "1";
  if (!ciudad.trim()) {
    return Response.json({ error: "Falta la ciudad." }, { status: 400 });
  }

  const controlador = new AbortController();
  req.signal.addEventListener("abort", () => controlador.abort());
  const { response, emit, cerrar } = crearSSE(() => controlador.abort());
  const log = (texto: string, nivel: "info" | "ok" | "warn" | "error" = "info") => emit({ tipo: "log", nivel, texto });
  const inicio = Date.now();

  (async () => {
    try {
      getClient();
      log(`Archivo destino: data/market-cache/${claveMercado(ciudad)}.json`);
      const mercado = await obtenerMercado(ciudad, conTimeout(controlador.signal, 240_000), {
        forzar,
        onOrigen: (o) => log(o === "en-vivo" ? "Investigando en vivo con búsqueda web…" : `Cargado desde ${o}.`),
        onActivity: (a) => {
          if (a.tipo === "busqueda") log(`Buscando: “${a.consulta}”`);
          else if (a.tipo === "lectura") log(`Leyendo: ${a.url}`);
        },
      });
      log(`Listo: ${mercado.rangosPrecio.length} rangos, ${mercado.fuentes.length} fuentes.`, "ok");
      emit({ tipo: "mercado", mercado });
      emit({ tipo: "fin", segundos: Math.round((Date.now() - inicio) / 1000) });
    } catch (err) {
      emit({ tipo: "error", mensaje: describeError(err) });
    } finally {
      cerrar();
    }
  })();

  return response;
}
