"use client";

import { ROJO, TINTA } from "@/lib/paleta";
import type { InsightProducto, Producto } from "@/lib/schemas";
import { useEnVista } from "@/lib/useEnVista";

/** Ranking horizontal de puntuación (0–100) según el contexto del cliente. */
export default function Ranking({
  productos,
  insights,
  onSeleccionar,
}: {
  productos: Producto[];
  insights: Map<string, InsightProducto>;
  onSeleccionar?: (id: string) => void;
}) {
  const [ref, visible] = useEnVista<HTMLDivElement>();
  const filas = productos
    .map((p) => ({ p, s: insights.get(p.id)?.puntuacion ?? null }))
    .filter((f): f is { p: Producto; s: number } => f.s !== null)
    .sort((a, b) => b.s - a.s);

  return (
    <div ref={ref} className="space-y-3">
      {filas.map(({ p, s }, i) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSeleccionar?.(p.id)}
          className="group grid w-full grid-cols-[1.5rem_minmax(0,1fr)_3rem] items-center gap-3 rounded-md px-1 py-1.5 text-left hover:bg-niebla sm:grid-cols-[1.5rem_minmax(0,14rem)_1fr_3rem]"
        >
          <span className="cifra text-sm font-bold text-gris">{i + 1}</span>
          <span className="truncate text-sm font-medium group-hover:underline" title={p.nombre}>
            {p.nombre}
          </span>
          <span className="col-span-3 h-2.5 overflow-hidden rounded-full bg-niebla sm:col-span-1">
            <span
              className="block h-full rounded-full"
              style={{
                width: visible ? `${s}%` : 0,
                background: i === 0 ? ROJO : TINTA,
                transition: `width 1000ms cubic-bezier(.2,.8,.2,1) ${i * 100}ms`,
              }}
            />
          </span>
          <span className="cifra row-start-1 text-right text-sm font-bold sm:row-auto">{s}</span>
        </button>
      ))}
    </div>
  );
}
