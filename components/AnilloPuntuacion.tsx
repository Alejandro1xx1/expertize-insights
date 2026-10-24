"use client";

import { useEffect, useState } from "react";

export function colorPuntuacion(v: number): string {
  if (v >= 80) return "#D4A017";
  if (v >= 60) return "#00E5FF";
  if (v >= 40) return "#7DA9B8";
  return "#FF6B7A";
}

/** Anillo que se llena animado hasta la puntuación (0–100). Dorado si es alta. */
export default function AnilloPuntuacion({ valor, tamaño = 84 }: { valor: number | null; tamaño?: number }) {
  const [mostrado, setMostrado] = useState(0);
  const r = 15.5;
  const c = 2 * Math.PI * r;
  const v = valor ?? 0;

  useEffect(() => {
    if (valor === null) return;
    let raf = 0;
    const inicio = performance.now();
    const paso = (t: number) => {
      const p = Math.min(1, (t - inicio) / 1200);
      setMostrado(Math.round(v * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [valor, v]);

  const color = colorPuntuacion(v);
  return (
    <div className="relative shrink-0" style={{ width: tamaño, height: tamaño }}>
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="3" />
        {valor !== null && (
          <circle
            cx="18"
            cy="18"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - mostrado / 100)}
            style={{ filter: `drop-shadow(0 0 3px ${color})` }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {valor === null ? (
          <span className="font-mono text-xs text-tenue">…</span>
        ) : (
          <>
            <span className="font-titulo text-xl font-bold leading-none" style={{ color }}>
              {mostrado}
            </span>
            <span className="font-mono text-[0.55rem] text-tenue">/100</span>
          </>
        )}
      </div>
    </div>
  );
}
