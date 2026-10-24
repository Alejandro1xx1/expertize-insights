"use client";

import { useState } from "react";
import EscenaHero from "./EscenaHero";

/**
 * Foto real de portada. Orden: tu propia foto en public/hero.jpg → fotos de
 * Unsplash (licencia libre, uso comercial permitido) → escena animada en SVG.
 * La foto entra con un fundido y un zoom lento para dar movimiento.
 */
const FOTOS = [
  "/hero.jpg",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=2400&q=80",
  "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=2400&q=80",
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=2400&q=80",
];

export default function PortadaFoto() {
  const [indice, setIndice] = useState(0);
  const [cargada, setCargada] = useState(false);
  const src = FOTOS[indice];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-negro" aria-hidden>
      <EscenaHero />
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          fetchPriority="high"
          onLoad={() => setCargada(true)}
          onError={() => {
            setCargada(false);
            setIndice((i) => i + 1);
          }}
          className={`zoom-lento absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ${cargada ? "opacity-100" : "opacity-0"}`}
        />
      )}
      {cargada && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-negro via-negro/75 to-negro/10" />
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-negro/90 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-negro to-transparent" />
          {/* destellos de luz que cruzan la foto */}
          <div className="absolute inset-x-0 bottom-[30%] h-24">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="estela absolute h-px w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                style={{ top: `${20 + i * 30}%`, left: "60%", animationDelay: `${i * 0.4}s`, animationDuration: "2.4s" }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
