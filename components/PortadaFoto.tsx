"use client";

import { useEffect, useState } from "react";
import EscenaHero from "./EscenaHero";

/**
 * Portada con un carro real en movimiento. Orden de prueba:
 * public/hero.mp4 (video corto en bucle) → public/hero.gif → public/hero.jpg →
 * fotos de Unsplash (licencia libre) → escena animada en SVG.
 * Las fotos fijas entran con fundido y zoom lento para dar movimiento.
 */
const FUENTES: { tipo: "video" | "imagen"; src: string }[] = [
  { tipo: "video", src: "/hero.mp4" },
  { tipo: "imagen", src: "/hero.gif" },
  { tipo: "imagen", src: "/hero.jpg" },
  { tipo: "imagen", src: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=2400&q=80" },
  { tipo: "imagen", src: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=2400&q=80" },
  { tipo: "imagen", src: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=2400&q=80" },
];

export default function PortadaFoto() {
  const [indice, setIndice] = useState(0);
  const [cargada, setCargada] = useState(false);
  // El medio se monta después de hidratar: así no se pierde el evento de error
  // (un 404 de hero.mp4 ocurre antes de que React escuche) y se pasa al siguiente.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const fuente = montado ? FUENTES[indice] : undefined;
  const siguiente = () => {
    setCargada(false);
    setIndice((i) => i + 1);
  };
  const clase = `absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ${cargada ? "opacity-100" : "opacity-0"}`;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-negro" aria-hidden>
      <EscenaHero />
      {fuente?.tipo === "video" && (
        <video
          key={fuente.src}
          src={fuente.src}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={() => setCargada(true)}
          onError={siguiente}
          className={clase}
        />
      )}
      {fuente?.tipo === "imagen" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={fuente.src}
          src={fuente.src}
          alt=""
          fetchPriority="high"
          onLoad={() => setCargada(true)}
          onError={siguiente}
          className={`${clase} ${fuente.src.endsWith(".gif") ? "" : "zoom-lento"}`}
        />
      )}
      {cargada && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-negro via-negro/75 to-negro/10" />
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-negro/90 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-negro to-transparent" />
          {fuente?.tipo === "imagen" && !fuente.src.endsWith(".gif") && (
            <div className="absolute inset-x-0 bottom-[30%] h-24">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="estela absolute h-px w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                  style={{ top: `${20 + i * 30}%`, left: "60%", animationDelay: `${i * 0.4}s`, animationDuration: "2.4s" }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
