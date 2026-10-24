import { norm, numeroDe } from "./numeros";
import type { Producto } from "./schemas";

type Carro = Omit<Producto, "id">;

const AÑO_ACTUAL = new Date().getFullYear();

/** Nombres alternativos que usan los sitios → clave estándar. */
const SINONIMOS: Record<string, string> = {
  km: "Kilometraje",
  kms: "Kilometraje",
  kilometros: "Kilometraje",
  recorrido: "Kilometraje",
  millaje: "Kilometraje",
  "ano modelo": "Año",
  modelo: "Año",
  caja: "Transmisión",
  "tipo de caja": "Transmisión",
  cilindraje: "Motor",
  cilindrada: "Motor",
  "tipo de combustible": "Combustible",
  carroceria: "Carrocería",
  "tipo de carroceria": "Carrocería",
  traccion: "Tracción",
  potencia: "Potencia",
  ubicacion: "Ubicación",
  ciudad: "Ubicación",
};

const PRECIO_MIN_COP = 3_000_000;
const PRECIO_MAX_COP = 6_000_000_000;

function fmtKm(n: number) {
  return `${Math.round(n).toLocaleString("es-CO")} km`;
}

/**
 * Revisa y normaliza los datos de un carro para que sean coherentes:
 * - Kilometraje siempre presente: "0 km" si es nuevo, el valor normalizado si es usado,
 *   o "Sin dato" si la fuente no lo dice (nunca se inventa).
 * - Año válido (1950 – año siguiente); si falta, se toma del nombre cuando aparece ahí.
 * - Precio dentro de un rango lógico (corrige "98 millones" → 98.000.000).
 * - Alertas cuando algo no cuadra (ej. un 2025 con 180.000 km).
 */
export function revisarCarro(c: Carro, condicion: "nuevo" | "usado" | null): { carro: Carro; alertas: string[] } {
  const alertas: string[] = [];
  const atributos = new Map<string, string>();

  for (const a of c.atributos) {
    const k = norm(a.clave);
    const clave = SINONIMOS[k] ?? a.clave.trim();
    // "Modelo" solo es año si parece un año.
    if (k === "modelo" && !/^(19|20)\d{2}$/.test(a.valor.trim())) {
      atributos.set("Versión", a.valor.trim());
      continue;
    }
    if (!atributos.has(clave)) atributos.set(clave, a.valor.trim());
  }

  /* ── Año ── */
  let año: number | null = null;
  const textoAño = atributos.get("Año");
  if (textoAño) {
    const n = Number(textoAño.match(/(19|20)\d{2}/)?.[0]);
    if (n >= 1950 && n <= AÑO_ACTUAL + 1) {
      año = n;
      atributos.set("Año", String(n));
    } else {
      atributos.delete("Año");
      alertas.push(`Año "${textoAño}" no es válido; se omitió.`);
    }
  }
  if (año === null) {
    const n = Number(c.nombre.match(/\b(19[5-9]\d|20\d{2})\b/)?.[0]);
    if (n >= 1950 && n <= AÑO_ACTUAL + 1) {
      año = n;
      atributos.set("Año", String(n));
    }
  }

  /* ── Condición y kilometraje ── */
  const todo = `${c.nombre} ${c.precioTexto ?? ""} ${[...atributos.values()].join(" ")}`.toLowerCase();
  const pareceNuevo = condicion === "nuevo" || /\b0\s?km\b|cero kil|\bnuevo\b|0 kil/.test(todo);
  const textoKm = atributos.get("Kilometraje");
  let km: number | null = textoKm ? numeroDe(textoKm) : null;
  if (textoKm && km !== null && /mil(es)?\b/i.test(textoKm) && km < 1000) km = km * 1000;

  if (textoKm && /-\s*\d/.test(textoKm)) km = -1;
  if (km !== null && (km < 0 || km > 900_000)) {
    alertas.push(`Kilometraje "${textoKm}" no es lógico; se muestra como "Sin dato".`);
    km = null;
  }
  if (km === null && pareceNuevo) km = 0;
  atributos.set("Kilometraje", km === null ? "Sin dato" : km === 0 ? "0 km" : fmtKm(km));

  const esNuevo = km === 0 || (pareceNuevo && km === null);
  if (!atributos.has("Condición")) atributos.set("Condición", esNuevo ? "Nuevo" : km !== null ? "Usado" : "Sin dato");

  if (año !== null && km !== null) {
    const edad = Math.max(1, AÑO_ACTUAL - año + 1);
    if (km === 0 && año < AÑO_ACTUAL - 2) alertas.push(`Aparece como 0 km pero es modelo ${año}: revisar.`);
    if (km / edad > 45_000) alertas.push(`Kilometraje alto para su año (${fmtKm(km)} en un ${año}): revisar.`);
  }

  /* ── Precio ── */
  let { precio, precioTexto } = c;
  const esCop = !c.moneda || c.moneda.toUpperCase() === "COP";
  if (precio !== null && esCop) {
    if (precio < 10_000 && /mill/i.test(precioTexto ?? "")) precio = Math.round(precio * 1_000_000);
    if (precio < PRECIO_MIN_COP || precio > PRECIO_MAX_COP) {
      alertas.push(`Precio "${precioTexto ?? precio}" fuera de un rango lógico para un carro; se muestra como "Sin dato".`);
      precio = null;
      precioTexto = null;
    }
  }

  // Orden estable: lo más importante primero.
  const orden = ["Año", "Kilometraje", "Condición", "Transmisión", "Motor", "Potencia", "Combustible", "Tracción", "Carrocería", "Versión"];
  const atributosOrdenados = [
    ...orden.filter((k) => atributos.has(k)).map((k) => ({ clave: k, valor: atributos.get(k)! })),
    ...[...atributos.entries()].filter(([k]) => !orden.includes(k)).map(([clave, valor]) => ({ clave, valor })),
  ].slice(0, 16);

  return {
    carro: { ...c, precio, precioTexto, atributos: atributosOrdenados, alertas },
    alertas,
  };
}

/** Clave para detectar el mismo carro repetido entre fuentes. */
export function claveDuplicado(c: Carro): string {
  const km = c.atributos.find((a) => a.clave === "Kilometraje")?.valor ?? "";
  return `${norm(c.nombre).replace(/[^a-z0-9]/g, "")}|${c.precio ?? ""}|${km}`;
}
