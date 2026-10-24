"use client";

import Image from "next/image";
import { useState } from "react";
import Carro from "./Carro";

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
    <div className={`relative overflow-hidden bg-[#e9e9e6] ${className}`}>
      {src ? (
        <>
          {!cargada && <div className="cargando absolute inset-0" aria-hidden />}
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
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-gris">
          <Carro acabado="grafito" className="w-1/2 max-w-40 opacity-25" />
          <span className="text-xs">Sin foto</span>
        </div>
      )}
      {imagenes.length > 1 && src && (
        <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[0.65rem] text-white">
          {indice + 1}/{imagenes.length}
        </div>
      )}
    </div>
  );
}
