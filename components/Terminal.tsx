"use client";

import { useEffect, useRef } from "react";
import type { LogNivel } from "@/lib/schemas";

export type LineaLog = { id: number; nivel: LogNivel; texto: string; t: number };

const COLOR: Record<LogNivel, string> = {
  info: "text-[#cfe3ea]",
  ok: "text-ok",
  warn: "text-oro-claro",
  error: "text-peligro",
  dato: "text-cian",
};

const PREFIJO: Record<LogNivel, string> = { info: "›", ok: "✓", warn: "!", error: "✕", dato: "◆" };

export default function Terminal({
  lineas,
  activo,
  compacto = false,
}: {
  lineas: LineaLog[];
  activo: boolean;
  compacto?: boolean;
}) {
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    caja.current?.scrollTo({ top: caja.current.scrollHeight, behavior: "smooth" });
  }, [lineas.length]);

  return (
    <div className="vidrio overflow-hidden">
      <div className="flex items-center justify-between border-b border-borde px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-peligro/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-oro/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-ok/80" />
          <span className="etiqueta ml-2">registro en vivo</span>
        </div>
        {activo && (
          <span className="flex items-center gap-2 font-mono text-xs text-cian">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cian shadow-[0_0_8px_#00E5FF]" />
            procesando
          </span>
        )}
      </div>
      <div
        ref={caja}
        className={`terminal scroll-fino overflow-y-auto px-4 py-3 ${compacto ? "max-h-44" : "max-h-[46vh] min-h-56"}`}
        role="log"
        aria-live="polite"
      >
        {lineas.map((l) => (
          <div key={l.id} className={`linea-log flex gap-3 ${COLOR[l.nivel]}`}>
            <span className="shrink-0 text-tenue/60 tabular-nums">{(l.t / 1000).toFixed(1).padStart(5, " ")}s</span>
            <span className="shrink-0 opacity-80">{PREFIJO[l.nivel]}</span>
            <span className="break-words">{l.texto}</span>
          </div>
        ))}
        <div className="flex gap-3 pt-0.5">
          <span className="text-tenue/60">{"     "}</span>
          <span className="cursor" />
        </div>
      </div>
    </div>
  );
}
