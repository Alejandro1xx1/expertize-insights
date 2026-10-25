"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, BarChart3, MessageSquareText, Scale, ScanSearch, TrendingUp } from "lucide-react";
import { ETAPAS, etapaLabel, type Asesor, type Atencion, type Cliente, type EtapaId } from "@/lib/crm";
import { formatoMoneda } from "@/lib/format";
import type { EventoStream, InsightProducto, Insights, LogNivel, Mercado, Producto } from "@/lib/schemas";
import { leerSSE } from "@/lib/sse-client";
import { useAutoguardado } from "@/lib/useAutoguardado";
import AnilloPuntuacion from "./AnilloPuntuacion";
import Encabezado from "./Encabezado";
import FormularioEntrada, { ENTRADA_VACIA, type DatosEntrada } from "./FormularioEntrada";
import FotoProducto from "./FotoProducto";
import BarrasMercado from "./graficas/BarrasMercado";
import Contador from "./graficas/Contador";
import MapaValor from "./graficas/MapaValor";
import Ranking from "./graficas/Ranking";
import Icono from "./Iconos";
import IndicadorGuardado from "./IndicadorGuardado";
import InicioAtencion from "./InicioAtencion";
import InsigniaMercado from "./InsigniaMercado";
import Marca from "./Marca";
import PanelMercado from "./PanelMercado";
import PortadaFoto from "./PortadaFoto";
import ProgresoCarro from "./ProgresoCarro";
import TablaComparativa from "./TablaComparativa";
import TarjetaCarro, { puesto, specsClave } from "./TarjetaCarro";
import VistaPrevia from "./VistaPrevia";

type Fase = "cargando" | "inicio" | "entrada" | "procesando" | "resultados" | "error";
type Linea = { nivel: LogNivel; texto: string };
type Resultado = { productos: Producto[]; mercado: Mercado | null; insights: Insights | null; segundos: number | null; avisos: Linea[] };
type Pestaña = "graficas" | "comparar" | "mercado" | "preguntas";

function Seccion({ titulo, etiqueta, children, id, ayuda }: { titulo: string; etiqueta: string; children: React.ReactNode; id?: string; ayuda?: string }) {
  return (
    <section id={id} className="entrar scroll-mt-6">
      <div className="mb-8 max-w-2xl">
        <div className="etiqueta text-gris">{etiqueta}</div>
        <h2 className="titulo mt-2.5 text-[1.75rem] sm:text-[2rem]">{titulo}</h2>
        {ayuda && <p className="mt-3 text-[0.95rem] leading-relaxed text-gris">{ayuda}</p>}
      </div>
      {children}
    </section>
  );
}

export default function App() {
  const [fase, setFase] = useState<Fase>("cargando");
  const [asesores, setAsesores] = useState<Asesor[]>([]);
  const [cargandoAsesores, setCargandoAsesores] = useState(true);
  const [atencionId, setAtencionId] = useState<string | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [asesorNombre, setAsesorNombre] = useState("");
  const [etapa, setEtapa] = useState<EtapaId>("perfil");
  const [notas, setNotas] = useState("");

  const [entrada, setEntrada] = useState<DatosEntrada>(ENTRADA_VACIA);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [mercado, setMercado] = useState<Mercado | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [segundos, setSegundos] = useState<number | null>(null);
  const [avance, setAvance] = useState({ progreso: 0, texto: "Arrancando motores…" });
  const [terminado, setTerminado] = useState(false);
  const [fichaId, setFichaId] = useState<string | null>(null);
  const [pedidoComparar, setPedidoComparar] = useState<{ id: string; n: number } | null>(null);
  const [pestaña, setPestaña] = useState<Pestaña>("graficas");
  const abortRef = useRef<AbortController | null>(null);
  const resultadoRef = useRef<Resultado>({ productos: [], mercado: null, insights: null, segundos: null, avisos: [] });

  const { estado: guardado, guardar, reintentar, marcarGuardado } = useAutoguardado(atencionId);

  /* ── Carga inicial: asesores y, si viene ?atencion=, la atención a retomar ── */
  useEffect(() => {
    fetch("/api/asesores")
      .then((r) => r.json())
      .then((d) => setAsesores(d.asesores ?? []))
      .catch(() => setAsesores([]))
      .finally(() => setCargandoAsesores(false));

    const id = new URLSearchParams(window.location.search).get("atencion");
    if (!id) {
      setFase("inicio");
      return;
    }
    fetch(`/api/clientes/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { atencion: Atencion; persistente: boolean }) => {
        const a = d.atencion;
        setAtencionId(a.id);
        setCliente(a.cliente);
        setAsesorNombre(a.asesorNombre);
        setEtapa(a.etapa);
        setNotas(a.notas);
        setEntrada({ ...ENTRADA_VACIA, enlaces: a.enlaces.length ? [...a.enlaces, ""] : [""], mensaje: a.perfil, ciudad: a.ciudad || ENTRADA_VACIA.ciudad, textoManual: a.textoManual });
        marcarGuardado(a.actualizadoEl, d.persistente);
        const res = a.resultado as Resultado | null;
        if (res?.productos?.length) {
          resultadoRef.current = res;
          setProductos(res.productos);
          setMercado(res.mercado);
          setInsights(res.insights);
          setSegundos(res.segundos);
          setLineas(res.avisos ?? []);
          setFase("resultados");
        } else {
          setFase("entrada");
        }
      })
      .catch(() => {
        window.history.replaceState(null, "", "/");
        setFase("inicio");
      });
  }, [marcarGuardado]);

  /* ── Derivados ── */
  const insightsPorId = useMemo(() => new Map<string, InsightProducto>((insights?.productos ?? []).map((p) => [p.id, p])), [insights]);
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

  /* ── Atención ── */
  async function empezarAtencion(datos: { asesorId: string; cliente: Cliente }): Promise<string | null> {
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...datos, ciudad: entrada.ciudad }),
      });
      const d = await res.json();
      if (!res.ok) return d.error ?? "No se pudo crear la atención.";
      const a: Atencion = d.atencion;
      setAtencionId(a.id);
      setCliente(a.cliente);
      setAsesorNombre(a.asesorNombre);
      setEtapa(a.etapa);
      setNotas("");
      marcarGuardado(a.actualizadoEl, d.persistente);
      window.history.replaceState(null, "", `/?atencion=${a.id}`);
      setFase("entrada");
      window.scrollTo({ top: 0 });
      return null;
    } catch {
      return "Sin conexión. Intenta de nuevo.";
    }
  }

  function cambiarEntrada(v: DatosEntrada) {
    setEntrada(v);
    guardar({ enlaces: v.enlaces.map((l) => l.trim()).filter(Boolean), perfil: v.mensaje, ciudad: v.ciudad, textoManual: v.textoManual });
  }

  function cambiarEtapa(e: EtapaId) {
    setEtapa(e);
    guardar({ etapa: e }, true);
  }

  function cambiarNotas(n: string) {
    setNotas(n);
    guardar({ notas: n });
  }

  /* ── Análisis ── */
  const onEvento = useCallback((e: EventoStream) => {
    const r = resultadoRef.current;
    switch (e.tipo) {
      case "log":
        if (e.nivel === "warn" || e.nivel === "error") r.avisos = [...r.avisos, { nivel: e.nivel, texto: e.texto }];
        setLineas((l) => [...l, { nivel: e.nivel, texto: e.texto }]);
        break;
      case "avance":
        setAvance((a) => ({ progreso: Math.max(a.progreso, e.progreso), texto: e.texto }));
        break;
      case "producto":
        r.productos = [...r.productos, e.producto];
        setProductos(r.productos);
        setAvance((a) => ({ ...a, texto: `Encontrado: ${e.producto.nombre}` }));
        break;
      case "mercado":
        r.mercado = e.mercado;
        setMercado(e.mercado);
        break;
      case "insights":
        r.insights = e.insights;
        setInsights(e.insights);
        break;
      case "error":
        r.avisos = [...r.avisos, { nivel: "error", texto: e.mensaje }];
        setError(e.mensaje);
        setLineas((l) => [...l, { nivel: "error", texto: e.mensaje }]);
        break;
      case "fin":
        r.segundos = e.segundos;
        setSegundos(e.segundos);
        break;
    }
  }, []);

  async function procesar() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    resultadoRef.current = { productos: [], mercado: null, insights: null, segundos: null, avisos: [] };
    setLineas([]);
    setProductos([]);
    setMercado(null);
    setInsights(null);
    setError(null);
    setSegundos(null);
    setTerminado(false);
    setPestaña("graficas");
    setAvance({ progreso: 0.02, texto: "Arrancando motores…" });
    setFase("procesando");
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
        const r = resultadoRef.current;
        if (r.productos.length > 0) {
          const nuevaEtapa = etapa === "perfil" ? "analizado" : etapa;
          setEtapa(nuevaEtapa);
          guardar({ resultado: r, etapa: nuevaEtapa }, true);
          setTerminado(true);
        } else {
          setFase("error");
        }
      }
    }
  }

  function compararModelo(id: string) {
    setFichaId(null);
    setPestaña("comparar");
    setPedidoComparar((p) => ({ id, n: (p?.n ?? 0) + 1 }));
    setTimeout(() => document.getElementById("analisis")?.scrollIntoView({ behavior: "smooth" }), 120);
  }

  /* ── Barra de la atención: asesor, cliente y guardado ── */
  const barraAtencion = (oscuro: boolean) =>
    cliente && (
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-t pb-4 pt-3 text-xs ${oscuro ? "border-white/10 text-plata" : "border-linea text-gris"}`}>
        <span>
          Asesor: <span className={oscuro ? "text-white" : "text-tinta"}>{asesorNombre}</span>
        </span>
        <span aria-hidden>·</span>
        <span>
          Cliente: <span className={oscuro ? "text-white" : "text-tinta"}>{cliente.nombre}</span>
        </span>
        <span aria-hidden>·</span>
        <IndicadorGuardado estado={guardado} onReintentar={() => void reintentar()} oscuro={oscuro} />
      </div>
    );

  /* ───────────── Cargando una atención guardada ───────────── */
  if (fase === "cargando") {
    return (
      <main className="min-h-dvh bg-negro">
        <Encabezado oscuro />
        <div className="mx-auto max-w-7xl px-5 py-24 text-sm text-plata sm:px-8">Abriendo la atención…</div>
      </main>
    );
  }

  /* ───────────── Inicio de la atención y formulario ───────────── */
  if (fase === "inicio" || fase === "entrada") {
    const esInicio = fase === "inicio";
    return (
      <main>
        <div className="relative min-h-[560px] overflow-hidden bg-negro sm:min-h-[660px]">
          <PortadaFoto />
          <Encabezado oscuro>{!esInicio && barraAtencion(true)}</Encabezado>
          <div className="relative z-10 mx-auto max-w-7xl px-5 pb-44 pt-10 sm:px-8 sm:pt-16">
            <div className="etiqueta entrar text-plata">{esInicio ? "Nueva atención" : "Perfil y vehículos"}</div>
            <h1 className="display entrar mt-5 max-w-3xl text-[2.4rem] text-white sm:text-[4.25rem]" style={{ animationDelay: "60ms" }}>
              {esInicio ? (
                <>
                  El carro correcto <span className="text-plata">para cada cliente.</span>
                </>
              ) : (
                <>
                  ¿Qué busca <span className="text-plata">{cliente?.nombre.split(" ")[0] ?? "tu cliente"}?</span>
                </>
              )}
            </h1>
            <p className="entrar mt-6 max-w-xl text-[1.05rem] leading-relaxed text-white/70" style={{ animationDelay: "120ms" }}>
              {esInicio
                ? "Registra quién atiende y a quién. Después pega los carros: TORQUE los compara con el mercado y te dice cuál recomendar y por qué."
                : "Pega los carros que tienes en vitrina, describe al cliente y elige la ciudad."}
            </p>
          </div>
        </div>
        <div className="relative z-10 mx-auto -mt-32 max-w-5xl px-5 pb-24 sm:px-8">
          {esInicio ? (
            <InicioAtencion asesores={asesores} cargandoAsesores={cargandoAsesores} onEmpezar={empezarAtencion} />
          ) : (
            <FormularioEntrada valor={entrada} onChange={cambiarEntrada} onProcesar={procesar} />
          )}
        </div>
      </main>
    );
  }

  /* ───────────── Procesando / error ───────────── */
  if (fase === "procesando" || fase === "error") {
    return (
      <main className="relative min-h-dvh overflow-hidden bg-negro text-white">
        <Encabezado oscuro>{barraAtencion(true)}</Encabezado>
        <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-140px)] max-w-5xl flex-col justify-center px-5 pb-20 sm:px-8">
          <div className="mb-10 flex flex-wrap items-center gap-2 text-sm text-plata">
            <span className="rounded-full border border-white/15 px-3 py-1">{entrada.ciudad || "Colombia"}</span>
            {entrada.mensaje && <span className="min-w-0 max-w-full truncate sm:max-w-2xl">“{entrada.mensaje}”</span>}
          </div>

          {fase === "procesando" ? (
            <>
              <ProgresoCarro objetivo={avance.progreso} texto={avance.texto} terminado={terminado} onCompletado={() => setFase("resultados")} />
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
                Si es Mercado Libre o TuCarro, abre la publicación, copia todo (Ctrl+A, Ctrl+C) y usa “Pegar texto manualmente”.
              </p>
              <button onClick={() => setFase("entrada")} className="btn btn-primario btn-lg mt-8">
                Volver al formulario
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
    { id: "graficas" as const, label: "Gráficas", Icon: BarChart3, visible: !!insights },
    { id: "comparar" as const, label: "Comparar", Icon: Scale, visible: productos.length > 1 },
    { id: "mercado" as const, label: "Mercado", Icon: TrendingUp, visible: !!mercado },
    { id: "preguntas" as const, label: "Preguntas del cliente", Icon: MessageSquareText, visible: !!insights?.preguntasCliente.length },
  ].filter((t) => t.visible);
  const pestañaActiva = pestañas.some((t) => t.id === pestaña) ? pestaña : pestañas[0]?.id;

  return (
    <main>
      {/* ── #1 en el escenario oscuro ── */}
      <div className="relative overflow-hidden bg-negro text-white">
        <Encabezado oscuro>{barraAtencion(true)}</Encabezado>
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[1fr_1.2fr] lg:items-center lg:gap-14 lg:pb-24 lg:pt-10">
          <div className="revelar order-2 lg:order-1">
            <div className="etiqueta text-plata">{insights ? "La mejor opción para este cliente" : "Carros analizados"}</div>
            {recomendado && (
              <>
                <h1 className="display mt-4 text-[2rem] sm:text-[3.25rem]">{recomendado.nombre}</h1>
                {insightRecomendado?.titular && <p className="mt-5 max-w-lg text-lg leading-snug text-white/75">{insightRecomendado.titular}</p>}
                <div className="mt-8 flex flex-wrap items-center gap-6">
                  <div className="cifra text-3xl font-semibold sm:text-[2.5rem]">
                    {recomendado.precio !== null ? formatoMoneda(recomendado.precio, recomendado.moneda) : <span className="text-xl text-plata">Precio: sin dato</span>}
                  </div>
                  {insightRecomendado && <AnilloPuntuacion valor={insightRecomendado.puntuacion} tamaño={64} oscuro />}
                </div>
                {insightRecomendado && (
                  <div className="mt-4 [&>span]:bg-white/10 [&>span]:text-white/85">
                    <InsigniaMercado dato={insightRecomendado.precioVsMercado} />
                  </div>
                )}
                <dl className="mt-9 grid max-w-md grid-cols-3 gap-4 border-t border-white/10 pt-6">
                  {specsTop.map((s) => (
                    <div key={s.clave} className="min-w-0">
                      <Icono nombre={s.clave} className="h-4 w-4 text-plata" />
                      <dd className={`cifra mt-2 break-words font-semibold leading-tight sm:text-lg ${s.valor === "Sin dato" ? "font-normal text-plata" : ""}`}>{s.valor}</dd>
                      <dt className="mt-1 text-xs text-plata">{s.clave}</dt>
                    </div>
                  ))}
                </dl>
              </>
            )}
            {recomendado && (
              <button onClick={() => setFichaId(recomendado.id)} className="btn btn-primario btn-lg mt-10">
                Ver detalles <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
              </button>
            )}
          </div>
          {recomendado && (
            <button type="button" onClick={() => setFichaId(recomendado.id)} className="revelar group order-1 block lg:order-2" style={{ animationDelay: "120ms" }} aria-label={`Ver fotos de ${recomendado.nombre}`}>
              <div className="relative overflow-hidden rounded-[var(--radius-xl)]">
                <FotoProducto
                  imagenes={recomendado.imagenes}
                  alt={recomendado.nombre}
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="aspect-[16/10] w-full transition-transform duration-700 ease-[var(--ease-suave)] group-hover:scale-[1.02]"
                  prioridad
                />
                <div className="pointer-events-none absolute inset-0 rounded-[var(--radius-xl)] ring-1 ring-inset ring-white/10" />
              </div>
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-20 px-5 py-16 sm:space-y-28 sm:px-8 sm:py-24">
        {/* ── Podio ── */}
        <Seccion etiqueta="Podio" titulo={insights ? "Top 3 para este cliente" : "Carros encontrados"}>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {top3.map((p, i) => (
              <TarjetaCarro key={p.id} producto={p} insight={insightsPorId.get(p.id)} posicion={i} onAbrir={() => setFichaId(p.id)} />
            ))}
          </div>
        </Seccion>

        {/* ── Resumen ejecutivo del top 3 ── */}
        {insights && insights.resumen.length > 0 && (
          <section className="entrar overflow-hidden rounded-[var(--radius-xl)] bg-negro text-white">
            <div className="grid gap-10 p-7 sm:p-12 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <div className="etiqueta text-plata">Resumen ejecutivo</div>
                <h2 className="titulo mt-2.5 text-[1.75rem] sm:text-[2rem]">Por qué este top 3</h2>
              </div>
              <ol className="space-y-7">
                {insights.resumen.map((r, i) => {
                  const p = top3[i];
                  return (
                    <li key={i} className="entrar grid grid-cols-[2.5rem_1fr] gap-4" style={{ animationDelay: `${i * 80}ms` }}>
                      <span className="cifra pt-0.5 text-lg font-semibold text-plata">{puesto(i)}</span>
                      <div className="min-w-0 border-b border-white/10 pb-7">
                        {p && (
                          <button type="button" onClick={() => setFichaId(p.id)} className="enlace-suave text-sm font-medium text-white hover:text-plata">
                            {p.nombre}
                          </button>
                        )}
                        <p className="mt-1.5 leading-relaxed text-white/70">{r}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
            {insights.veredicto && (
              <div className="flex flex-col gap-1 border-t border-white/10 px-7 py-6 sm:flex-row sm:items-baseline sm:gap-6 sm:px-12">
                <span className="etiqueta shrink-0 text-rojo">Veredicto</span>
                <p className="text-[1.05rem] font-medium leading-snug">{insights.veredicto}</p>
              </div>
            )}
          </section>
        )}

        {/* ── El resto ── */}
        {resto.length > 0 && (
          <Seccion etiqueta="Más opciones" titulo="El resto de la vitrina">
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {resto.map((p, i) => (
                <TarjetaCarro key={p.id} producto={p} insight={insightsPorId.get(p.id)} posicion={i + 3} onAbrir={() => setFichaId(p.id)} />
              ))}
            </div>
          </Seccion>
        )}

        {/* ── Análisis a fondo ── */}
        {pestañas.length > 0 && (
          <Seccion id="analisis" etiqueta="Análisis a fondo" titulo="Profundiza cuando lo necesites">
            <div className="scroll-fino -mx-5 mb-8 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0" role="tablist">
              {pestañas.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={pestañaActiva === t.id} onClick={() => setPestaña(t.id)} className="chip shrink-0 !min-h-10 font-medium">
                  <t.Icon className="h-4 w-4" strokeWidth={1.5} />
                  {t.label}
                </button>
              ))}
            </div>

            {pestañaActiva === "graficas" && insights && (
              <div key="graficas" className="entrar space-y-6">
                <div className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-lg)] border border-linea bg-white lg:grid-cols-4">
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
                    { etiqueta: "Oportunidades de precio", valor: oportunidades, formato: (n: number) => String(Math.round(n)) },
                  ].map((k, i) => (
                    <div key={k.etiqueta} className={`p-5 sm:p-7 ${i % 2 ? "border-l border-linea" : ""} ${i > 1 ? "border-t border-linea lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}>
                      <div className="text-xs text-gris">{k.etiqueta}</div>
                      <Contador valor={k.valor} formato={k.formato} className="cifra mt-2.5 block text-xl font-semibold sm:text-[1.75rem]" />
                    </div>
                  ))}
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="tarjeta p-6 sm:p-7">
                    <h3 className="font-semibold">Ranking para este cliente</h3>
                    <p className="mb-6 mt-1 text-xs text-gris">Puntuación de 0 a 100. Toca un carro para verlo.</p>
                    <Ranking productos={productos} insights={insightsPorId} onSeleccionar={setFichaId} />
                  </div>
                  <div className="tarjeta p-6 sm:p-7">
                    <h3 className="font-semibold">Precio frente al mercado</h3>
                    <p className="mb-6 mt-1 text-xs text-gris">Diferencia con el promedio de su segmento en {mercado?.ciudad ?? entrada.ciudad}.</p>
                    <BarrasMercado productos={productosOrdenados} insights={insightsPorId} />
                  </div>
                </div>
                <div className="tarjeta p-6 sm:p-7">
                  <h3 className="font-semibold">Mapa de valor: precio frente a kilometraje</h3>
                  <p className="mb-5 mt-1 text-xs text-gris">El punto rojo es el recomendado.</p>
                  <MapaValor productos={productos} destacadoId={recomendado?.id ?? null} />
                  {productos.filter((p) => p.atributos.some((a) => a.clave === "Kilometraje" && a.valor !== "Sin dato")).length < 2 && (
                    <p className="text-sm text-gris">Se necesitan al menos 2 carros con kilometraje conocido.</p>
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
                  <div key={i} className="tarjeta grid grid-cols-[2rem_1fr] gap-3 p-6">
                    <span className="cifra text-sm font-semibold text-gris-claro">{puesto(i)}</span>
                    <div>
                      <div className="font-medium">{q.pregunta}</div>
                      <p className="mt-1.5 text-sm leading-relaxed text-gris">{q.porQue}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Seccion>
        )}

        {/* ── Seguimiento (se guarda solo) ── */}
        <Seccion etiqueta="Seguimiento" titulo={`Atención de ${cliente?.nombre ?? "este cliente"}`} ayuda="La etapa y las notas se guardan automáticamente.">
          <div className="tarjeta grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <div className="mb-3 text-sm font-medium">Etapa</div>
              <div className="flex flex-wrap gap-2">
                {ETAPAS.map((e) => (
                  <button key={e.id} type="button" aria-pressed={etapa === e.id} onClick={() => cambiarEtapa(e.id)} className="chip">
                    {e.label}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-xs text-gris">
                Etapa actual: <span className="text-tinta">{etapaLabel(etapa)}</span>
              </p>
            </div>
            <div>
              <label htmlFor="notas" className="mb-3 block text-sm font-medium">
                Notas
              </label>
              <textarea
                id="notas"
                rows={4}
                className="campo resize-y"
                placeholder="Ej. Quiere ver la CX-5 el sábado. Pidió simulación de crédito a 48 meses."
                value={notas}
                onChange={(e) => cambiarNotas(e.target.value)}
              />
              <div className="mt-2">
                <IndicadorGuardado estado={guardado} onReintentar={() => void reintentar()} />
              </div>
            </div>
          </div>
        </Seccion>

        {avisos.length > 0 && (
          <details className="tarjeta p-6 text-sm">
            <summary className="flex cursor-pointer items-center gap-2 font-medium">
              <ScanSearch className="h-4 w-4 text-gris" strokeWidth={1.5} /> Avisos del análisis ({avisos.length})
            </summary>
            <ul className="mt-4 space-y-1.5 text-gris">
              {avisos.map((a, i) => (
                <li key={i} className={a.nivel === "error" ? "text-rojo" : ""}>
                  {a.texto}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <footer className="border-t border-linea bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 sm:px-8">
          <Marca conLema={false} />
          <p className="text-xs text-gris">Datos tomados de las fuentes indicadas. Lo que no se encontró aparece como “Sin dato”.</p>
        </div>
      </footer>

      {fichaId && (
        <VistaPrevia productos={productosOrdenados} insights={insightsPorId} id={fichaId} onCambiar={setFichaId} onCerrar={() => setFichaId(null)} onComparar={compararModelo} />
      )}
    </main>
  );
}
