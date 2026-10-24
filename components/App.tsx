"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { formatoMoneda } from "@/lib/format";
import type { ComparadorConfig, EventoStream, InsightProducto, Insights, LogNivel, Mercado, Producto } from "@/lib/schemas";
import { leerSSE } from "@/lib/sse-client";
import AnilloPuntuacion from "./AnilloPuntuacion";
import EditorComparador from "./EditorComparador";
import FichaCarro from "./FichaCarro";
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
import TarjetaProducto, { specsClave } from "./TarjetaProducto";

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
  const fichaProducto = fichaId ? productos.find((p) => p.id === fichaId) : undefined;

  function compararModelo(id: string) {
    setFichaId(null);
    setPedidoComparar((p) => ({ id, n: (p?.n ?? 0) + 1 }));
    setTimeout(() => document.getElementById("comparar")?.scrollIntoView({ behavior: "smooth" }), 80);
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
  return (
    <main>
      {/* Héroe: el carro recomendado */}
      <div className="relative overflow-hidden bg-negro text-white">
        <Encabezado claro onInicio={nuevo} />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-4 sm:px-8 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:pb-20">
          <div className="revelar">
            <div className="flex flex-wrap items-center gap-2 text-sm text-plata">
              <span className="rounded-full border border-white/15 px-3 py-1">{entrada.ciudad || "Colombia"}</span>
              {segundos !== null && <span>Análisis en {segundos} s</span>}
            </div>
            <div className="etiqueta mt-8 text-rojo">{insights ? "Recomendado para tu cliente" : "Carros analizados"}</div>
            {recomendado && (
              <>
                <h1 className="titulo mt-3 text-4xl sm:text-5xl">{recomendado.nombre}</h1>
                <div className="mt-5 flex flex-wrap items-center gap-5">
                  <div className="cifra text-3xl font-bold sm:text-4xl">
                    {recomendado.precio !== null ? formatoMoneda(recomendado.precio, recomendado.moneda) : <span className="text-xl text-plata">Precio: Sin dato</span>}
                  </div>
                  {insightRecomendado && <AnilloPuntuacion valor={insightRecomendado.puntuacion} tamaño={70} oscuro />}
                </div>
                {insightRecomendado && (
                  <div className="mt-4">
                    <InsigniaMercado dato={insightRecomendado.precioVsMercado} />
                  </div>
                )}
                {specsTop.length > 0 && (
                  <dl className="mt-8 grid max-w-md grid-cols-3 gap-4 border-t border-white/15 pt-6">
                    {specsTop.map((s) => (
                      <div key={s.clave} className="min-w-0">
                        <dd className="cifra break-words text-lg font-bold leading-tight">{s.valor}</dd>
                        <dt className="mt-1 text-xs text-plata">{s.clave}</dt>
                      </div>
                    ))}
                  </dl>
                )}
                {insightRecomendado && <p className="mt-6 max-w-lg leading-relaxed text-white/75">Ideal para: {insightRecomendado.idealPara}</p>}
              </>
            )}
            <div className="mt-9 flex flex-wrap gap-3">
              {recomendado && (
                <button onClick={() => setFichaId(recomendado.id)} className="boton-borde px-7 py-4 text-xs text-white hover:bg-white hover:text-tinta">
                  Ver ficha completa
                </button>
              )}
              {comparador && (
                <button onClick={() => setVerCliente(true)} className="boton-principal px-7 py-4 text-xs">
                  Así lo vería tu cliente →
                </button>
              )}
              <button onClick={nuevo} className="boton-borde px-7 py-4 text-xs text-white hover:bg-white hover:text-tinta">
                Nuevo análisis
              </button>
            </div>
          </div>
          {recomendado && (
            <div className="revelar" style={{ animationDelay: "150ms" }}>
              <FotoProducto
                imagenes={recomendado.imagenes}
                alt={recomendado.nombre}
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="aspect-[16/10] w-full rounded-[14px]"
                prioridad
              />
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-20 px-4 py-16 sm:px-8 sm:py-20">
        {insights && (
          <Seccion etiqueta="Resumen ejecutivo" titulo="Lo que necesitas saber">
            <div className="grid gap-px overflow-hidden rounded-[14px] border border-linea bg-linea md:grid-cols-3">
              {insights.resumen.map((r, i) => (
                <div key={i} className="entrar bg-white p-6 sm:p-8" style={{ animationDelay: `${i * 120}ms` }}>
                  <div className="cifra text-4xl font-bold text-rojo">{String(i + 1).padStart(2, "0")}</div>
                  <p className="mt-4 text-[1.02rem] leading-relaxed">{r}</p>
                </div>
              ))}
            </div>
          </Seccion>
        )}

        <section className="entrar grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-linea bg-linea lg:grid-cols-4">
          {[
            { etiqueta: "Carros analizados", valor: productos.length, formato: (n: number) => String(Math.round(n)) },
            {
              etiqueta: "Precio promedio",
              valor: precios.length ? precios.reduce((a, b) => a + b, 0) / precios.length : 0,
              formato: (n: number) => (precios.length ? formatoMoneda(n, monedaPrincipal) : "Sin dato"),
            },
            {
              etiqueta: "Diferencia de precio",
              valor: precios.length > 1 ? Math.max(...precios) - Math.min(...precios) : 0,
              formato: (n: number) => (precios.length > 1 ? formatoMoneda(n, monedaPrincipal) : "Sin dato"),
            },
            { etiqueta: "Oportunidades de precio", valor: oportunidades, formato: (n: number) => (insights ? String(Math.round(n)) : "Sin dato") },
          ].map((k, i) => (
            <div key={k.etiqueta} className="bg-white p-5 sm:p-7" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="text-xs text-gris">{k.etiqueta}</div>
              <Contador valor={k.valor} formato={k.formato} className="cifra mt-2 block text-2xl font-bold sm:text-3xl" />
            </div>
          ))}
        </section>

        {insights && (
          <Seccion etiqueta="Análisis visual" titulo="Quién gana y por qué" ayuda="Pasa el mouse sobre las gráficas para ver el detalle. Haz clic en un carro del ranking para abrir su ficha.">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="tarjeta p-6">
                <h3 className="cifra font-bold">Ranking según tu cliente</h3>
                <p className="mb-5 mt-1 text-xs text-gris">Puntuación de 0 a 100 frente al contexto que escribiste.</p>
                <Ranking productos={productos} insights={insightsPorId} onSeleccionar={setFichaId} />
              </div>
              <div className="tarjeta p-6">
                <h3 className="cifra font-bold">Precio frente al mercado</h3>
                <p className="mb-5 mt-1 text-xs text-gris">Diferencia con el precio promedio de su segmento en {mercado?.ciudad ?? entrada.ciudad}.</p>
                <BarrasMercado productos={productosOrdenados} insights={insightsPorId} />
              </div>
            </div>
            <div className="tarjeta p-6">
              <h3 className="cifra font-bold">Mapa de valor: precio vs. kilometraje</h3>
              <p className="mb-4 mt-1 text-xs text-gris">El punto rojo es el recomendado. Si falta el kilometraje de algún carro, no aparece aquí.</p>
              <MapaValor productos={productos} destacadoId={insights ? (recomendado?.id ?? null) : null} />
            </div>
          </Seccion>
        )}

        <Seccion etiqueta="Vitrina" titulo={`${productos.length} carro${productos.length === 1 ? "" : "s"} analizado${productos.length === 1 ? "" : "s"}`}>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {productosOrdenados.map((p, i) => (
              <TarjetaProducto
                key={p.id}
                producto={p}
                insight={insightsPorId.get(p.id)}
                posicion={i}
                destacado={i === 0 && !!insights}
                onAbrir={() => setFichaId(p.id)}
              />
            ))}
          </div>
        </Seccion>

        {productos.length > 1 && (
          <Seccion id="comparar" etiqueta="Comparador" titulo="Compara frente a frente">
            <TablaComparativa productos={productosOrdenados} insights={insightsPorId} pedido={pedidoComparar} onAbrirFicha={setFichaId} />
          </Seccion>
        )}

        {insights && insights.preguntasCliente.length > 0 && (
          <Seccion etiqueta="Prepárate" titulo="Lo que preguntará tu cliente">
            <div className="grid gap-4 md:grid-cols-2">
              {insights.preguntasCliente.map((q, i) => (
                <div key={i} className="tarjeta entrar flex gap-4 p-5" style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="cifra text-sm font-bold text-rojo">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <div className="font-semibold">{q.pregunta}</div>
                    <p className="mt-1 text-sm text-gris">{q.porQue}</p>
                  </div>
                </div>
              ))}
            </div>
          </Seccion>
        )}

        {mercado && (
          <Seccion etiqueta="Mercado" titulo={`El mercado en ${mercado.ciudad}`}>
            <PanelMercado mercado={mercado} />
          </Seccion>
        )}

        {avisos.length > 0 && (
          <details className="tarjeta p-5 text-sm">
            <summary className="cursor-pointer font-semibold">Avisos del análisis ({avisos.length})</summary>
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
      {fichaProducto && (
        <FichaCarro producto={fichaProducto} insight={insightsPorId.get(fichaProducto.id)} onCerrar={() => setFichaId(null)} onComparar={compararModelo} />
      )}
    </main>
  );
}
