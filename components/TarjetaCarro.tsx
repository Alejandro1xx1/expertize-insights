"use client";

import { AlertTriangle, ArrowUpRight, Camera, Check, ScanSearch } from "lucide-react";
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
  const specs = specsClave(producto);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onAbrir}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onAbrir())}
      className="tarjeta entrar group flex cursor-pointer flex-col overflow-hidden transition-[box-shadow,transform,border-color] duration-200 ease-[var(--ease-suave)] hover:-translate-y-0.5 hover:border-linea-fuerte hover:shadow-2 focus-visible:shadow-[var(--foco)] focus-visible:outline-none"
      style={{ animationDelay: `${Math.min(posicion, 8) * 50}ms` }}
      aria-label={`Ver ${producto.nombre}`}
    >
      <div className="relative overflow-hidden">
        <FotoProducto
          imagenes={producto.imagenes}
          alt={producto.nombre}
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="aspect-[16/10] w-full transition-transform duration-500 ease-[var(--ease-suave)] group-hover:scale-[1.03]"
          prioridad={posicion < 3}
        />
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="cifra rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-tinta shadow-1">{puesto(posicion)}</span>
          {posicion === 0 && insight && <span className="rounded-full bg-rojo px-2.5 py-1 text-[0.68rem] font-semibold text-white">Recomendado</span>}
        </div>
        {producto.imagenes.length > 1 && (
          <div className="cifra absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[0.7rem] text-white backdrop-blur-sm">
            <Camera className="h-3 w-3" strokeWidth={1.75} /> {producto.imagenes.length}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="etiqueta text-gris-claro">{marcaDe(producto.nombre)}</div>
            <h3 className="mt-1.5 line-clamp-2 text-[1.05rem] font-semibold leading-snug">{producto.nombre}</h3>
          </div>
          {insight && (
            <div className="shrink-0 text-right" title="Puntuación para este cliente">
              <div className="cifra text-2xl font-semibold leading-none" style={{ color: colorPuntuacion(insight.puntuacion) }}>
                {insight.puntuacion}
              </div>
              <div className="mt-1 text-[0.65rem] text-gris">de 100</div>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="cifra text-[1.4rem] font-semibold">{producto.precio !== null ? formatoMoneda(producto.precio, producto.moneda) : <SinDato />}</span>
          {insight && <InsigniaMercado dato={insight.precioVsMercado} />}
        </div>

        <dl className="mt-5 grid grid-cols-3 divide-x divide-linea border-y border-linea py-3.5">
          {specs.map((s) => (
            <div key={s.clave} className="min-w-0 px-2 text-center first:pl-0 last:pr-0">
              <Icono nombre={s.clave} className="mx-auto h-4 w-4 text-gris-claro" />
              <dd className={`cifra mt-1.5 break-words text-sm font-semibold leading-tight ${s.valor === "Sin dato" ? "font-normal text-gris" : ""}`}>{s.valor}</dd>
              <dt className="mt-0.5 text-[0.68rem] text-gris">{s.clave}</dt>
            </div>
          ))}
        </dl>

        {insight && (
          <ul className="mt-5 space-y-2 text-sm leading-snug">
            {insight.titular && <li className="font-medium text-tinta">{insight.titular}</li>}
            {insight.pros.slice(0, 2).map((p) => (
              <li key={p} className="flex gap-2 text-gris">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-verde" strokeWidth={2} />
                {p}
              </li>
            ))}
            {insight.contras[0] && (
              <li className="flex gap-2 text-gris">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-champan" strokeWidth={1.75} />
                {insight.contras[0]}
              </li>
            )}
          </ul>
        )}

        <div className="mt-auto flex items-center justify-between pt-6 text-sm">
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
