"use client";

import Link from "next/link";
import { useState } from "react";
import { descargarJSON } from "@/components/EditorComparador";
import Marca from "@/components/Marca";
import PanelMercado from "@/components/PanelMercado";
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

export default function AdminPage() {
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
    actualizar((s) =>
      s.estado === "generando" ? { ...s, estado: s.mercado ? "listo" : "error", error: s.error ?? (s.mercado ? null : "Sin respuesta.") } : s,
    );
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
    <main className="min-h-dvh">
      <header className="bg-negro">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-8">
          <Link href="/">
            <Marca claro />
          </Link>
          <div className="flex items-center gap-1">
            <form action="/api/logout" method="post">
              <button className="rounded-md px-3 py-2 text-sm text-plata hover:text-white">Cerrar sesión</button>
            </form>
            <Link href="/" className="boton-borde px-4 py-2.5 text-[0.7rem] text-white hover:bg-white hover:text-tinta">
              ← App
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8">
        <div className="entrar mb-10">
          <div className="etiqueta text-rojo">Administración</div>
          <h1 className="titulo mt-2 text-3xl sm:text-4xl">Datos de mercado precargados</h1>
          <p className="mt-4 max-w-3xl leading-relaxed text-gris">
            Genera la investigación del mercado de carros de cada ciudad, revísala y descárgala. Luego súbela al repositorio en{" "}
            <code className="rounded bg-white px-1.5 py-0.5 text-tinta">data/market-cache/</code> con el mismo nombre de archivo: la app la usará al
            instante en vez de investigar en vivo.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          <button onClick={generarTodas} className="boton-principal px-7 py-4 text-xs">
            Generar todas ({CIUDADES.length})
          </button>
          <button
            disabled={!listos.length}
            onClick={() =>
              listos.forEach((c, i) => setTimeout(() => descargarJSON(`${c.clave}.json`, archivoCache(estados[c.clave].mercado!, c.clave)), i * 300))
            }
            className="boton-borde px-7 py-4 text-xs text-tinta hover:bg-tinta hover:text-white disabled:opacity-40"
          >
            Descargar las listas ({listos.length})
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CIUDADES.map((c) => {
            const e = estados[c.clave];
            return (
              <div key={c.clave} className={`tarjeta entrar space-y-4 p-5 ${abierto === c.clave ? "!border-tinta" : ""}`}>
                <div>
                  <div className="titulo text-lg">{c.ciudad}</div>
                  <div className="mt-1 text-xs text-gris">{c.clave}.json</div>
                </div>
                <div className="text-sm">
                  {!e && <span className="text-gris">Sin generar</span>}
                  {e?.estado === "generando" && <span className="cargando inline-block rounded bg-niebla px-2 py-0.5">Generando…</span>}
                  {e?.estado === "listo" && <span className="font-semibold text-verde">✓ Listo</span>}
                  {e?.estado === "error" && <span className="text-rojo">✕ {e.error}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => generar(c)}
                    disabled={e?.estado === "generando"}
                    className="boton-borde px-3 py-2 text-[0.65rem] text-tinta hover:bg-tinta hover:text-white disabled:opacity-40"
                  >
                    {e ? "Regenerar" : "Generar"}
                  </button>
                  {e && (
                    <button onClick={() => setAbierto(c.clave)} className="rounded-md px-3 py-2 text-xs text-gris hover:text-tinta">
                      Ver
                    </button>
                  )}
                  {e?.mercado && (
                    <button
                      onClick={() => descargarJSON(`${c.clave}.json`, archivoCache(e.mercado!, c.clave))}
                      className="rounded-md px-3 py-2 text-xs font-semibold text-rojo"
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
          <div className="mt-10 space-y-5">
            <div className="tarjeta p-5">
              <div className="etiqueta mb-3 !text-[0.6rem] text-gris">Proceso</div>
              <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
                {seleccionado.lineas.map((l, i) => (
                  <li key={i} className={l.nivel === "error" ? "text-rojo" : l.nivel === "ok" ? "text-verde" : "text-gris"}>
                    • {l.texto}
                  </li>
                ))}
              </ul>
            </div>
            {seleccionado.mercado && (
              <>
                <PanelMercado mercado={seleccionado.mercado} />
                <details className="tarjeta p-5">
                  <summary className="cursor-pointer text-sm font-semibold">Ver JSON ({abierto}.json)</summary>
                  <pre className="scroll-fino mt-3 max-h-96 overflow-auto text-xs text-gris">
                    {JSON.stringify(archivoCache(seleccionado.mercado, abierto), null, 2)}
                  </pre>
                </details>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
