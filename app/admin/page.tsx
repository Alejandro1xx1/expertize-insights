"use client";

import Link from "next/link";
import { useState } from "react";
import { descargarJSON } from "@/components/EditorComparador";
import Marca from "@/components/Marca";
import PanelMercado from "@/components/PanelMercado";
import Terminal, { type LineaLog } from "@/components/Terminal";
import { CIUDADES_CACHE, INDUSTRIAS, type Mercado } from "@/lib/schemas";
import { leerSSE } from "@/lib/sse-client";
import { slug } from "@/lib/slug";

const COMBINACIONES = INDUSTRIAS.filter((i) => i.id !== "otro").flatMap((i) =>
  CIUDADES_CACHE.map((c) => ({ industria: i.id, label: i.label, ciudad: c, clave: `${i.id}-${slug(c)}` })),
);

type Estado = { estado: "pendiente" | "generando" | "listo" | "error"; lineas: LineaLog[]; mercado: Mercado | null; error: string | null };

function archivoCache(m: Mercado, clave: string) {
  const { origen: _origen, ...resto } = m;
  return { clave, ...resto };
}

export default function AdminPage() {
  const [estados, setEstados] = useState<Record<string, Estado>>({});
  const [abierto, setAbierto] = useState<string | null>(null);

  async function generar(c: (typeof COMBINACIONES)[number]) {
    const inicio = performance.now();
    let n = 0;
    setAbierto(c.clave);
    setEstados((s) => ({ ...s, [c.clave]: { estado: "generando", lineas: [], mercado: null, error: null } }));
    const actualizar = (f: (e: Estado) => Estado) => setEstados((s) => ({ ...s, [c.clave]: f(s[c.clave]) }));
    try {
      await leerSSE(`/api/market?industria=${c.industria}&ciudad=${encodeURIComponent(c.ciudad)}&forzar=1`, {}, (e) => {
        if (e.tipo === "log") actualizar((s) => ({ ...s, lineas: [...s.lineas, { id: n++, nivel: e.nivel, texto: e.texto, t: performance.now() - inicio }] }));
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
    const cola = [...COMBINACIONES];
    await Promise.all(
      [0, 1].map(async () => {
        while (cola.length) await generar(cola.shift()!);
      }),
    );
  }

  const listos = COMBINACIONES.filter((c) => estados[c.clave]?.mercado);
  const seleccionado = abierto ? estados[abierto] : null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-5 sm:px-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link href="/">
          <Marca />
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/comparador" className="rounded-lg px-3 py-2 text-sm text-tenue hover:text-white">
            Abrir comparador guardado
          </Link>
          <form action="/api/logout" method="post">
            <button className="rounded-lg px-3 py-2 text-sm text-tenue hover:text-white">Cerrar sesión</button>
          </form>
          <Link href="/" className="boton-secundario px-3.5 py-2 text-sm">
            ← App
          </Link>
        </div>
      </header>

      <div className="entrar mb-8">
        <div className="etiqueta">Administración</div>
        <h1 className="mt-1 text-3xl font-bold">Caché de investigación de mercado</h1>
        <p className="mt-2 max-w-3xl text-tenue">
          Genera la investigación de cada industria y ciudad, revísala y descárgala. Luego súbela al repositorio en{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-cian-suave">data/market-cache/</code> con el mismo nombre de archivo: la app la usará
          al instante en vez de investigar en vivo.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <button onClick={generarTodas} className="boton-procesar px-5 py-3">
          Generar todas (8)
        </button>
        <button
          disabled={!listos.length}
          onClick={() => listos.forEach((c, i) => setTimeout(() => descargarJSON(`${c.clave}.json`, archivoCache(estados[c.clave].mercado!, c.clave)), i * 300))}
          className="boton-secundario px-5 py-3 text-sm font-semibold disabled:opacity-40"
        >
          ⤓ Descargar todas las listas ({listos.length})
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {COMBINACIONES.map((c) => {
          const e = estados[c.clave];
          return (
            <div key={c.clave} className={`vidrio entrar space-y-3 p-4 ${abierto === c.clave ? "!border-cian" : ""}`}>
              <div>
                <div className="font-titulo font-semibold">{c.label}</div>
                <div className="text-sm text-tenue">{c.ciudad}</div>
                <div className="mt-1 font-mono text-[0.68rem] text-tenue">{c.clave}.json</div>
              </div>
              <div className="font-mono text-xs">
                {!e && <span className="text-tenue">Sin generar</span>}
                {e?.estado === "generando" && <span className="text-cian">Generando…</span>}
                {e?.estado === "listo" && <span className="text-ok">✓ Listo</span>}
                {e?.estado === "error" && <span className="text-peligro">✕ {e.error}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => generar(c)} disabled={e?.estado === "generando"} className="boton-secundario px-3 py-1.5 text-xs disabled:opacity-40">
                  {e ? "Regenerar" : "Generar"}
                </button>
                {e && (
                  <button onClick={() => setAbierto(c.clave)} className="rounded-lg px-3 py-1.5 text-xs text-tenue hover:text-white">
                    Ver
                  </button>
                )}
                {e?.mercado && (
                  <button
                    onClick={() => descargarJSON(`${c.clave}.json`, archivoCache(e.mercado!, c.clave))}
                    className="rounded-lg px-3 py-1.5 text-xs text-cian-suave hover:text-cian"
                  >
                    ⤓ JSON
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {seleccionado && abierto && (
        <div className="mt-8 space-y-4">
          <Terminal lineas={seleccionado.lineas} activo={seleccionado.estado === "generando"} compacto={seleccionado.estado !== "generando"} />
          {seleccionado.mercado && (
            <>
              <PanelMercado mercado={seleccionado.mercado} />
              <details className="vidrio p-4">
                <summary className="cursor-pointer font-mono text-sm text-cian-suave">Ver JSON ({abierto}.json)</summary>
                <pre className="scroll-fino mt-3 max-h-96 overflow-auto font-mono text-xs text-[#cfd9df]">
                  {JSON.stringify(archivoCache(seleccionado.mercado, abierto), null, 2)}
                </pre>
              </details>
            </>
          )}
        </div>
      )}
    </div>
  );
}
