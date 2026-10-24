"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { formatoMoneda } from "@/lib/format";
import type { ComparadorConfig, EventoStream, InsightProducto, Insights, LogNivel, Mercado, Producto } from "@/lib/schemas";
import { leerSSE } from "@/lib/sse-client";
import AnilloPuntuacion from "./AnilloPuntuacion";
import EditorComparador from "./EditorComparador";
import FormularioEntrada, { ENTRADA_VACIA, type DatosEntrada } from "./FormularioEntrada";
import FotoProducto from "./FotoProducto";
import BarrasMercado from "./graficas/BarrasMercado";
import Contador from "./graficas/Contador";
import MapaValor from "./graficas/MapaValor";
import Ranking from "./graficas/Ranking";
import InsigniaMercado from "./InsigniaMercado";
import Marca from "./Marca";
import PanelMercado from "./PanelMercado";
import PortadaFoto from "./PortadaFoto";
import ProgresoCarro from "./ProgresoCarro";
import TablaComparativa from "./TablaComparativa";
import TarjetaCarro, { medalla, specsClave } from "./TarjetaCarro";
import VistaPrevia from "./VistaPrevia";
import Icono from "./Iconos";

type Estado = "entrada" | "procesando" | "resultados" | "error";
type Linea = { nivel: LogNivel; texto: string };

function Seccion({ titulo, etiqueta, children, id, ayuda }: { titulo: string; etiqueta: string; children: React.ReactNode; id?: string; ayuda?: string }) {
  return (
    <section id={id} className="entrar scroll-mt-6 space-y-6">
      <div>
        <div className="etiqueta text-rojo">{etiqueta}</div>
        <h2 className="titulo mt-2 text-2xl sm:text-3xl">{titulo}</h2>
        {ayuda && <p className="mt-2 max-w-2xl text-sm text-gris">{ayuda}</p>}
      </div>
      {children}
    </section>
  );
}

function Encabezado({ claro, onInicio }: { claro: boolean; onInicio: () => void }) {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-6 sm:px-8">
      <button onClick={onInicio} aria-label="Inicio">
        <Marca claro={claro} />
      </button>
      <nav className="flex items-center gap-1">
        <Link href="/comparador" className={`hidden rounded-md px-3 py-2 text-sm sm:block ${claro ? "text-plata hover:text-white" : "text-gris hover:text-tinta"}`}>
          Comparadores guardados
        </Link>
        <Link href="/admin" className={`rounded-md px-3 py-2 text-sm ${claro ? "text-plata hover:text-white" : "text-gris hover:text-tinta"}`}>
          Admin
        </Link>
      </nav>
    </header>
  );
}

export default function App() {
  const [entrada, setEntrada] = useState<DatosEntrada>(ENTRADA_VACIA);
  const [estado, setEstado] = useState<Estado>("entrada");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [mercado, setMercado] = useState<Mercado | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [comparador, setComparador] = useState<ComparadorConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [segundos, setSegundos] = useState<number | null>(null);
  const [avance, setAvance] = useState({ progreso: 0, texto: "Arrancando motores…" });
  const [terminado, setTerminado] = useState(false);
  const [verCliente, setVerCliente] = useState(false);
  const [fichaId, setFichaId] = useState<string | null>(null);
  const [pedidoComparar, setPedidoComparar] = useState<{ id: string; n: number } | null>(null);
  const [pestaña, setPestaña] = useState<"graficas" | "comparar" | "mercado" | "preguntas">("graficas");
  const abortRef = useRef<AbortController | null>(null);
  const productosRef = useRef(0);

  const insightsPorId = useMemo(
    () => new Map<string, InsightProducto>((insights?.productos ?? []).map((p) => [p.id, p])),
    [insights],
  );
  const productosOrdenados = useMemo(() => {
    if (!insights) return productos;
    return [...productos].sort((a, b) => (insightsPorId.get(b.id)?.puntuacion ?? 0) - (insightsPorId.get(a.id)?.puntuacion ?? 0));
  }, [productos, insights, insightsPorId]);
  const recomendado = productosOrdenados[0];
  const insightRecomendado = recomendado ? insightsPorId.get(recomendado.id) : undefined;
  const avisos = lineas.filter((l) => l.nivel === "warn" || l.nivel === "error");
  const precios = productos.map((p) => p.precio).filter((v): v is number => v !== null);
  const monedaPrincipal = productos.find((p) => p.moneda)?.moneda ?? "COP";
  const oportunidades = (insights?.productos ?? []).filter((x) => x.precioVsMercado.estado === "oportunidad").length;
  function compararModelo(id: string) {
    setFichaId(null);
    setPestaña("comparar");
    setPedidoComparar((p) => ({ id, n: (p?.n ?? 0) + 1 }));
    setTimeout(() => document.getElementById("analisis")?.scrollIntoView({ behavior: "smooth" }), 120);
  }

  const onEvento = useCallback((e: EventoStream) => {
    switch (e.tipo) {
      case "log":
        setLineas((l) => [...l, { nivel: e.nivel, texto: e.texto }]);
        break;
      case "avance":
        setAvance((a) => ({ progreso: Math.max(a.progreso, e.progreso), texto: e.texto }));
        break;
      case "producto":
        productosRef.current++;
        setProductos((p) => [...p, e.producto]);
        setAvance((a) => ({ ...a, texto: `Encontrado: ${e.producto.nombre}` }));
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
        setLineas((l) => [...l, { nivel: "error", texto: e.mensaje }]);
        break;
      case "fin":
        setSegundos(e.segundos);
        break;
    }
  }, []);

  async function procesar() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    productosRef.current = 0;
    setLineas([]);
    setProductos([]);
    setMercado(null);
    setInsights(null);
    setComparador(null);
    setError(null);
    setSegundos(null);
    setTerminado(false);
    setAvance({ progreso: 0.02, texto: "Arrancando motores…" });
    setEstado("procesando");
    window.scrollTo({ top: 0 });

    try {
      await leerSSE(
        "/api/process",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: ctrl.signal,
          body: JSON.stringify({
            enlaces: entrada.enlaces.map((l) => l.trim()).filter(Boolean),
            mensaje: entrada.mensaje,
            ciudad: entrada.ciudad,
            textoManual: entrada.textoManual.trim() || null,
            archivo: entrada.archivo ? { nombre: entrada.archivo.nombre, csv: entrada.archivo.csv } : null,
          }),
        },
        onEvento,
      );
    } catch {
      if (!ctrl.signal.aborted) setError("Se perdió la conexión con el servidor. Revisa tu internet e intenta de nuevo.");
    } finally {
      if (abortRef.current === ctrl) {
        if (productosRef.current > 0) setTerminado(true);
        else setEstado("error");
      }
    }
  }

  function nuevo() {
    abortRef.current?.abort();
    setEstado("entrada");
    setVerCliente(false);
    setFichaId(null);
    window.scrollTo({ top: 0 });
  }

  /* ───────────── Entrada ───────────── */
  if (estado === "entrada") {
    return (
      <main>
        <div className="relative min-h-[620px] overflow-hidden bg-negro sm:min-h-[760px]">
          <PortadaFoto />
          <Encabezado claro onInicio={nuevo} />
          <div className="relative z-10 mx-auto max-w-7xl px-4 pb-48 pt-10 sm:px-8 sm:pt-20">
            <div className="etiqueta entrar text-plata">Análisis comercial en vivo</div>
            <h1 className="titulo entrar mt-4 max-w-3xl text-[2.6rem] text-white sm:text-7xl" style={{ animationDelay: "80ms" }}>
              El carro correcto <span className="text-plata">para cada cliente.</span>
            </h1>
            <p className="entrar mt-6 max-w-xl text-lg leading-relaxed text-white/75" style={{ animationDelay: "160ms" }}>
              Pega los carros que tienes en vitrina. TORQUE los lee, los compara con el mercado de tu ciudad y te dice cuál recomendar y por qué.
            </p>
          </div>
        </div>
        <div className="relative z-10 mx-auto -mt-32 max-w-5xl px-4 pb-24 sm:px-8">
          <FormularioEntrada valor={entrada} onChange={setEntrada} onProcesar={procesar} />
        </div>
      </main>
    );
  }

  /* ───────────── Procesando / error ───────────── */
  if (estado === "procesando" || estado === "error") {
    return (
      <main className="relative min-h-dvh overflow-hidden bg-negro text-white">
        <Encabezado claro onInicio={nuevo} />
        <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-96px)] max-w-5xl flex-col justify-center px-4 pb-20 sm:px-8">
          <div className="mb-10 flex flex-wrap items-center gap-2 text-sm text-plata">
            <span className="rounded-full border border-white/15 px-3 py-1">{entrada.ciudad || "Colombia"}</span>
            {entrada.mensaje && <span className="min-w-0 max-w-full truncate sm:max-w-2xl">“{entrada.mensaje}”</span>}
          </div>

          {estado === "procesando" ? (
            <>
              <ProgresoCarro objetivo={avance.progreso} texto={avance.texto} terminado={terminado} onCompletado={() => setEstado("resultados")} />
              {productos.length > 0 && (
                <p className="mt-10 text-sm text-plata">
                  {productos.length} carro{productos.length === 1 ? "" : "s"} encontrado{productos.length === 1 ? "" : "s"}
                  {mercado ? " · mercado analizado" : ""}
                </p>
              )}
            </>
          ) : (
            <div className="entrar max-w-2xl">
              <div className="etiqueta text-rojo">No se pudo completar</div>
              <h1 className="titulo mt-3 text-3xl sm:text-4xl">No logramos leer los carros</h1>
              <p className="mt-4 leading-relaxed text-white/75">{error ?? "No se encontró información en las fuentes."}</p>
              <p className="mt-4 text-sm text-plata">
                Tip: si es Mercado Libre o TuCarro, abre la publicación, copia todo (Ctrl+A, Ctrl+C) y usa “Pegar texto manualmente”.
              </p>
              <button onClick={nuevo} className="boton-principal mt-8 px-8 py-4 text-sm">
                Volver e intentar con el Plan B
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  /* ───────────── Resultados ───────────── */
  const specsTop = recomendado ? specsClave(recomendado) : [];
  const top3 = productosOrdenados.slice(0, 3);
  const resto = productosOrdenados.slice(3);
  const pestañas = [
    { id: "graficas" as const, label: "📊 Gráficas", visible: !!insights },
    { id: "comparar" as const, label: "⚖️ Comparar", visible: productos.length > 1 },
    { id: "mercado" as const, label: "📈 Mercado", visible: !!mercado },
    { id: "preguntas" as const, label: "💬 Preguntas del cliente", visible: !!insights?.preguntasCliente.length },
  ].filter((t) => t.visible);
  const pestañaActiva = pestañas.some((t) => t.id === pestaña) ? pestaña : pestañas[0]?.id;

  return (
    <main>
      {/* ── #1 en el escenario oscuro ── */}
      <div className="relative overflow-hidden bg-negro text-white">
        <Encabezado claro onInicio={nuevo} />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-8 px-4 pb-14 pt-2 sm:px-8 lg:grid-cols-[1fr_1.2fr] lg:items-center lg:gap-12 lg:pb-20">
          <div className="revelar order-2 lg:order-1">
            <div className="flex flex-wrap items-center gap-2 text-sm text-plata">
              <span className="rounded-full border border-white/15 px-3 py-1">📍 {entrada.ciudad || "Colombia"}</span>
              {segundos !== null && <span className="rounded-full border border-white/15 px-3 py-1">⏱ {segundos} s</span>}
              <span className="rounded-full border border-white/15 px-3 py-1">🚗 {productos.length} analizados</span>
            </div>
            <div className="etiqueta mt-7 text-rojo">{insights ? "🏆 La mejor opción para tu cliente" : "Carros analizados"}</div>
            {recomendado && (
              <>
                <h1 className="titulo mt-3 text-[2rem] sm:text-5xl">{recomendado.nombre}</h1>
                {insightRecomendado?.titular && <p className="mt-4 max-w-lg text-lg leading-snug text-white/80">✨ {insightRecomendado.titular}</p>}
                <div className="mt-6 flex flex-wrap items-center gap-5">
                  <div className="cifra text-3xl font-bold sm:text-4xl">
                    {recomendado.precio !== null ? formatoMoneda(recomendado.precio, recomendado.moneda) : <span className="text-xl text-plata">Precio: Sin dato</span>}
                  </div>
                  {insightRecomendado && <AnilloPuntuacion valor={insightRecomendado.puntuacion} tamaño={68} oscuro />}
                </div>
                {insightRecomendado && (
                  <div className="mt-4">
                    <InsigniaMercado dato={insightRecomendado.precioVsMercado} />
                  </div>
                )}
                <dl className="mt-7 grid max-w-md grid-cols-3 gap-3 border-t border-white/15 pt-5">
                  {specsTop.map((s) => (
                    <div key={s.clave} className="min-w-0">
                      <Icono nombre={s.clave} className="h-4 w-4 text-plata" />
                      <dd className={`cifra mt-1.5 break-words font-bold leading-tight sm:text-lg ${s.valor === "Sin dato" ? "font-normal text-plata" : ""}`}>{s.valor}</dd>
                      <dt className="mt-0.5 text-xs text-plata">{s.clave}</dt>
                    </div>
                  ))}
                </dl>
              </>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              {recomendado && (
                <button onClick={() => setFichaId(recomendado.id)} className="boton-principal px-6 py-4 text-xs">
                  🔍 Ver detalles
                </button>
              )}
              {comparador && (
                <button onClick={() => setVerCliente(true)} className="boton-borde px-6 py-4 text-xs text-white hover:bg-white hover:text-tinta">
                  👀 Así lo vería tu cliente
                </button>
              )}
              <button onClick={nuevo} className="rounded-[10px] px-4 py-4 text-xs font-semibold text-plata hover:text-white">
                ↻ Nuevo análisis
              </button>
            </div>
          </div>
          {recomendado && (
            <button type="button" onClick={() => setFichaId(recomendado.id)} className="revelar group order-1 block lg:order-2" style={{ animationDelay: "150ms" }} aria-label={`Ver fotos de ${recomendado.nombre}`}>
              <div className="relative overflow-hidden rounded-[16px] shadow-[0_40px_100px_-30px_rgba(200,16,46,.35)]">
                <FotoProducto
                  imagenes={recomendado.imagenes}
                  alt={recomendado.nombre}
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="aspect-[16/10] w-full transition-transform duration-[1200ms] group-hover:scale-[1.04]"
                  prioridad
                />
                <div className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-tinta">🥇 #1</div>
              </div>
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-14 sm:space-y-20 sm:px-8 sm:py-20">
        {/* ── Podio ── */}
        <Seccion etiqueta="🏁 Podio" titulo={insights ? "Top 3 para tu cliente" : "Carros encontrados"}>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {top3.map((p, i) => (
              <TarjetaCarro key={p.id} producto={p} insight={insightsPorId.get(p.id)} posicion={i} onAbrir={() => setFichaId(p.id)} />
            ))}
          </div>
        </Seccion>

        {/* ── Resumen ejecutivo del top 3 ── */}
        {insights && insights.resumen.length > 0 && (
          <section className="entrar overflow-hidden rounded-[16px] bg-negro text-white">
            <div className="p-6 sm:p-10">
              <div className="etiqueta text-rojo">🧭 Resumen ejecutivo</div>
              <h2 className="titulo mt-2 text-2xl sm:text-3xl">Por qué este top 3</h2>
              <ol className="mt-8 space-y-5">
                {insights.resumen.map((r, i) => {
                  const p = top3[i];
                  return (
                    <li key={i} className="entrar flex gap-4 border-t border-white/10 pt-5 first:border-0 first:pt-0" style={{ animationDelay: `${i * 120}ms` }}>
                      <span className="text-3xl leading-none">{medalla(i)}</span>
                      <div className="min-w-0">
                        {p && (
                          <button type="button" onClick={() => setFichaId(p.id)} className="cifra text-sm font-semibold text-plata hover:text-white">
                            {p.nombre} →
                          </button>
                        )}
                        <p className="mt-1 text-[1.05rem] leading-relaxed text-white/90">{r}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
            {insights.veredicto && (
              <div className="flex gap-3 bg-rojo px-6 py-5 sm:px-10">
                <span className="text-xl">💡</span>
                <p className="font-medium leading-snug">
                  <strong className="etiqueta mr-2 !text-[0.65rem]">Veredicto</strong>
                  {insights.veredicto}
                </p>
              </div>
            )}
          </section>
        )}

        {/* ── El resto ── */}
        {resto.length > 0 && (
          <Seccion etiqueta="🚗 Más opciones" titulo="El resto de la vitrina">
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {resto.map((p, i) => (
                <TarjetaCarro key={p.id} producto={p} insight={insightsPorId.get(p.id)} posicion={i + 3} onAbrir={() => setFichaId(p.id)} />
              ))}
            </div>
          </Seccion>
        )}

        {/* ── Análisis a fondo ── */}
        {pestañas.length > 0 && (
          <Seccion id="analisis" etiqueta="🔬 Análisis a fondo" titulo="Profundiza cuando lo necesites">
            <div className="scroll-fino -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist">
              {pestañas.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={pestañaActiva === t.id}
                  onClick={() => setPestaña(t.id)}
                  className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors ${
                    pestañaActiva === t.id ? "border-tinta bg-tinta text-white" : "border-linea bg-white text-tinta hover:border-tinta"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {pestañaActiva === "graficas" && insights && (
              <div key="graficas" className="entrar space-y-6">
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-linea bg-linea lg:grid-cols-4">
                  {[
                    { e: "🚗", etiqueta: "Carros analizados", valor: productos.length, formato: (n: number) => String(Math.round(n)) },
                    {
                      e: "💰",
                      etiqueta: "Precio promedio",
                      valor: precios.length ? precios.reduce((a, b) => a + b, 0) / precios.length : 0,
                      formato: (n: number) => (precios.length ? formatoMoneda(n, monedaPrincipal) : "Sin dato"),
                    },
                    {
                      e: "↔️",
                      etiqueta: "Diferencia de precio",
                      valor: precios.length > 1 ? Math.max(...precios) - Math.min(...precios) : 0,
                      formato: (n: number) => (precios.length > 1 ? formatoMoneda(n, monedaPrincipal) : "Sin dato"),
                    },
                    { e: "⭐", etiqueta: "Oportunidades de precio", valor: oportunidades, formato: (n: number) => String(Math.round(n)) },
                  ].map((k) => (
                    <div key={k.etiqueta} className="bg-white p-5 sm:p-6">
                      <div className="text-xs text-gris">
                        {k.e} {k.etiqueta}
                      </div>
                      <Contador valor={k.valor} formato={k.formato} className="cifra mt-2 block text-xl font-bold sm:text-3xl" />
                    </div>
                  ))}
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="tarjeta p-5 sm:p-6">
                    <h3 className="cifra font-bold">🏆 Ranking según tu cliente</h3>
                    <p className="mb-5 mt-1 text-xs text-gris">Puntuación de 0 a 100. Clic en un carro para verlo.</p>
                    <Ranking productos={productos} insights={insightsPorId} onSeleccionar={setFichaId} />
                  </div>
                  <div className="tarjeta p-5 sm:p-6">
                    <h3 className="cifra font-bold">💰 Precio frente al mercado</h3>
                    <p className="mb-5 mt-1 text-xs text-gris">Diferencia con el promedio de su segmento en {mercado?.ciudad ?? entrada.ciudad}.</p>
                    <BarrasMercado productos={productosOrdenados} insights={insightsPorId} />
                  </div>
                </div>
                <div className="tarjeta p-5 sm:p-6">
                  <h3 className="cifra font-bold">🗺️ Mapa de valor: precio vs. kilometraje</h3>
                  <p className="mb-4 mt-1 text-xs text-gris">El punto rojo es el recomendado.</p>
                  <MapaValor productos={productos} destacadoId={recomendado?.id ?? null} />
                  {productos.filter((p) => p.atributos.some((a) => a.clave === "Kilometraje" && a.valor !== "Sin dato")).length < 2 && (
                    <p className="text-sm text-gris">Sin dato: se necesitan al menos 2 carros con kilometraje conocido.</p>
                  )}
                </div>
              </div>
            )}

            {pestañaActiva === "comparar" && (
              <div key="comparar" className="entrar">
                <TablaComparativa productos={productosOrdenados} insights={insightsPorId} pedido={pedidoComparar} onAbrirFicha={setFichaId} />
              </div>
            )}

            {pestañaActiva === "mercado" && mercado && (
              <div key="mercado" className="entrar">
                <PanelMercado mercado={mercado} />
              </div>
            )}

            {pestañaActiva === "preguntas" && insights && (
              <div key="preguntas" className="entrar grid gap-4 md:grid-cols-2">
                {insights.preguntasCliente.map((q, i) => (
                  <div key={i} className="tarjeta flex gap-4 p-5">
                    <span className="text-xl">💬</span>
                    <div>
                      <div className="font-semibold">{q.pregunta}</div>
                      <p className="mt-1 text-sm text-gris">{q.porQue}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Seccion>
        )}

        {avisos.length > 0 && (
          <details className="tarjeta p-5 text-sm">
            <summary className="cursor-pointer font-semibold">🔎 Avisos del análisis ({avisos.length})</summary>
            <ul className="mt-3 space-y-1.5 text-gris">
              {avisos.map((a, i) => (
                <li key={i} className={a.nivel === "error" ? "text-rojo" : ""}>
                  • {a.texto}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <footer className="border-t border-linea bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-8">
          <Marca conLema={false} />
          <p className="text-xs text-gris">Datos tomados de las fuentes indicadas. Lo que no se encontró aparece como “Sin dato”.</p>
        </div>
      </footer>

      {verCliente && comparador && <EditorComparador config={comparador} onCerrar={() => setVerCliente(false)} />}
      {fichaId && (
        <VistaPrevia
          productos={productosOrdenados}
          insights={insightsPorId}
          id={fichaId}
          onCambiar={setFichaId}
          onCerrar={() => setFichaId(null)}
          onComparar={compararModelo}
        />
      )}
    </main>
  );
}
