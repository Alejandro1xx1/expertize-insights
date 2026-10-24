"use client";

import { formatoMoneda } from "@/lib/format";
import { marcaDe, norm } from "@/lib/numeros";
import type { InsightProducto, Producto } from "@/lib/schemas";
import FotoProducto from "./FotoProducto";
import { SinDato } from "./Fuente";
import Icono from "./Iconos";
import InsigniaMercado from "./InsigniaMercado";
import { colorPuntuacion } from "./AnilloPuntuacion";

export function medalla(posicion: number): string {
  return ["🥇", "🥈", "🥉"][posicion] ?? "🚗";
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
  const podio = posicion < 3;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onAbrir}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onAbrir())}
      className="tarjeta entrar group flex cursor-pointer flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-28px_rgba(0,0,0,.45)] focus-visible:outline-2 focus-visible:outline-tinta"
      style={{ animationDelay: `${Math.min(posicion, 8) * 70}ms` }}
      aria-label={`Ver ${producto.nombre}`}
    >
      <div className="relative overflow-hidden">
        <FotoProducto
          imagenes={producto.imagenes}
          alt={producto.nombre}
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="aspect-[16/10] w-full transition-transform duration-700 group-hover:scale-[1.05]"
          prioridad={podio}
        />
        <div className={`absolute left-3 top-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${podio ? "bg-white text-tinta" : "bg-black/60 text-white"}`}>
          <span>{medalla(posicion)}</span>
          <span className="cifra">#{posicion + 1}</span>
        </div>
        {insight && (
          <div
            className="cifra absolute right-3 top-3 rounded-full bg-white px-3 py-1.5 text-sm font-bold"
            style={{ color: colorPuntuacion(insight.puntuacion) }}
            title="Puntuación para este cliente"
          >
            {insight.puntuacion}
            <span className="text-[0.65rem] font-semibold text-gris"> pts</span>
          </div>
        )}
        {producto.imagenes.length > 1 && (
          <div className="cifra absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white">📷 {producto.imagenes.length}</div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="etiqueta !text-[0.58rem] text-gris">{marcaDe(producto.nombre)}</div>
        <h3 className="cifra mt-1.5 line-clamp-2 text-lg font-semibold leading-snug">{producto.nombre}</h3>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="cifra text-2xl font-bold">{producto.precio !== null ? formatoMoneda(producto.precio, producto.moneda) : <SinDato />}</span>
          {insight && <InsigniaMercado dato={insight.precioVsMercado} />}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-y border-linea py-3">
          {specs.map((s) => (
            <div key={s.clave} className="min-w-0 text-center">
              <Icono nombre={s.clave} className="mx-auto h-4 w-4 text-gris" />
              <div className={`cifra mt-1 break-words text-[0.85rem] font-bold leading-tight ${s.valor === "Sin dato" ? "font-normal text-gris" : ""}`}>{s.valor}</div>
              <div className="text-[0.65rem] text-gris">{s.clave}</div>
            </div>
          ))}
        </div>

        {insight && (
          <div className="mt-4 space-y-2 text-sm">
            {insight.titular && <p className="font-medium leading-snug">✨ {insight.titular}</p>}
            {insight.pros.slice(0, 2).map((p) => (
              <p key={p} className="leading-snug text-gris">
                ✅ {p}
              </p>
            ))}
            {insight.contras[0] && <p className="leading-snug text-gris">⚠️ {insight.contras[0]}</p>}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-5">
          <span className="etiqueta !text-[0.6rem] text-tinta transition-colors group-hover:text-rojo">Ver detalles →</span>
          {producto.alertas.length > 0 && <span title={producto.alertas.join(" · ")} className="text-xs text-champan-oscuro">🔎 revisar datos</span>}
        </div>
      </div>
    </article>
  );
}
