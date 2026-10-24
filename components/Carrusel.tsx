"use client";

import { useRef, useState } from "react";
import FotoProducto from "./FotoProducto";

/**
 * Carrusel de fotos: flechas, puntos, miniaturas, teclado (← →) y deslizar con el dedo.
 */
export default function Carrusel({ imagenes, alt, className = "" }: { imagenes: string[]; alt: string; className?: string }) {
  const [i, setI] = useState(0);
  const inicioX = useRef<number | null>(null);
  const total = imagenes.length;
  const ir = (d: number) => total > 1 && setI((x) => (x + d + total) % total);

  return (
    <div
      className={`group relative select-none outline-none ${className}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") ir(1);
        if (e.key === "ArrowLeft") ir(-1);
      }}
      onPointerDown={(e) => (inicioX.current = e.clientX)}
      onPointerUp={(e) => {
        if (inicioX.current === null) return;
        const dx = e.clientX - inicioX.current;
        if (Math.abs(dx) > 40) ir(dx < 0 ? 1 : -1);
        inicioX.current = null;
      }}
      aria-roledescription="carrusel"
      aria-label={`Fotos de ${alt}`}
    >
      <div className="relative overflow-hidden rounded-[12px]">
        <FotoProducto
          key={total ? imagenes[i] : "sin-foto"}
          imagenes={total ? [imagenes[i]] : []}
          alt={`${alt} · foto ${i + 1}`}
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="aspect-[16/10] w-full"
          prioridad
        />
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => ir(-1)}
              aria-label="Foto anterior"
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg text-tinta shadow-lg transition-opacity hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => ir(1)}
              aria-label="Foto siguiente"
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg text-tinta shadow-lg transition-opacity hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"
            >
              ›
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/45 px-2.5 py-1.5">
              {imagenes.map((_, k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setI(k)}
                  aria-label={`Ir a la foto ${k + 1}`}
                  className={`h-1.5 rounded-full transition-all ${k === i ? "w-5 bg-white" : "w-1.5 bg-white/55"}`}
                />
              ))}
            </div>
            <div className="cifra absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white">
              📷 {i + 1}/{total}
            </div>
          </>
        )}
      </div>
      {total > 1 && (
        <div className="scroll-fino mt-3 flex gap-2 overflow-x-auto pb-1">
          {imagenes.map((src, k) => (
            <button
              key={src}
              type="button"
              onClick={() => setI(k)}
              className={`h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-opacity sm:h-16 sm:w-24 ${k === i ? "border-tinta" : "border-transparent opacity-60 hover:opacity-100"}`}
              aria-label={`Ver foto ${k + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
