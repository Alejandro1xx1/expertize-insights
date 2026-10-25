"use client";

import { AlertTriangle, ArrowUpRight, Check, ScanSearch } from "lucide-react";
import { formatoMoneda } from "@/lib/format";
import { marcaDe, norm } from "@/lib/numeros";
import type { InsightProducto, Producto } from "@/lib/schemas";
import { colorPuntuacion } from "./AnilloPuntuacion";
import FotoProducto from "./FotoProducto";
import { SinDato } from "./Fuente";
import Icono from "./Iconos";
import InsigniaMercado from "./InsigniaMercado";

/** Posición en formato tipográfico: 01, 02, 03… */
export function puesto(posicion: number): string {
  return String(posicion + 1).padStart(2, "0");
}

/** Año, kilometraje (siempre) y transmisión — o lo que más se acerque. */
export function specsClave(p: Producto): { clave: string; valor: string }[] {
  const prioridad = ["ano", "kilometraje", "transmision", "motor", "combustible", "carroceria"];
  const out: { clave: string; valor: string }[] = [];
  for (const k of prioridad) {
    const a = p.atributos.find((x) => norm(x.clave) === k);
    if (a) out.push(a);
    else if (k === "kilometraje") out.push({ clave: "Kilometraje", valor: "Sin dato" });
    if (out.length === 3) break;
  }
  return out;
}

export default function TarjetaCarro({
  producto,
  insight,
  posicion,
  onAbrir,
}: {
  producto: Producto;
  insight: InsightProducto | undefined;
  posicion: number;
  onAbrir: () => void;
}) {
  const specs = [...specsClave(producto)];
  // En la fila hay espacio para un cuarto dato: motor o combustible.
  const extra = producto.atributos.find((a) => ["motor", "combustible", "potencia"].includes(norm(a.clave)) && !specs.some((x) => x.clave === a.clave));
  if (extra) specs.push(extra);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onAbrir}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onAbrir())}
      className="tarjeta entrar group grid cursor-pointer overflow-hidden transition-[box-shadow,border-color] duration-200 ease-[var(--ease-suave)] hover:border-linea-fuerte hover:shadow-2 focus-visible:shadow-[var(--foco)] focus-visible:outline-none md:grid-cols-[minmax(0,40%)_1fr]"
      style={{ animationDelay: `${Math.min(posicion, 8) * 50}ms` }}
      aria-label={`Ver ${producto.nombre}`}
    >
      {/* Foto */}
      <div className="relative overflow-hidden md:min-h-[300px]">
        <FotoProducto
          imagenes={producto.imagenes}
          alt={producto.nombre}
          sizes="(max-width: 768px) 100vw, 40vw"
          className="aspect-[16/10] w-full transition-transform duration-500 ease-[var(--ease-suave)] group-hover:scale-[1.03] md:absolute md:inset-0 md:aspect-auto md:h-full"
          prioridad={posicion < 3}
        />
      </div>

      {/* Información */}
      <div className="flex min-w-0 flex-col p-5 sm:p-7 lg:p-8">
        <div className="flex items-start gap-4 sm:gap-5">
          <span className="cifra pt-0.5 text-2xl font-semibold leading-none text-gris-claro sm:text-[2rem]">{puesto(posicion)}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="etiqueta text-gris-claro">{marcaDe(producto.nombre)}</span>
              {posicion === 0 && insight && <span className="rounded-full bg-rojo px-2.5 py-0.5 text-[0.68rem] font-semibold text-white">Recomendado</span>}
            </div>
            <h3 className="mt-1.5 text-lg font-semibold leading-snug sm:text-xl">{producto.nombre}</h3>
          </div>
          {insight && (
            <div className="shrink-0 text-right" title="Puntuación para este cliente">
              <div className="cifra text-2xl font-semibold leading-none sm:text-[2rem]" style={{ color: colorPuntuacion(insight.puntuacion) }}>
                {insight.puntuacion}
              </div>
              <div className="mt-1 text-[0.65rem] text-gris">de 100</div>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="cifra text-[1.5rem] font-semibold">{producto.precio !== null ? formatoMoneda(producto.precio, producto.moneda) : <SinDato />}</span>
          {insight && <InsigniaMercado dato={insight.precioVsMercado} />}
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-y-4 border-y border-linea py-4 sm:grid-cols-4 sm:divide-x sm:divide-linea">
          {specs.map((s) => (
            <div key={s.clave} className="flex min-w-0 items-start gap-2.5 sm:px-4 sm:first:pl-0">
              <Icono nombre={s.clave} className="mt-0.5 h-4 w-4 shrink-0 text-gris-claro" />
              <div className="min-w-0">
                <dd className={`cifra break-words text-sm font-semibold leading-tight ${s.valor === "Sin dato" ? "font-normal text-gris" : ""}`}>{s.valor}</dd>
                <dt className="mt-0.5 text-[0.7rem] text-gris">{s.clave}</dt>
              </div>
            </div>
          ))}
        </dl>

        {insight && (
          <div className="mt-5 grid gap-x-8 gap-y-3 text-sm leading-snug lg:grid-cols-2">
            {insight.titular && <p className="font-medium text-tinta lg:col-span-2">{insight.titular}</p>}
            <ul className="space-y-2">
              {insight.pros.slice(0, 2).map((p) => (
                <li key={p} className="flex gap-2 text-gris">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-verde" strokeWidth={2} />
                  {p}
                </li>
              ))}
            </ul>
            {insight.contras[0] && (
              <ul>
                <li className="flex gap-2 text-gris">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-champan" strokeWidth={1.75} />
                  {insight.contras[0]}
                </li>
              </ul>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-6 text-sm">
          <span className="inline-flex items-center gap-1 font-medium text-tinta transition-colors duration-150 group-hover:text-rojo">
            Ver detalles <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
          </span>
          {producto.alertas.length > 0 && (
            <span title={producto.alertas.join(" · ")} className="inline-flex items-center gap-1 text-xs text-champan-oscuro">
              <ScanSearch className="h-3.5 w-3.5" strokeWidth={1.5} /> Revisar datos
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
