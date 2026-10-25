"use client";

import { useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import PanelMercado from "@/components/PanelMercado";
import { descargarJSON } from "@/lib/descargar";
import { CIUDADES_CACHE, type LogNivel, type Mercado } from "@/lib/schemas";
import { leerSSE } from "@/lib/sse-client";
import { slug } from "@/lib/slug";

const CIUDADES = CIUDADES_CACHE.map((c) => ({ ciudad: c, clave: `carros-${slug(c)}` }));

type Estado = {
  estado: "generando" | "listo" | "error";
  lineas: { nivel: LogNivel; texto: string }[];
  mercado: Mercado | null;
  error: string | null;
};

function archivoCache(m: Mercado, clave: string) {
  const { origen: _origen, ...resto } = m;
  return { clave, ...resto };
}

/** Genera la investigación de mercado por ciudad para subirla a data/market-cache. */
export default function DatosMercado() {
  const [estados, setEstados] = useState<Record<string, Estado>>({});
  const [abierto, setAbierto] = useState<string | null>(null);

  async function generar(c: (typeof CIUDADES)[number]) {
    setAbierto(c.clave);
    setEstados((s) => ({ ...s, [c.clave]: { estado: "generando", lineas: [], mercado: null, error: null } }));
    const actualizar = (f: (e: Estado) => Estado) => setEstados((s) => ({ ...s, [c.clave]: f(s[c.clave]) }));
    try {
      await leerSSE(`/api/market?ciudad=${encodeURIComponent(c.ciudad)}&forzar=1`, {}, (e) => {
        if (e.tipo === "log") actualizar((s) => ({ ...s, lineas: [...s.lineas, { nivel: e.nivel, texto: e.texto }] }));
        if (e.tipo === "mercado") actualizar((s) => ({ ...s, mercado: e.mercado, estado: "listo" }));
        if (e.tipo === "error") actualizar((s) => ({ ...s, estado: "error", error: e.mensaje }));
      });
    } catch {
      actualizar((s) => ({ ...s, estado: "error", error: "Se perdió la conexión." }));
    }
    actualizar((s) => (s.estado === "generando" ? { ...s, estado: s.mercado ? "listo" : "error", error: s.error ?? (s.mercado ? null : "Sin respuesta.") } : s));
  }

  async function generarTodas() {
    // De a dos en paralelo para no saturar el límite de la API.
    const cola = [...CIUDADES];
    await Promise.all(
      [0, 1].map(async () => {
        while (cola.length) await generar(cola.shift()!);
      }),
    );
  }

  const listos = CIUDADES.filter((c) => estados[c.clave]?.mercado);
  const seleccionado = abierto ? estados[abierto] : null;

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm leading-relaxed text-gris">
        Genera la investigación del mercado de carros de cada ciudad, revísala y descárgala. Súbela al repositorio en{" "}
        <code className="rounded bg-hueso px-1.5 py-0.5 text-tinta">data/market-cache/</code> con el mismo nombre de archivo: la app la usará al instante en vez de
        investigar en vivo.
      </p>
      <div className="flex flex-wrap gap-3">
        <button onClick={generarTodas} className="btn btn-oscuro">
          <RefreshCw className="h-4 w-4" strokeWidth={1.5} /> Generar todas ({CIUDADES.length})
        </button>
        <button
          disabled={!listos.length}
          onClick={() => listos.forEach((c, i) => setTimeout(() => descargarJSON(`${c.clave}.json`, archivoCache(estados[c.clave].mercado!, c.clave)), i * 300))}
          className="btn btn-secundario"
        >
          <Download className="h-4 w-4" strokeWidth={1.5} /> Descargar listas ({listos.length})
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CIUDADES.map((c) => {
          const e = estados[c.clave];
          return (
            <div key={c.clave} className={`tarjeta space-y-4 p-5 transition-colors ${abierto === c.clave ? "!border-tinta" : ""}`}>
              <div>
                <div className="font-semibold">{c.ciudad}</div>
                <div className="mt-0.5 text-xs text-gris">{c.clave}.json</div>
              </div>
              <div className="text-sm">
                {!e && <span className="text-gris">Sin generar</span>}
                {e?.estado === "generando" && <span className="text-gris">Generando…</span>}
                {e?.estado === "listo" && <span className="font-medium text-verde">Listo</span>}
                {e?.estado === "error" && <span className="text-rojo">{e.error}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => generar(c)} disabled={e?.estado === "generando"} className="btn btn-secundario btn-sm">
                  {e ? "Regenerar" : "Generar"}
                </button>
                {e && (
                  <button onClick={() => setAbierto(c.clave)} className="btn btn-fantasma btn-sm">
                    Ver
                  </button>
                )}
                {e?.mercado && (
                  <button onClick={() => descargarJSON(`${c.clave}.json`, archivoCache(e.mercado!, c.clave))} className="btn btn-fantasma btn-sm">
                    <Download className="h-3.5 w-3.5" strokeWidth={1.5} /> JSON
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {seleccionado && abierto && (
        <div className="space-y-5">
          <div className="tarjeta p-5">
            <div className="etiqueta mb-3 text-gris">Proceso</div>
            <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
              {seleccionado.lineas.map((l, i) => (
                <li key={i} className={l.nivel === "error" ? "text-rojo" : l.nivel === "ok" ? "text-verde" : "text-gris"}>
                  {l.texto}
                </li>
              ))}
            </ul>
          </div>
          {seleccionado.mercado && <PanelMercado mercado={seleccionado.mercado} />}
        </div>
      )}
    </div>
  );
}
