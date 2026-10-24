"use client";

import { useEffect, useRef } from "react";
import { dominio } from "@/lib/format";

const MAX = 12;

function esUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Siempre deja un cajón vacío al final para pegar el siguiente enlace. */
function normalizar(lista: string[]): string[] {
  const llenos = lista.filter((l) => l.trim());
  return llenos.length < MAX ? [...llenos, ""] : llenos.slice(0, MAX);
}

/** Un cajón por enlace: al pegar uno, se agrega solo un cajón nuevo debajo. */
export default function CajonesEnlaces({ valor, onChange }: { valor: string[]; onChange: (v: string[]) => void }) {
  const cajones = valor.length ? valor : [""];
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const enfocar = useRef<number | null>(null);

  useEffect(() => {
    if (enfocar.current !== null) {
      refs.current[enfocar.current]?.focus();
      enfocar.current = null;
    }
  });

  const cambiar = (i: number, texto: string) => {
    const nueva = [...cajones];
    nueva[i] = texto;
    // Mantiene el cajón mientras se escribe; solo agrega uno vacío al final si hace falta.
    if (i === nueva.length - 1 && texto.trim() && nueva.length < MAX) nueva.push("");
    onChange(nueva);
  };

  const pegar = (i: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const lineas = e.clipboardData
      .getData("text")
      .split(/[\n\r\s]+/)
      .map((l) => l.trim())
      .filter(Boolean);
    // Si el cajón ya tiene texto y se pega una sola cosa, se deja el pegado normal (para corregir un enlace).
    if (!lineas.length || (cajones[i].trim() && lineas.length === 1)) return;
    e.preventDefault();
    const nueva = [...cajones.slice(0, i), ...lineas, ...cajones.slice(i + 1)];
    const resultado = normalizar(nueva);
    enfocar.current = Math.min(i + lineas.length, resultado.length - 1);
    onChange(resultado);
  };

  const quitar = (i: number) => {
    onChange(normalizar(cajones.filter((_, j) => j !== i)));
  };

  return (
    <div className="space-y-2.5">
      {cajones.map((enlace, i) => {
        const lleno = enlace.trim().length > 0;
        const valido = lleno && esUrl(enlace);
        return (
          <div
            key={i}
            className={`entrar flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${
              valido
                ? "border-cian/45 bg-cian/[.06] shadow-[0_0_18px_-8px_rgba(0,229,255,.7)]"
                : lleno
                  ? "border-peligro/50 bg-peligro/[.05]"
                  : "border-dashed border-white/15 bg-black/30"
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                valido ? "bg-cian text-[#031015]" : "bg-white/5 text-tenue"
              }`}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <input
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="url"
                inputMode="url"
                value={enlace}
                onChange={(e) => cambiar(i, e.target.value)}
                onPaste={(e) => pegar(i, e)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    refs.current[i + 1]?.focus();
                  }
                }}
                placeholder={i === 0 ? "Pega aquí el enlace del primer producto o catálogo" : "Pega el siguiente enlace…"}
                aria-label={`Enlace ${i + 1}`}
                className="w-full bg-transparent py-1 font-mono text-sm text-texto outline-none placeholder:font-sans placeholder:text-[#6f7e8a]"
              />
              {lleno && (
                <div className={`font-mono text-[0.68rem] ${valido ? "text-cian-suave" : "text-peligro"}`}>
                  {valido ? `✓ ${dominio(enlace)}` : "No parece un enlace válido (debe empezar por https://)"}
                </div>
              )}
            </div>
            {lleno && (
              <button
                type="button"
                onClick={() => quitar(i)}
                aria-label={`Quitar enlace ${i + 1}`}
                className="shrink-0 rounded-lg px-2 py-1 text-tenue hover:bg-white/5 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
      {cajones.length >= MAX && <p className="font-mono text-xs text-oro-claro">Máximo {MAX} enlaces por análisis.</p>}
    </div>
  );
}
