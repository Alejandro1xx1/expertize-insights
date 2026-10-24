"use client";

import { useState } from "react";
import { GRIS, LINEA, TINTA } from "@/lib/paleta";
import { useEnVista } from "@/lib/useEnVista";

export type SerieRadar = { id: string; nombre: string; color: string; valores: number[] };

/**
 * Radar de características (escala 0–10). Con 2 o más series muestra leyenda;
 * cada vértice tiene una zona de hover amplia con su valor.
 */
export default function Radar({
  ejes,
  series,
  tamaño = 320,
  mostrarLeyenda = true,
}: {
  ejes: string[];
  series: SerieRadar[];
  tamaño?: number;
  mostrarLeyenda?: boolean;
}) {
  const [ref, visible] = useEnVista<HTMLDivElement>();
  const [hover, setHover] = useState<{ serie: number; eje: number } | null>(null);
  const [resaltada, setResaltada] = useState<string | null>(null);

  const c = 160;
  const R = 110;
  const n = ejes.length;
  const punto = (i: number, v: number) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const r = (Math.max(0, Math.min(10, v)) / 10) * R;
    return [c + r * Math.cos(ang), c + r * Math.sin(ang)] as const;
  };
  const anillo = (v: number) =>
    ejes.map((_, i) => punto(i, v).join(",")).join(" ");

  const tip = hover ? series[hover.serie] : null;

  return (
    <div ref={ref} className="w-full">
      {mostrarLeyenda && series.length > 1 && (
        <div className="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
          {series.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseEnter={() => setResaltada(s.id)}
              onMouseLeave={() => setResaltada(null)}
              className="flex items-center gap-2 text-xs text-tinta"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              {s.nombre}
            </button>
          ))}
        </div>
      )}
      <div className="relative mx-auto" style={{ maxWidth: tamaño }}>
        <svg viewBox="0 0 320 320" className="w-full overflow-visible" role="img" aria-label={`Radar de ${ejes.join(", ")}`}>
          {[2, 4, 6, 8, 10].map((v) => (
            <polygon key={v} points={anillo(v)} fill="none" stroke={LINEA} strokeWidth={1} />
          ))}
          {ejes.map((e, i) => {
            const [x, y] = punto(i, 10);
            const [lx, ly] = punto(i, 12.6);
            return (
              <g key={e}>
                <line x1={c} y1={c} x2={x} y2={y} stroke={LINEA} strokeWidth={1} />
                <text
                  x={lx}
                  y={ly}
                  textAnchor={Math.abs(lx - c) < 8 ? "middle" : lx > c ? "start" : "end"}
                  dominantBaseline="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill={TINTA}
                >
                  {e}
                </text>
              </g>
            );
          })}
          {[5].map((v) => (
            <text key={v} x={c + 4} y={c - (v / 10) * R - 4} fontSize={8.5} fill={GRIS}>
              {v}
            </text>
          ))}

          {series.map((s, si) => {
            const atenuada = resaltada !== null && resaltada !== s.id;
            return (
              <g
                key={s.id}
                style={{
                  transform: `scale(${visible ? 1 : 0})`,
                  transformOrigin: `${c}px ${c}px`,
                  transition: `transform 900ms cubic-bezier(.2,.8,.2,1) ${si * 120}ms, opacity 200ms`,
                  opacity: atenuada ? 0.18 : 1,
                }}
              >
                <polygon
                  points={s.valores.map((v, i) => punto(i, v).join(",")).join(" ")}
                  fill={s.color}
                  fillOpacity={series.length > 1 ? 0.12 : 0.18}
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
                {s.valores.map((v, i) => {
                  const [x, y] = punto(i, v);
                  return <circle key={i} cx={x} cy={y} r={4} fill={s.color} stroke="#fff" strokeWidth={2} />;
                })}
              </g>
            );
          })}

          {/* zonas de hover más grandes que los puntos */}
          {series.map((s, si) =>
            s.valores.map((v, i) => {
              const [x, y] = punto(i, v);
              return (
                <circle
                  key={`${s.id}-${i}`}
                  cx={x}
                  cy={y}
                  r={13}
                  fill="transparent"
                  onMouseEnter={() => setHover({ serie: si, eje: i })}
                  onMouseLeave={() => setHover(null)}
                />
              );
            }),
          )}
        </svg>
        {tip && hover && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-tinta px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg"
            style={{
              left: `${(punto(hover.eje, tip.valores[hover.eje])[0] / 320) * 100}%`,
              top: `${(punto(hover.eje, tip.valores[hover.eje])[1] / 320) * 100 - 3}%`,
            }}
          >
            {series.length > 1 && <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: tip.color }} />}
            {series.length > 1 ? `${tip.nombre} · ` : ""}
            {ejes[hover.eje]}: <strong>{tip.valores[hover.eje]}/10</strong>
          </div>
        )}
      </div>
    </div>
  );
}
