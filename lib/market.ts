import { promises as fs } from "node:fs";
import path from "node:path";
import { MercadoSchema, type Mercado } from "./schemas";
import { slug } from "./slug";
import { runWithTools, validateOrRepair, WEB_FETCH, WEB_SEARCH, type ToolActivity } from "./claude";

/** Nombre del archivo de caché: carros-medellin, carros-bogota… */
export function claveMercado(ciudad: string): string {
  return `carros-${slug(ciudad) || "colombia"}`;
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
      industria: "carros",
      ciudad: String(json.ciudad ?? ""),
      generadoEl: String(json.generadoEl ?? ""),
      origen: "cache-repositorio",
    };
  } catch {
    return null;
  }
}

export async function investigarMercado(
  ciudad: string,
  signal: AbortSignal,
  onActivity?: (a: ToolActivity) => void,
): Promise<Mercado> {
  const lugar = ciudad || "Colombia";
  const { texto } = await runWithTools({
    system: `Eres un investigador del mercado automotor colombiano (carros nuevos y usados, gama de entrada a lujo) para equipos comerciales de concesionarios. Investigas con web_search (y web_fetch si necesitas abrir una fuente) y respondes en español.

Reglas estrictas:
- NUNCA inventes cifras. Cada rango de precio debe venir de una fuente que hayas consultado; pon su URL en "fuente". Si no encuentras un dato, usa null.
- Precios como números sin separadores (ej. 85000000) y moneda ISO (COP). "unidad": "precio total" salvo que la fuente indique otra cosa.
- Sé breve y concreto: es para mostrarlo en vivo a un prospecto.

Responde ÚNICAMENTE con un bloque \`\`\`json con esta forma exacta:
{"resumen":string,"rangosPrecio":[{"segmento":string,"min":number|null,"max":number|null,"promedio":number|null,"moneda":string,"unidad":string|null,"fuente":string|null}],"factoresDecision":[{"factor":string,"detalle":string}],"tendencias":[{"tendencia":string,"detalle":string}],"fuentes":[{"titulo":string,"url":string}]}`,
    prompt: `Investiga el mercado actual de carros en ${lugar}, Colombia.

Necesito:
1. Rangos de precio por segmento (6 a 8 segmentos), por ejemplo: city cars / hatchback de entrada, sedanes, SUV compactas, SUV medianas, pickups, híbridos y eléctricos, premium/lujo; separa usados recientes (3–5 años) y 0 km cuando la fuente lo permita. Incluye el promedio cuando exista (o referencias Fasecolda).
2. Los 5 factores de decisión más importantes para el comprador de carro en Colombia (ej. cuota y financiación, consumo, pico y placa, seguridad, reventa).
3. 3 a 5 tendencias recientes (ventas, híbridos/eléctricos, tasas de crédito, marcas que crecen).
4. Lista de fuentes consultadas.

Haz como máximo 4 búsquedas y prioriza ANDI/Fenalco, Fasecolda, medios económicos y especializados colombianos (El Carro Colombiano, Revista Motor) y portales de clasificados.`,
    tools: [WEB_SEARCH(4), WEB_FETCH(2)],
    signal,
    onActivity,
  });
  const data = await validateOrRepair(texto, MercadoSchema, signal);
  return {
    ...data,
    industria: "carros",
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
  ciudad: string,
  signal: AbortSignal,
  opciones: { forzar?: boolean; onActivity?: (a: ToolActivity) => void; onOrigen?: (o: Mercado["origen"]) => void } = {},
): Promise<Mercado> {
  const clave = claveMercado(ciudad);
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
  const mercado = await investigarMercado(ciudad, signal, opciones.onActivity);
  memoria.set(clave, mercado);
  return mercado;
}
