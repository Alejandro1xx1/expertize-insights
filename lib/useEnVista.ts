"use client";

import { useEffect, useRef, useState } from "react";

/** Devuelve `true` la primera vez que el elemento entra en pantalla (para animar gráficas al hacer scroll). */
export function useEnVista<T extends Element>(margen = "0px 0px -10% 0px") {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: margen },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [margen, visible]);
  return [ref, visible] as const;
}
