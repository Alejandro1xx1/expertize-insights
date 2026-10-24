"use client";

import { useState } from "react";
import { formatoMoneda } from "@/lib/format";
import { CHAMPAN, ROJO } from "@/lib/paleta";
import type { InsightProducto, Producto } from "@/lib/schemas";
import { useEnVista } from "@/lib/useEnVista";

/**
 * Barras divergentes: cuánto está cada carro por debajo (champán) o por encima (rojo)
 * del promedio de su segmento. El cero es el precio promedio del mercado.
 */
export default function BarrasMercado({ productos, insights }: { productos: Producto[]; insights: Map<string, InsightProducto> }) {
  const [ref, visible] = useEnVista<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const filas = productos
    .map((p) => ({ p, d: insights.get(p.id)?.precioVsMercado }))
    .filter((x) => x.d && x.d.porcentaje !== null) as { p: Producto; d: NonNullable<InsightProducto["precioVsMercado"]> }[];

  if (!filas.length) {
    return <p className="text-sm text-gris">Sin dato: no hay precios de mercado comparables para estos carros.</p>;
  }
  const maxAbs = Math.max(10, ...filas.map((f) => Math.abs(f.d.porcentaje!)));

  return (
    <div ref={ref} className="space-y-1">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-gris">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHAMPAN }} /> Por debajo del promedio (oportunidad)
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: ROJO }} /> Por encima del promedio
        </span>
      </div>
      {filas.map(({ p, d }, i) => {
        const pct = d.porcentaje!;
        const ancho = (Math.abs(pct) / maxAbs) * 50;
        const debajo = pct < 0;
        return (
          <div
            key={p.id}
            className="group grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 rounded-md px-1 py-2 hover:bg-niebla sm:grid-cols-[minmax(0,14rem)_1fr]"
            onMouseEnter={() => setHover(p.id)}
            onMouseLeave={() => setHover(null)}
          >
            <div className="truncate text-sm font-medium" title={p.nombre}>
              {p.nombre}
            </div>
            <div className="relative h-7">
              <div className="absolute inset-y-0 left-1/2 w-px bg-gris/50" />
              <div
                className="absolute top-1/2 h-4 -translate-y-1/2"
                style={{
                  background: debajo ? CHAMPAN : ROJO,
                  ...(debajo ? { right: "50%" } : { left: "50%" }),
                  width: `${visible ? ancho : 0}%`,
                  borderRadius: debajo ? "4px 0 0 4px" : "0 4px 4px 0",
                  transition: `width 900ms cubic-bezier(.2,.8,.2,1) ${i * 90}ms`,
                }}
              />
              <span
                className="cifra absolute top-1/2 -translate-y-1/2 text-xs font-bold text-tinta"
                style={debajo ? { right: `calc(${50 + ancho}% + 6px)` } : { left: `calc(${50 + ancho}% + 6px)` }}
              >
                {pct > 0 ? "+" : "−"}
                {Math.abs(Math.round(pct))}%
              </span>
              {hover === p.id && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-md bg-tinta px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg">
                  {p.precio !== null && formatoMoneda(p.precio, p.moneda)} · {d.referencia}
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div className="grid grid-cols-[minmax(0,9rem)_1fr] gap-3 px-1 pt-1 sm:grid-cols-[minmax(0,14rem)_1fr]">
        <span />
        <div className="text-center text-[0.7rem] text-gris">Promedio del mercado</div>
      </div>
    </div>
  );
}
