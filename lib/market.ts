import { promises as fs } from "node:fs";
import path from "node:path";
import { MercadoSchema, type Mercado, industriaLabel } from "./schemas";
import { slug } from "./slug";
import { runWithTools, validateOrRepair, WEB_FETCH, WEB_SEARCH, type ToolActivity } from "./claude";

export function claveMercado(industria: string, ciudad: string): string {
  return `${slug(industria)}-${slug(ciudad) || "colombia"}`;
}

const CACHE_DIR = path.join(process.cwd(), "data", "market-cache");

// Caché en memoria: vive mientras la instancia del servidor esté activa.
const memoria = new Map<string, Mercado>();

async function leerCacheRepositorio(clave: string): Promise<Mercado | null> {
  try {
    const raw = await fs.readFile(path.join(CACHE_DIR, `${clave}.json`), "utf8");
    const json = JSON.parse(raw);
    const parsed = MercadoSchema.safeParse(json);
    if (!parsed.success) return null;
    return {
      ...parsed.data,
      industria: String(json.industria ?? ""),
      ciudad: String(json.ciudad ?? ""),
      generadoEl: String(json.generadoEl ?? ""),
      origen: "cache-repositorio",
    };
  } catch {
    return null;
  }
}

export async function investigarMercado(
  industria: string,
  ciudad: string,
  contexto: string,
  signal: AbortSignal,
  onActivity?: (a: ToolActivity) => void,
): Promise<Mercado> {
  const lugar = ciudad || "Colombia";
  const ind = industriaLabel(industria);
  const { texto } = await runWithTools({
    system: `Eres un investigador de mercado para equipos comerciales en Colombia. Investigas con web_search (y web_fetch si necesitas abrir una fuente) y respondes en español.

Reglas estrictas:
- NUNCA inventes cifras. Cada rango de precio debe venir de una fuente que hayas consultado; pon su URL en "fuente". Si no encuentras un dato, usa null.
- Precios como números sin separadores (ej. 85000000) y moneda ISO (COP). "unidad" indica a qué se refiere el precio: "precio total", "por m²", "arriendo mensual", etc.
- Sé breve y concreto: es para mostrarlo en vivo a un prospecto.

Responde ÚNICAMENTE con un bloque \`\`\`json con esta forma exacta:
{"resumen":string,"rangosPrecio":[{"segmento":string,"min":number|null,"max":number|null,"promedio":number|null,"moneda":string,"unidad":string|null,"fuente":string|null}],"factoresDecision":[{"factor":string,"detalle":string}],"tendencias":[{"tendencia":string,"detalle":string}],"fuentes":[{"titulo":string,"url":string}]}`,
    prompt: `Investiga el mercado actual de "${ind}" en ${lugar}.
${contexto ? `Contexto del negocio: ${contexto}\n` : ""}
Necesito:
1. Rangos de precio por segmento (4 a 8 segmentos relevantes, ej. por tipo/gama/antigüedad o por zona/estrato), con promedio cuando exista.
2. Los 5 factores de decisión más importantes para el comprador.
3. 3 a 5 tendencias recientes del mercado.
4. Lista de fuentes consultadas.

Haz como máximo 4 búsquedas y prioriza portales de clasificados, gremios y medios económicos colombianos.`,
    tools: [WEB_SEARCH(4), WEB_FETCH(2)],
    signal,
    onActivity,
  });
  const data = await validateOrRepair(texto, MercadoSchema, signal);
  return {
    ...data,
    industria,
    ciudad: lugar,
    generadoEl: new Date().toISOString(),
    origen: "en-vivo",
  };
}

/**
 * Orden de búsqueda: archivo en /data/market-cache → memoria → investigación en vivo.
 * Con `forzar` se omite la caché (lo usa /admin para regenerar).
 */
export async function obtenerMercado(
  industria: string,
  ciudad: string,
  contexto: string,
  signal: AbortSignal,
  opciones: { forzar?: boolean; onActivity?: (a: ToolActivity) => void; onOrigen?: (o: Mercado["origen"]) => void } = {},
): Promise<Mercado> {
  const clave = claveMercado(industria, ciudad);
  if (!opciones.forzar) {
    const archivo = await leerCacheRepositorio(clave);
    if (archivo) {
      opciones.onOrigen?.("cache-repositorio");
      return archivo;
    }
    const enMemoria = memoria.get(clave);
    if (enMemoria) {
      opciones.onOrigen?.("cache-memoria");
      return { ...enMemoria, origen: "cache-memoria" };
    }
  }
  opciones.onOrigen?.("en-vivo");
  // La caché es por industria + ciudad, así que no se mezcla el contexto
  // particular de un prospecto cuando la industria tiene caché compartida.
  const mercado = await investigarMercado(industria, ciudad, industria === "otro" ? contexto : "", signal, opciones.onActivity);
  if (industria !== "otro") memoria.set(clave, mercado);
  return mercado;
}
