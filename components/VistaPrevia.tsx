"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, BarChart3, Check, ExternalLink, ListChecks, Scale, ScanSearch, User, X } from "lucide-react";
import { formatoMoneda } from "@/lib/format";
import { marcaDe } from "@/lib/numeros";
import { ROJO } from "@/lib/paleta";
import { DIMENSIONES, type InsightProducto, type Producto } from "@/lib/schemas";
import AnilloPuntuacion from "./AnilloPuntuacion";
import Carrusel from "./Carrusel";
import Fuente, { SinDato } from "./Fuente";
import Radar from "./graficas/Radar";
import Icono from "./Iconos";
import InsigniaMercado from "./InsigniaMercado";
import { puesto, specsClave } from "./TarjetaCarro";

/** Vista previa de un carro: carrusel de fotos, datos, insights y radar. Se navega entre carros. */
export default function VistaPrevia({
  productos,
  insights,
  id,
  onCambiar,
  onCerrar,
  onComparar,
}: {
  productos: Producto[];
  insights: Map<string, InsightProducto>;
  id: string;
  onCambiar: (id: string) => void;
  onCerrar: () => void;
  onComparar: (id: string) => void;
}) {
  const posicion = productos.findIndex((p) => p.id === id);
  const producto = productos[posicion];
  const insight = insights.get(id);
  const [todas, setTodas] = useState(false);

  useEffect(() => {
    const teclas = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", teclas);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", teclas);
      document.body.style.overflow = "";
    };
  }, [onCerrar]);

  useEffect(() => setTodas(false), [id]);

  if (!producto) return null;
  const specs = specsClave(producto);
  const anterior = productos[posicion - 1];
  const siguiente = productos[posicion + 1];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[2px] sm:items-center sm:p-6" onClick={onCerrar} role="dialog" aria-modal="true" aria-label={producto.nombre}>
      <div
        className="entrar relative flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[var(--radius-xl)] bg-white shadow-3 sm:rounded-[var(--radius-xl)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* barra superior */}
        <div className="flex items-center justify-between gap-3 border-b border-linea px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="cifra rounded-full bg-tinta px-2.5 py-1 text-xs font-semibold text-white">{puesto(posicion)}</span>
            <span className="text-gris">de {productos.length}</span>
            {posicion === 0 && insight && <span className="rounded-full bg-rojo px-2.5 py-1 text-[0.68rem] font-semibold text-white">Recomendado</span>}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!anterior}
              onClick={() => anterior && onCambiar(anterior.id)}
              className="btn btn-fantasma btn-sm disabled:opacity-30"
              aria-label="Carro anterior"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> <span className="hidden sm:inline">Anterior</span>
            </button>
            <button
              type="button"
              disabled={!siguiente}
              onClick={() => siguiente && onCambiar(siguiente.id)}
              className="btn btn-fantasma btn-sm disabled:opacity-30"
              aria-label="Carro siguiente"
            >
              <span className="hidden sm:inline">Siguiente</span> <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button type="button" onClick={onCerrar} className="btn btn-fantasma btn-sm ml-1" aria-label="Cerrar">
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto">
          <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1.25fr_1fr] lg:gap-8">
            <Carrusel key={producto.id} imagenes={producto.imagenes} alt={producto.nombre} />

            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="etiqueta text-gris">{marcaDe(producto.nombre)}</div>
                  <Fuente fuente={producto.fuente} />
                </div>
                <h2 className="titulo mt-2 text-2xl sm:text-[2rem]">{producto.nombre}</h2>
                {insight?.titular && <p className="mt-3 border-l-2 border-rojo pl-3 font-medium leading-snug text-tinta">{insight.titular}</p>}
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="cifra text-3xl font-semibold sm:text-4xl">
                    {producto.precio !== null ? formatoMoneda(producto.precio, producto.moneda) : <SinDato />}
                  </div>
                  <div className="mt-2">
                    <InsigniaMercado dato={insight?.precioVsMercado} />
                  </div>
                </div>
                <AnilloPuntuacion valor={insight?.puntuacion ?? null} tamaño={76} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {specs.map((s) => (
                  <div key={s.clave} className="rounded-[var(--radius-md)] border border-linea p-3 text-center">
                    <Icono nombre={s.clave} className="mx-auto h-4 w-4 text-gris-claro" />
                    <div className="cifra mt-1.5 text-sm font-semibold leading-tight">{s.valor}</div>
                    <div className="mt-0.5 text-[0.68rem] text-gris">{s.clave}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {producto.enlace && (
                  <a href={producto.enlace} target="_blank" rel="noreferrer" className="btn btn-oscuro">
                    <ExternalLink className="h-4 w-4" strokeWidth={1.5} /> Ver publicación
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => onComparar(producto.id)}
                  className="btn btn-secundario"
                >
                  <Scale className="h-4 w-4" strokeWidth={1.5} /> Comparar
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-t border-linea p-4 sm:p-6 lg:grid-cols-3">
            {insight && (
              <>
                <section className="rounded-[var(--radius-lg)] bg-niebla p-5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold"><User className="h-4 w-4 text-gris" strokeWidth={1.5} /> Perfil ideal</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gris">{insight.idealPara}</p>
                </section>
                <section className="rounded-[var(--radius-lg)] border border-linea p-5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold"><Check className="h-4 w-4 text-verde" strokeWidth={2} /> A favor</h3>
                  <ul className="mt-3 space-y-2 text-sm text-gris">
                    {insight.pros.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </section>
                <section className="rounded-[var(--radius-lg)] border border-linea p-5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-champan" strokeWidth={1.75} /> A tener en cuenta</h3>
                  <ul className="mt-3 space-y-2 text-sm text-gris">
                    {insight.contras.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </section>
              </>
            )}
          </div>

          <div className="grid gap-6 border-t border-linea p-4 sm:p-6 lg:grid-cols-2">
            <section>
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><ListChecks className="h-4 w-4 text-gris" strokeWidth={1.5} /> Especificaciones</h3>
                {producto.atributos.length > 8 && (
                  <button type="button" onClick={() => setTodas((t) => !t)} className="text-xs font-semibold text-rojo">
                    {todas ? "Ver menos" : `Ver todas (${producto.atributos.length})`}
                  </button>
                )}
              </div>
              <dl className="mt-3">
                {(todas ? producto.atributos : producto.atributos.slice(0, 8)).map((a) => (
                  <div key={a.clave} className="flex items-center justify-between gap-3 border-b border-niebla py-2.5 text-sm">
                    <dt className="flex items-center gap-2 text-gris">
                      <Icono nombre={a.clave} />
                      {a.clave}
                    </dt>
                    <dd className={`text-right font-semibold ${a.valor === "Sin dato" ? "font-normal text-gris" : ""}`}>{a.valor}</dd>
                  </div>
                ))}
              </dl>
              {producto.alertas.length > 0 && (
                <div className="mt-4 rounded-[var(--radius-md)] border border-champan/30 bg-champan/[.06] p-3 text-xs text-champan-oscuro">
                  <div className="flex items-center gap-1.5 font-semibold"><ScanSearch className="h-3.5 w-3.5" strokeWidth={1.75} /> Datos a revisar</div>
                  <ul className="mt-1 space-y-0.5">
                    {producto.alertas.map((a) => (
                      <li key={a}>• {a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
            {insight && (
              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold"><BarChart3 className="h-4 w-4 text-gris" strokeWidth={1.5} /> Análisis de características</h3>
                <p className="text-xs text-gris">Evaluación estimada de 1 a 10.</p>
                <Radar
                  ejes={DIMENSIONES.map((d) => d.label)}
                  series={[{ id: producto.id, nombre: producto.nombre, color: ROJO, valores: DIMENSIONES.map((d) => insight.dimensiones[d.id]) }]}
                  tamaño={320}
                />
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
