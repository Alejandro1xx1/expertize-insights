"use client";

import { useEffect, useState } from "react";

/** Las puntuaciones van en tinta; las bajas se atenúan. El rojo queda para el acento. */
export function colorPuntuacion(v: number): string {
  return v >= 50 ? "#141414" : "#6a675f";
}

/** Anillo que se llena animado hasta la puntuación (0–100). */
export default function AnilloPuntuacion({ valor, tamaño = 84, oscuro = false }: { valor: number | null; tamaño?: number; oscuro?: boolean }) {
  const [mostrado, setMostrado] = useState(0);
  const r = 16;
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

  const color = oscuro ? (v >= 50 ? "#ffffff" : "#a9a8a4") : colorPuntuacion(v);
  return (
    <div className="relative shrink-0" style={{ width: tamaño, height: tamaño }} title="Puntuación según el contexto del cliente">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke={oscuro ? "rgba(255,255,255,.15)" : "#e7e4de"} strokeWidth="1.6" />
        {valor !== null && (
          <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - mostrado / 100)} />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {valor === null ? (
          <span className="text-xs text-gris">–</span>
        ) : (
          <>
            <span className="cifra text-[1.35em] font-bold leading-none" style={{ color, fontSize: tamaño * 0.28 }}>
              {mostrado}
            </span>
            <span className={`etiqueta !text-[0.5rem] !tracking-[0.15em] ${oscuro ? "text-plata" : "text-gris"}`}>puntos</span>
          </>
        )}
      </div>
    </div>
  );
}
