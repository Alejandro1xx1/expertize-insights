"use client";

import { useEffect, useState } from "react";
import { useEnVista } from "@/lib/useEnVista";

/** Número que cuenta desde 0 hasta `valor` cuando aparece en pantalla. */
export default function Contador({
  valor,
  formato = (n) => Math.round(n).toLocaleString("es-CO"),
  duracion = 1200,
  className = "",
}: {
  valor: number;
  formato?: (n: number) => string;
  duracion?: number;
  className?: string;
}) {
  const [ref, visible] = useEnVista<HTMLSpanElement>();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    const inicio = performance.now();
    const paso = (t: number) => {
      const p = Math.min(1, (t - inicio) / duracion);
      setN(valor * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [visible, valor, duracion]);
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {formato(n)}
    </span>
  );
}
