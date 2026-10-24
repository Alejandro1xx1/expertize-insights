import type { Producto } from "./schemas";

export const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Primer número de un texto en formato colombiano ("45.000 km" → 45000, "2.0 L" → 2). */
export function numeroDe(texto: string | undefined | null): number | null {
  if (!texto) return null;
  const m = texto.match(/\d[\d.,]*/);
  if (!m) return null;
  let t = m[0];
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) t = t.replace(/,/g, "");
  else t = t.replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function atributo(p: Producto, ...claves: string[]): string | null {
  for (const c of claves) {
    const a = p.atributos.find((x) => norm(x.clave) === c);
    if (a) return a.valor;
  }
  return null;
}

/** Qué significa "mejor" en cada característica comparable. */
const REGLAS: Record<string, "max" | "min"> = {
  ano: "max",
  kilometraje: "min",
  potencia: "max",
  airbags: "max",
  garantia: "max",
};

export function reglaMejor(clave: string): "max" | "min" | null {
  return REGLAS[norm(clave)] ?? null;
}

/** Ids de los carros con el mejor valor en una fila (vacío si no aplica o hay empate total). */
export function mejores(productos: Producto[], valor: (p: Producto) => number | null, regla: "max" | "min"): Set<string> {
  const vals = productos.map((p) => ({ id: p.id, v: valor(p) })).filter((x): x is { id: string; v: number } => x.v !== null);
  if (vals.length < 2) return new Set();
  const objetivo = regla === "max" ? Math.max(...vals.map((x) => x.v)) : Math.min(...vals.map((x) => x.v));
  const ganadores = vals.filter((x) => x.v === objetivo);
  return ganadores.length === vals.length ? new Set() : new Set(ganadores.map((x) => x.id));
}

/** Marca del carro (primera palabra del nombre, o dos si es una marca compuesta conocida). */
export function marcaDe(nombre: string): string {
  const compuestas = ["mercedes-benz", "mercedes benz", "land rover", "alfa romeo", "aston martin", "great wall"];
  const n = nombre.toLowerCase();
  const c = compuestas.find((x) => n.startsWith(x));
  if (c) return nombre.slice(0, c.length);
  return nombre.split(/\s+/)[0] ?? "";
}
