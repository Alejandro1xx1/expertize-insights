import { obtenerPistas, type Pistas } from "./hints";
import {
  ExtraccionSchema,
  type Extraccion,
  type Producto,
  industriaLabel,
} from "./schemas";
import { parseStructured, runWithTools, validateOrRepair, WEB_FETCH, type ToolActivity } from "./claude";

const MAX_POR_FUENTE = 12;

const REGLAS = `Reglas estrictas:
- NUNCA inventes datos. Cada dato debe aparecer en la página o en el texto entregado. Si algo no aparece, usa null (o no lo incluyas en atributos).
- "precio": número sin separadores (ej. 98000000) SOLO si el precio aparece explícito. "precioTexto": el precio copiado tal cual aparece (ej. "$98.000.000"). Si no hay precio, ambos null.
- "moneda": código ISO (COP, USD…) deducido del sitio; null si no se puede saber.
- "imagenes": URLs absolutas de fotos del producto que aparezcan en la página o en las pistas (máximo 6). Nunca construyas ni adivines URLs.
- "atributos": pares clave/valor cortos y útiles para comparar (ej. Año, Kilometraje, Motor, Transmisión, Área, Habitaciones, Baños, Parqueaderos, Estrato, Cilindraje, Ubicación). Claves en español con mayúscula inicial, valores cortos con unidades.
- "enlace": URL exacta del producto si se conoce (en catálogos, el enlace de cada ítem); si no, null.
- Si la fuente es un catálogo o listado, "tipo": "catalogo" y extrae hasta ${MAX_POR_FUENTE} productos. Si es una ficha individual, "tipo": "producto". Si no hay productos, "tipo": "sin_productos" y explica en "nota".`;

const FORMATO = `Responde ÚNICAMENTE con un bloque \`\`\`json con esta forma exacta:
{"tipo":"producto|catalogo|sin_productos","productos":[{"nombre":string,"precio":number|null,"moneda":string|null,"precioTexto":string|null,"imagenes":string[],"atributos":[{"clave":string,"valor":string}],"enlace":string|null}],"nota":string|null}`;

type Contexto = { industria: string; ciudad: string; mensaje: string };

export type ResultadoFuente = {
  productos: Omit<Producto, "id">[];
  avisos: string[];
};

function pistasTexto(p: Pistas | null): string {
  if (!p) return "(No se pudo leer el HTML directamente; usa web_fetch.)";
  return [
    p.titulo ? `Título: ${p.titulo}` : "",
    p.imagenes.length ? `Imágenes encontradas en el HTML:\n${p.imagenes.join("\n")}` : "Imágenes: ninguna encontrada en el HTML.",
    p.jsonLd.length ? `Datos estructurados (JSON-LD):\n${p.jsonLd.join("\n---\n")}` : "",
    p.texto ? `Texto visible (parcial):\n${p.texto.slice(0, 6000)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Números que aparecen en un texto, sin separadores de miles. */
function numerosEn(texto: string): Set<string> {
  const set = new Set<string>();
  for (const m of texto.matchAll(/\d[\d.,'\s]{0,20}\d|\d/g)) {
    const limpio = m[0].replace(/[\s.,']/g, "");
    set.add(limpio.replace(/^0+(?=\d)/, ""));
    // "98.000.000,00" → también sin los decimales
    const sinDecimales = m[0].replace(/[.,]\d{2}$/, "").replace(/[\s.,']/g, "");
    set.add(sinDecimales);
  }
  return set;
}

function precioVerificado(precio: number, precioTexto: string | null, evidencia: string, nums: Set<string>): boolean {
  if (precioTexto && evidencia.includes(precioTexto.trim())) return true;
  const entero = String(Math.round(precio));
  if (nums.has(entero)) return true;
  // "98 millones", "98,5 millones"
  for (const div of [1e6, 1e3]) {
    const v = precio / div;
    const txt = Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", "");
    if (nums.has(txt)) return true;
  }
  return false;
}

/**
 * Limpia lo que devolvió el modelo: quita fotos que no estén en la fuente y
 * anula precios que no se puedan verificar en el contenido leído.
 */
function sanear(
  ext: Extraccion,
  evidencia: string,
  fuente: Producto["fuente"],
  avisos: string[],
): Omit<Producto, "id">[] {
  const evidenciaPlana = evidencia.replace(/\\\//g, "/").replace(/\\u0026/g, "&").replace(/&amp;/g, "&");
  const nums = numerosEn(evidenciaPlana);
  return ext.productos.slice(0, MAX_POR_FUENTE).map((p) => {
    const imagenes = [...new Set(p.imagenes)]
      .filter((src) => /^https?:\/\//i.test(src) && evidenciaPlana.includes(src.replace(/&amp;/g, "&")))
      .slice(0, 6);
    let { precio, precioTexto } = p;
    if (precio !== null && !precioVerificado(precio, precioTexto, evidenciaPlana, nums)) {
      avisos.push(`Precio de "${p.nombre}" no se pudo verificar en la fuente: se muestra como "Sin dato".`);
      precio = null;
      precioTexto = null;
    }
    return {
      nombre: p.nombre.trim() || "Sin nombre",
      precio,
      moneda: p.moneda,
      precioTexto,
      imagenes,
      atributos: p.atributos.filter((a) => a.clave.trim() && a.valor.trim()).slice(0, 14),
      enlace: p.enlace && /^https?:\/\//i.test(p.enlace) ? p.enlace : fuente.url,
      fuente,
    };
  });
}

export async function extraerDeEnlace(
  url: string,
  indice: number,
  ctx: Contexto,
  signal: AbortSignal,
  onActivity: (a: ToolActivity) => void,
): Promise<ResultadoFuente> {
  const avisos: string[] = [];
  const pistas = await obtenerPistas(url);

  const { texto, evidencia, lecturasExitosas } = await runWithTools({
    system: `Eres un analista comercial que extrae fichas de producto de páginas de venta en Colombia (industria: ${industriaLabel(ctx.industria)}). Respondes en español.\n\n${REGLAS}\n\n${FORMATO}`,
    prompt: `Enlace ${indice}: ${url}

Si las pistas de abajo ya traen la información completa del producto (nombre, precio, características), úsalas directamente. Si están incompletas o vacías, lee la página con web_fetch usando la URL exacta (máximo 2 lecturas).

Pistas obtenidas del HTML:
${pistasTexto(pistas)}`,
    tools: [WEB_FETCH(2)],
    signal,
    onActivity,
  });

  const ext = await validateOrRepair(texto, ExtraccionSchema, signal);
  const contenidoDirecto = (pistas?.texto.length ?? 0) > 200 || (pistas?.jsonLd.length ?? 0) > 0;
  const codigoServidor = /"type":"(?:bash_)?code_execution_tool_result"/.test(evidencia);
  if (!contenidoDirecto && lecturasExitosas === 0 && !codigoServidor) {
    // No se leyó nada de la página: cualquier producto sería inventado.
    return {
      productos: [],
      avisos: ["No se pudo leer el contenido de la página. Usa “Pegar texto manualmente” o sube el inventario."],
    };
  }
  if (ext.tipo === "sin_productos" || ext.productos.length === 0) {
    avisos.push(ext.nota ?? "No se encontraron productos en la página.");
  }
  const evidenciaTotal = [evidencia, pistas?.imagenes.join("\n") ?? "", pistas?.jsonLd.join("\n") ?? "", pistas?.texto ?? ""].join("\n");
  let dominio = url;
  try {
    dominio = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    /* url ya validada antes */
  }
  const productos = sanear(
    ext,
    evidenciaTotal,
    { tipo: "enlace", indice, etiqueta: `Enlace ${indice} · ${dominio}`, url },
    avisos,
  );
  return { productos, avisos };
}

export async function extraerDeTexto(
  texto: string,
  ctx: Contexto,
  signal: AbortSignal,
): Promise<ResultadoFuente> {
  const avisos: string[] = [];
  const ext = await parseStructured({
    system: `Eres un analista comercial que extrae fichas de producto de texto pegado por un vendedor (industria: ${industriaLabel(ctx.industria)}). Respondes en español.\n\n${REGLAS}`,
    prompt: `Texto pegado manualmente:\n\n${texto.slice(0, 40_000)}`,
    schema: ExtraccionSchema,
    signal,
  });
  return {
    productos: sanear(ext, texto, { tipo: "texto", indice: 0, etiqueta: "Texto pegado", url: null }, avisos),
    avisos,
  };
}

export async function extraerDeFilas(
  csv: string,
  nombreArchivo: string,
  ctx: Contexto,
  signal: AbortSignal,
): Promise<ResultadoFuente> {
  const avisos: string[] = [];
  const ext = await parseStructured({
    system: `Eres un analista comercial que convierte inventarios (Excel/CSV) en fichas de producto (industria: ${industriaLabel(ctx.industria)}). Respondes en español.\n\n${REGLAS}\n- Es un inventario: "tipo": "catalogo". Si hay más de ${MAX_POR_FUENTE} filas, elige las ${MAX_POR_FUENTE} que mejor encajen con el contexto del cliente.`,
    prompt: `Contexto del cliente: ${ctx.mensaje || "(sin contexto)"} · Ciudad: ${ctx.ciudad || "(sin ciudad)"}\n\nInventario (${nombreArchivo}):\n${csv.slice(0, 60_000)}`,
    schema: ExtraccionSchema,
    signal,
  });
  return {
    productos: sanear(
      ext,
      csv,
      { tipo: "archivo", indice: 0, etiqueta: `Archivo · ${nombreArchivo}`, url: null },
      avisos,
    ),
    avisos,
  };
}
