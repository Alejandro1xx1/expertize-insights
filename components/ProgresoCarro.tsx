"use client";

import { useEffect, useRef, useState } from "react";
import Carro from "./Carro";

/**
 * Pista de 0 a 100 % con un carro que la recorre mientras se procesa.
 * Avanza suave hacia el progreso real del servidor y nunca se queda quieto;
 * al llegar al 100 % avisa con `onCompletado` para revelar los resultados.
 */
export default function ProgresoCarro({
  objetivo,
  texto,
  terminado,
  onCompletado,
}: {
  objetivo: number;
  texto: string;
  terminado: boolean;
  onCompletado: () => void;
}) {
  const [valor, setValor] = useState(0);
  const valorRef = useRef(0);
  const objetivoRef = useRef(objetivo);
  const terminadoRef = useRef(terminado);
  const avisado = useRef(false);
  const onCompletadoRef = useRef(onCompletado);

  useEffect(() => {
    objetivoRef.current = objetivo;
    terminadoRef.current = terminado;
    onCompletadoRef.current = onCompletado;
  });

  useEffect(() => {
    let raf = 0;
    let ultimo = performance.now();
    const paso = (t: number) => {
      const dt = Math.min(0.1, (t - ultimo) / 1000);
      ultimo = t;
      const meta = terminadoRef.current ? 1 : objetivoRef.current;
      let v = valorRef.current;
      if (v < meta) {
        // Alcanza el progreso real con rapidez (más rápido al final).
        v += Math.max((meta - v) * (terminadoRef.current ? 3.2 : 1.6) * dt, 0.02 * dt);
        v = Math.min(v, meta);
      } else if (!terminadoRef.current) {
        // Mientras espera, sigue rodando despacio sin pasarse del siguiente tramo.
        const tope = Math.min(0.96, meta + 0.12);
        if (v < tope) v += 0.007 * dt * (1 - (v - meta) / 0.12);
      }
      valorRef.current = v;
      setValor(v);
      if (terminadoRef.current && v >= 0.999 && !avisado.current) {
        avisado.current = true;
        setTimeout(() => onCompletadoRef.current(), 650);
      }
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pct = Math.round(valor * 100);
  const llego = pct >= 100;

  return (
    <div className="w-full">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="etiqueta text-plata">{llego ? "Listo" : "Analizando"}</div>
          <p className="mt-2 truncate text-base text-white/85 sm:text-lg" aria-live="polite">
            {llego ? "¡Llegamos! Preparando tus resultados…" : texto}
          </p>
        </div>
        <div className="cifra shrink-0 text-5xl font-bold text-white sm:text-7xl">
          {pct}
          <span className="text-2xl text-plata sm:text-3xl">%</span>
        </div>
      </div>

      {/* pista */}
      <div className="relative pt-16 sm:pt-24">
        <div
          className="absolute bottom-[12px] left-[calc(var(--v)*(100%-9rem))] w-36 sm:left-[calc(var(--v)*(100%-15rem))] sm:w-60"
          style={{ ["--v" as string]: valor }}
        >
          <Carro acabado="rojo" enMovimiento={!llego} luces className="w-full" />
        </div>

        <div className="relative h-[14px] overflow-hidden rounded-full bg-white/10">
          <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-rojo-oscuro to-rojo" style={{ width: `${valor * 100}%` }} />
          <div className="carril absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 opacity-30" />
        </div>

        {/* bandera de llegada */}
        <div className="absolute -top-1 right-0 flex flex-col items-end sm:top-6" aria-hidden>
          <svg viewBox="0 0 24 30" className="h-9 w-7">
            <line x1="2" y1="2" x2="2" y2="30" stroke="#a7acb3" strokeWidth="2" />
            {[0, 1, 2, 3].map((f) =>
              [0, 1, 2, 3, 4].map((c) => (
                <rect key={`${f}-${c}`} x={3 + c * 4} y={2 + f * 3.5} width="4" height="3.5" fill={(f + c) % 2 ? "#fff" : "#16171a"} />
              )),
            )}
          </svg>
        </div>

        <div className="mt-3 flex justify-between">
          {[0, 25, 50, 75, 100].map((m) => (
            <span key={m} className={`cifra text-xs ${pct >= m ? "text-white" : "text-white/35"}`}>
              {m}%
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
