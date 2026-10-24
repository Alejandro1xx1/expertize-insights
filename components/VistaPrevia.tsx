"use client";

import { useEffect, useState } from "react";
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
import { medalla, specsClave } from "./TarjetaCarro";

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6" onClick={onCerrar} role="dialog" aria-modal="true" aria-label={producto.nombre}>
      <div
        className="entrar relative flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[18px] bg-white sm:rounded-[18px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* barra superior */}
        <div className="flex items-center justify-between gap-3 border-b border-linea px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="text-lg">{medalla(posicion)}</span>
            <span className="cifra font-bold">#{posicion + 1}</span>
            <span className="text-gris">de {productos.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!anterior}
              onClick={() => anterior && onCambiar(anterior.id)}
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-niebla disabled:opacity-30"
              aria-label="Carro anterior"
            >
              ← <span className="hidden sm:inline">Anterior</span>
            </button>
            <button
              type="button"
              disabled={!siguiente}
              onClick={() => siguiente && onCambiar(siguiente.id)}
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-niebla disabled:opacity-30"
              aria-label="Carro siguiente"
            >
              <span className="hidden sm:inline">Siguiente</span> →
            </button>
            <button type="button" onClick={onCerrar} className="ml-1 rounded-md px-3 py-2 text-lg leading-none hover:bg-niebla" aria-label="Cerrar">
              ✕
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
                <h2 className="titulo mt-2 text-2xl sm:text-3xl">{producto.nombre}</h2>
                {insight?.titular && <p className="mt-3 border-l-4 border-rojo pl-3 font-medium leading-snug">✨ {insight.titular}</p>}
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="cifra text-3xl font-bold sm:text-4xl">
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
                  <div key={s.clave} className="rounded-[12px] bg-niebla p-3 text-center">
                    <Icono nombre={s.clave} className="mx-auto h-5 w-5 text-rojo" />
                    <div className="cifra mt-1.5 text-sm font-bold leading-tight">{s.valor}</div>
                    <div className="mt-0.5 text-[0.68rem] text-gris">{s.clave}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {producto.enlace && (
                  <a href={producto.enlace} target="_blank" rel="noreferrer" className="etiqueta rounded-[10px] bg-tinta px-5 py-3 !text-[0.62rem] text-white hover:bg-black">
                    🔗 Ver publicación
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => onComparar(producto.id)}
                  className="boton-borde px-5 py-3 text-[0.62rem] text-tinta hover:bg-tinta hover:text-white"
                >
                  ⚖️ Comparar
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-t border-linea p-4 sm:p-6 lg:grid-cols-3">
            {insight && (
              <>
                <section className="rounded-[14px] bg-niebla p-5">
                  <h3 className="cifra font-bold">👤 Perfil ideal</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gris">{insight.idealPara}</p>
                </section>
                <section className="rounded-[14px] border border-linea p-5">
                  <h3 className="cifra font-bold text-verde">✅ A favor</h3>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {insight.pros.map((p) => (
                      <li key={p}>• {p}</li>
                    ))}
                  </ul>
                </section>
                <section className="rounded-[14px] border border-linea p-5">
                  <h3 className="cifra font-bold text-rojo">⚠️ A tener en cuenta</h3>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {insight.contras.map((c) => (
                      <li key={c}>• {c}</li>
                    ))}
                  </ul>
                </section>
              </>
            )}
          </div>

          <div className="grid gap-6 border-t border-linea p-4 sm:p-6 lg:grid-cols-2">
            <section>
              <div className="flex items-center justify-between">
                <h3 className="cifra font-bold">📋 Especificaciones</h3>
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
                <div className="mt-4 rounded-[10px] border border-champan/40 bg-champan/10 p-3 text-xs text-champan-oscuro">
                  <div className="font-semibold">🔎 Datos a revisar</div>
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
                <h3 className="cifra font-bold">📊 Análisis de características</h3>
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
