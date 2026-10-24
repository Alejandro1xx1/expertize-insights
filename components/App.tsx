"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import type { ComparadorConfig, EventoStream, InsightProducto, Insights, Mercado, Producto } from "@/lib/schemas";
import { industriaLabel } from "@/lib/schemas";
import { leerSSE } from "@/lib/sse-client";
import EditorComparador from "./EditorComparador";
import FormularioEntrada, { ENTRADA_VACIA, type DatosEntrada } from "./FormularioEntrada";
import Marca from "./Marca";
import PanelMercado from "./PanelMercado";
import TablaComparativa from "./TablaComparativa";
import TarjetaProducto from "./TarjetaProducto";
import Terminal, { type LineaLog } from "./Terminal";

type Estado = "entrada" | "procesando" | "listo";

function Seccion({ titulo, etiqueta, children, extra }: { titulo: string; etiqueta: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <section className="entrar space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="etiqueta">{etiqueta}</div>
          <h2 className="mt-1 text-2xl font-bold">{titulo}</h2>
        </div>
        {extra}
      </div>
      {children}
    </section>
  );
}

function Esqueleto({ alto = "h-24", texto }: { alto?: string; texto: string }) {
  return (
    <div className={`vidrio escaneo flex ${alto} items-center justify-center`}>
      <span className="font-mono text-sm text-tenue">{texto}</span>
    </div>
  );
}

export default function App() {
  const [entrada, setEntrada] = useState<DatosEntrada>(ENTRADA_VACIA);
  const [estado, setEstado] = useState<Estado>("entrada");
  const [lineas, setLineas] = useState<LineaLog[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosListos, setProductosListos] = useState(false);
  const [mercado, setMercado] = useState<Mercado | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [comparador, setComparador] = useState<ComparadorConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [segundos, setSegundos] = useState<number | null>(null);
  const [verCliente, setVerCliente] = useState(false);
  const [verRegistro, setVerRegistro] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const inicioRef = useRef(0);
  const idRef = useRef(0);

  const insightsPorId = useMemo(
    () => new Map<string, InsightProducto>((insights?.productos ?? []).map((p) => [p.id, p])),
    [insights],
  );
  const mejorId = useMemo(() => {
    if (!insights?.productos.length) return null;
    const top = [...insights.productos].sort((a, b) => b.puntuacion - a.puntuacion)[0];
    return top.puntuacion >= 60 ? top.id : null;
  }, [insights]);
  const productosOrdenados = useMemo(() => {
    if (!insights) return productos;
    return [...productos].sort((a, b) => (insightsPorId.get(b.id)?.puntuacion ?? 0) - (insightsPorId.get(a.id)?.puntuacion ?? 0));
  }, [productos, insights, insightsPorId]);

  const agregarLinea = useCallback((nivel: LineaLog["nivel"], texto: string) => {
    setLineas((l) => [...l, { id: idRef.current++, nivel, texto, t: performance.now() - inicioRef.current }]);
  }, []);

  const onEvento = useCallback(
    (e: EventoStream) => {
      switch (e.tipo) {
        case "log":
          agregarLinea(e.nivel, e.texto);
          break;
        case "producto":
          setProductos((p) => [...p, e.producto]);
          break;
        case "productos_listos":
          setProductosListos(true);
          break;
        case "mercado":
          setMercado(e.mercado);
          break;
        case "insights":
          setInsights(e.insights);
          break;
        case "comparador":
          setComparador(e.config);
          break;
        case "error":
          setError(e.mensaje);
          agregarLinea("error", e.mensaje);
          break;
        case "fin":
          setSegundos(e.segundos);
          break;
      }
    },
    [agregarLinea],
  );

  async function procesar() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    inicioRef.current = performance.now();
    setLineas([]);
    setProductos([]);
    setProductosListos(false);
    setMercado(null);
    setInsights(null);
    setComparador(null);
    setError(null);
    setSegundos(null);
    setVerRegistro(true);
    setEstado("procesando");
    window.scrollTo({ top: 0, behavior: "smooth" });
    agregarLinea("info", "Conectando con el motor de análisis…");

    try {
      await leerSSE(
        "/api/process",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: ctrl.signal,
          body: JSON.stringify({
            enlaces: entrada.enlaces.split("\n").map((l) => l.trim()).filter(Boolean),
            mensaje: entrada.mensaje,
            industria: entrada.industria,
            ciudad: entrada.ciudad,
            textoManual: entrada.textoManual.trim() || null,
            archivo: entrada.archivo ? { nombre: entrada.archivo.nombre, csv: entrada.archivo.csv } : null,
          }),
        },
        onEvento,
      );
    } catch (err) {
      if (!ctrl.signal.aborted) {
        const msg = "Se perdió la conexión con el servidor. Revisa tu internet e intenta de nuevo.";
        setError(msg);
        agregarLinea("error", msg);
      }
    } finally {
      if (abortRef.current === ctrl) {
        setEstado("listo");
        setVerRegistro(false);
      }
    }
  }

  function nuevo() {
    abortRef.current?.abort();
    setEstado("entrada");
    setVerCliente(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const procesando = estado === "procesando";
  const esperandoInsights = procesando && !insights;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-5 sm:px-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <button onClick={nuevo} aria-label="Inicio">
          <Marca />
        </button>
        <nav className="flex items-center gap-2">
          {estado !== "entrada" && (
            <button onClick={nuevo} className="boton-secundario px-3.5 py-2 text-sm">
              ＋ Nuevo análisis
            </button>
          )}
          <Link href="/admin" className="rounded-lg px-3 py-2 text-sm text-tenue hover:text-white">
            Admin
          </Link>
        </nav>
      </header>

      {estado === "entrada" && (
        <div className="space-y-8">
          <div className="entrar mx-auto max-w-3xl text-center">
            <div className="etiqueta mb-3">Análisis comercial en tiempo real</div>
            <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
              Pega los enlaces. <span className="text-cian [text-shadow:0_0_30px_rgba(0,229,255,.45)]">Obtén insights en vivo.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-tenue sm:text-lg">
              Leemos cada producto, investigamos el mercado de tu ciudad y te mostramos qué conviene, por qué y a quién venderlo.
            </p>
          </div>
          <FormularioEntrada valor={entrada} onChange={setEntrada} onProcesar={procesar} />
        </div>
      )}

      {estado !== "entrada" && (
        <div className="space-y-10">
          {/* Barra de contexto */}
          <div className="entrar flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-cian/40 bg-cian/10 px-3 py-1 font-medium text-cian-suave">{industriaLabel(entrada.industria)}</span>
            {entrada.ciudad && <span className="rounded-full border border-white/10 px-3 py-1 text-[#dfe7ec]">{entrada.ciudad}</span>}
            {entrada.mensaje && <span className="min-w-0 max-w-full truncate text-tenue sm:max-w-xl">“{entrada.mensaje}”</span>}
            <div className="ml-auto flex items-center gap-2">
              {segundos !== null && <span className="font-mono text-xs text-ok">✓ {segundos} s</span>}
              <button
                onClick={() => setVerCliente(true)}
                disabled={!comparador}
                className="boton-procesar px-4 py-2 text-sm disabled:opacity-40"
                title={comparador ? "" : "Disponible cuando terminen los insights"}
              >
                {comparador ? "Así lo vería tu cliente →" : "Preparando vista del cliente…"}
              </button>
            </div>
          </div>

          {/* Registro en vivo */}
          {procesando || verRegistro ? (
            <div className="space-y-2">
              <Terminal lineas={lineas} activo={procesando} compacto={!procesando} />
              {!procesando && (
                <button onClick={() => setVerRegistro(false)} className="font-mono text-xs text-tenue hover:text-white">
                  Ocultar registro ▲
                </button>
              )}
            </div>
          ) : (
            <button onClick={() => setVerRegistro(true)} className="font-mono text-xs text-tenue hover:text-white">
              ▸ Ver registro del proceso ({lineas.length} pasos)
            </button>
          )}

          {error && !productos.length && (
            <div className="vidrio entrar border-peligro/40 p-5">
              <div className="font-semibold text-peligro">No se pudo completar el análisis</div>
              <p className="mt-1 text-sm text-[#dfe7ec]">{error}</p>
              <button onClick={nuevo} className="boton-secundario mt-4 px-4 py-2 text-sm">
                Volver y usar el Plan B
              </button>
            </div>
          )}

          {/* Resumen ejecutivo */}
          {(insights || (productos.length > 0 && procesando)) && (
            <Seccion etiqueta="Resumen ejecutivo" titulo="Lo que necesitas saber">
              {insights ? (
                <div className="vidrio entrar grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
                  {insights.resumen.map((r, i) => (
                    <div key={i} className="entrar flex gap-3" style={{ animationDelay: `${i * 120}ms` }}>
                      <span className="font-titulo text-3xl font-bold text-cian/70">{i + 1}</span>
                      <p className="text-[0.98rem] leading-relaxed">{r}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <Esqueleto texto="Generando resumen ejecutivo…" />
              )}
            </Seccion>
          )}

          {/* Productos */}
          {(productos.length > 0 || procesando) && (
            <Seccion
              etiqueta="Productos"
              titulo={productos.length ? `${productos.length} producto(s) analizados` : "Leyendo productos…"}
              extra={!productosListos && procesando ? <span className="font-mono text-xs text-cian">recibiendo en vivo…</span> : null}
            >
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {productosOrdenados.map((p, i) => (
                  <TarjetaProducto
                    key={p.id}
                    producto={p}
                    insight={insightsPorId.get(p.id)}
                    esperandoInsights={esperandoInsights}
                    posicion={i}
                    destacado={p.id === mejorId}
                  />
                ))}
                {!productosListos && procesando && <Esqueleto alto="h-80" texto="Leyendo enlace…" />}
              </div>
            </Seccion>
          )}

          {/* Tabla comparativa */}
          {productos.length > 1 && (
            <Seccion etiqueta="Comparativa" titulo="Lado a lado">
              <TablaComparativa productos={productosOrdenados} insights={insightsPorId} esperandoInsights={esperandoInsights} />
            </Seccion>
          )}

          {/* Preguntas del cliente */}
          {insights && insights.preguntasCliente.length > 0 && (
            <Seccion etiqueta="Prepárate" titulo="Preguntas que se hace tu cliente antes de comprar">
              <div className="grid gap-3 md:grid-cols-2">
                {insights.preguntasCliente.map((q, i) => (
                  <div key={i} className="vidrio entrar p-4" style={{ animationDelay: `${i * 70}ms` }}>
                    <div className="font-semibold">“{q.pregunta}”</div>
                    <p className="mt-1 text-sm text-tenue">{q.porQue}</p>
                  </div>
                ))}
              </div>
            </Seccion>
          )}

          {/* Mercado */}
          {(mercado || (procesando && productos.length > 0)) && (
            <Seccion etiqueta="Investigación de mercado" titulo="Cómo está el mercado">
              {mercado ? <PanelMercado mercado={mercado} /> : <Esqueleto alto="h-40" texto="Investigando el mercado…" />}
            </Seccion>
          )}
        </div>
      )}

      {verCliente && comparador && <EditorComparador config={comparador} onCerrar={() => setVerCliente(false)} />}
    </div>
  );
}
