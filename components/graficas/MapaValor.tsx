"use client";

import { useState } from "react";
import { formatoMoneda } from "@/lib/format";
import { atributo, numeroDe } from "@/lib/numeros";
import { GRIS, LINEA, ROJO, TINTA } from "@/lib/paleta";
import type { Producto } from "@/lib/schemas";
import { useEnVista } from "@/lib/useEnVista";

function ticks(min: number, max: number, n = 4) {
  const paso = (max - min) / n;
  return Array.from({ length: n + 1 }, (_, i) => min + paso * i);
}

const millones = (v: number) => `$${Math.round(v / 1_000_000)} M`;
const miles = (v: number) => `${Math.round(v / 1000)}k km`;

/**
 * Mapa de valor: precio (eje Y) contra kilometraje (eje X).
 * Abajo a la izquierda = menos kilómetros y menor precio.
 */
export default function MapaValor({ productos, destacadoId }: { productos: Producto[]; destacadoId: string | null }) {
  const [ref, visible] = useEnVista<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const puntos = productos
    .map((p) => ({ p, x: numeroDe(atributo(p, "kilometraje")), y: p.precio }))
    .filter((d): d is { p: Producto; x: number; y: number } => d.x !== null && d.y !== null);

  if (puntos.length < 2) return null;

  const W = 960;
  const H = 360;
  const m = { t: 20, r: 24, b: 44, l: 64 };
  const xs = puntos.map((d) => d.x);
  const ys = puntos.map((d) => d.y);
  const xMin = Math.max(0, Math.min(...xs) * 0.85);
  const xMax = Math.max(...xs) * 1.1 || 1;
  const yMin = Math.min(...ys) * 0.9;
  const yMax = Math.max(...ys) * 1.06;
  const sx = (v: number) => m.l + ((v - xMin) / (xMax - xMin || 1)) * (W - m.l - m.r);
  const sy = (v: number) => H - m.b - ((v - yMin) / (yMax - yMin || 1)) * (H - m.t - m.b);
  const actual = puntos.find((d) => d.p.id === hover);

  return (
    <div ref={ref} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Precio contra kilometraje de cada carro">
        {/* zona ideal */}
        <rect x={m.l} y={sy(yMin + (yMax - yMin) * 0.5)} width={(W - m.l - m.r) * 0.5} height={(H - m.t - m.b) * 0.5} fill="#1f7a45" opacity={0.05} />
        <text x={m.l + 8} y={H - m.b - 8} fontSize={10} fill="#1f7a45" fontWeight={600}>
          Mejor valor: menos km, menor precio
        </text>
        {ticks(yMin, yMax).map((t) => (
          <g key={`y${t}`}>
            <line x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} stroke={LINEA} />
            <text x={m.l - 8} y={sy(t)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill={GRIS}>
              {millones(t)}
            </text>
          </g>
        ))}
        {ticks(xMin, xMax).map((t) => (
          <text key={`x${t}`} x={sx(t)} y={H - m.b + 18} textAnchor="middle" fontSize={10} fill={GRIS}>
            {miles(t)}
          </text>
        ))}
        <text x={(W + m.l) / 2} y={H - 6} textAnchor="middle" fontSize={11} fill={GRIS}>
          Kilometraje
        </text>
        <text x={14} y={(H - m.b) / 2} textAnchor="middle" fontSize={11} fill={GRIS} transform={`rotate(-90 14 ${(H - m.b) / 2})`}>
          Precio
        </text>

        {puntos.map((d, i) => {
          const dest = d.p.id === destacadoId;
          const x = sx(d.x);
          const y = sy(d.y);
          return (
            <g
              key={d.p.id}
              style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(12px)", transition: `all 600ms ease ${i * 90}ms` }}
              onMouseEnter={() => setHover(d.p.id)}
              onMouseLeave={() => setHover(null)}
            >
              <circle cx={x} cy={y} r={16} fill="transparent" />
              <circle cx={x} cy={y} r={dest ? 8 : 6} fill={dest ? ROJO : TINTA} stroke="#fff" strokeWidth={2} />
              <text x={x > W * 0.7 ? x - 12 : x + 12} y={y - 12} textAnchor={x > W * 0.7 ? "end" : "start"} fontSize={12} fontWeight={600} fill={TINTA}>
                {d.p.nombre.length > 26 ? `${d.p.nombre.slice(0, 25)}…` : d.p.nombre}
              </text>
            </g>
          );
        })}
      </svg>
      {actual && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-tinta px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg"
          style={{ left: `${(sx(actual.x) / W) * 100}%`, top: `${(sy(actual.y) / H) * 100 - 4}%` }}
        >
          {actual.p.nombre} · {formatoMoneda(actual.y, actual.p.moneda)} · {actual.x.toLocaleString("es-CO")} km
        </div>
      )}
    </div>
  );
}
