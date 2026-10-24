"use client";

import { useEffect, useRef } from "react";
import { dominio } from "@/lib/format";

const MAX = 12;

// Sitios que exigen inicio de sesión o bloquean la lectura automática.
const BLOQUEAN = /(^|\.)(mercadolibre\.com(\.\w+)?|tucarro\.com\.co|mercadolivre\.com\.br|facebook\.com|instagram\.com)$/i;

function sitioBloqueado(s: string): boolean {
  try {
    return BLOQUEAN.test(new URL(s.trim()).hostname);
  } catch {
    return false;
  }
}

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
            className={`entrar flex items-center gap-3 rounded-[10px] border bg-white px-3 py-2.5 transition-colors ${
              valido ? "border-tinta/80" : lleno ? "border-rojo/60" : "border-dashed border-[#c9c9c4] focus-within:border-tinta"
            }`}
          >
            <span
              className={`cifra flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                valido ? "bg-tinta text-white" : "bg-niebla text-gris"
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
                placeholder={i === 0 ? "Pega aquí el enlace del primer carro o del catálogo" : "Pega el siguiente carro…"}
                aria-label={`Enlace ${i + 1}`}
                className="w-full truncate bg-transparent py-0.5 text-[0.95rem] text-tinta outline-none placeholder:text-[#8b9097]"
              />
              {lleno && (
                <div className={`text-[0.72rem] ${valido ? (sitioBloqueado(enlace) ? "text-champan-oscuro" : "text-verde") : "text-rojo"}`}>
                  {!valido
                    ? "No parece un enlace válido (debe empezar por https://)"
                    : sitioBloqueado(enlace)
                      ? `⚠ ${dominio(enlace)} suele bloquear la lectura automática. Si falla, usa “Pegar texto manualmente”.`
                      : `✓ ${dominio(enlace)}`}
                </div>
              )}
            </div>
            {lleno && (
              <button
                type="button"
                onClick={() => quitar(i)}
                aria-label={`Quitar enlace ${i + 1}`}
                className="shrink-0 rounded-md px-2 py-1 text-gris hover:bg-niebla hover:text-tinta"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
      {cajones.length >= MAX && <p className="text-xs text-champan-oscuro">Máximo {MAX} enlaces por análisis.</p>}
    </div>
  );
}
