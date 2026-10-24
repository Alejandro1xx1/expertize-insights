"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Foto optimizada con next/image y carga diferida. Si el optimizador no puede
 * traerla (sitios con protección), intenta la URL original y luego la siguiente foto.
 */
export default function FotoProducto({
  imagenes,
  alt,
  sizes = "(max-width: 768px) 100vw, 33vw",
  className = "",
  prioridad = false,
}: {
  imagenes: string[];
  alt: string;
  sizes?: string;
  className?: string;
  prioridad?: boolean;
}) {
  const [indice, setIndice] = useState(0);
  const [directa, setDirecta] = useState(false);
  const [cargada, setCargada] = useState(false);
  const src = imagenes[indice];

  const fallo = () => {
    if (!directa) {
      setDirecta(true);
      return;
    }
    setDirecta(false);
    setCargada(false);
    setIndice((i) => i + 1);
  };

  return (
    <div className={`relative overflow-hidden bg-[#0b1017] ${className}`}>
      {src ? (
        <>
          {!cargada && <div className="escaneo absolute inset-0" aria-hidden />}
          {directa ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt}
              loading={prioridad ? "eager" : "lazy"}
              referrerPolicy="no-referrer"
              onLoad={() => setCargada(true)}
              onError={fallo}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${cargada ? "opacity-100" : "opacity-0"}`}
            />
          ) : (
            <Image
              src={src}
              alt={alt}
              fill
              sizes={sizes}
              priority={prioridad}
              onLoad={() => setCargada(true)}
              onError={fallo}
              className={`object-cover transition-opacity duration-500 ${cargada ? "opacity-100" : "opacity-0"}`}
            />
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-tenue">
          <svg viewBox="0 0 24 24" className="h-7 w-7 opacity-60" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="9" cy="10" r="1.6" />
            <path d="m21 16-5-5-8 8" />
          </svg>
          <span className="font-mono text-xs">Sin foto</span>
        </div>
      )}
      {imagenes.length > 1 && src && (
        <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[0.65rem] text-tenue">
          {indice + 1}/{imagenes.length}
        </div>
      )}
    </div>
  );
}
