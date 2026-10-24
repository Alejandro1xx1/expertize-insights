"use client";

import { useEffect, useRef } from "react";

/**
 * Líneas de datos muy discretas: pocos puntos que suben lentamente con estela.
 * Se pausa con la pestaña oculta y se desactiva con "reducir movimiento".
 */
export default function FondoAnimado() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const total = w < 640 ? 14 : 28;
    const columnas = Math.floor(w / 44);
    const puntos = Array.from({ length: total }, () => ({
      x: (Math.floor(Math.random() * columnas) + 0.5) * 44,
      y: Math.random() * h,
      v: 0.15 + Math.random() * 0.35,
      largo: 30 + Math.random() * 70,
      a: 0.12 + Math.random() * 0.25,
    }));

    let raf = 0;
    let ultimo = 0;
    const dibujar = (t: number) => {
      raf = requestAnimationFrame(dibujar);
      if (t - ultimo < 33) return; // ~30 fps es suficiente
      ultimo = t;
      ctx.clearRect(0, 0, w, h);
      for (const p of puntos) {
        p.y -= p.v;
        if (p.y + p.largo < 0) {
          p.y = h + Math.random() * 100;
          p.x = (Math.floor(Math.random() * columnas) + 0.5) * 44;
        }
        const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.largo);
        g.addColorStop(0, `rgba(0,229,255,${p.a})`);
        g.addColorStop(1, "rgba(0,229,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y + p.largo);
        ctx.stroke();
      }
    };
    const visibilidad = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(dibujar);
    };
    document.addEventListener("visibilitychange", visibilidad);
    raf = requestAnimationFrame(dibujar);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibilidad);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0" aria-hidden />;
}
