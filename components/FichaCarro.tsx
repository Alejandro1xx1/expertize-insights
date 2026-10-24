"use client";

import { useEffect, useState } from "react";
import { formatoMoneda } from "@/lib/format";
import { marcaDe } from "@/lib/numeros";
import { ROJO } from "@/lib/paleta";
import { DIMENSIONES, type InsightProducto, type Producto } from "@/lib/schemas";
import AnilloPuntuacion from "./AnilloPuntuacion";
import FotoProducto from "./FotoProducto";
import Fuente, { SinDato } from "./Fuente";
import Contador from "./graficas/Contador";
import Radar from "./graficas/Radar";
import Icono from "./Iconos";
import InsigniaMercado from "./InsigniaMercado";
import { specsClave } from "./TarjetaProducto";

const ICONO_DIMENSION: Record<string, string> = {
  seguridad: "airbags",
  confort: "carroceria",
  desempeno: "potencia",
  eficiencia: "consumo",
  tecnologia: "puntuacion",
  calidadPrecio: "precio",
};

function Miniatura({ src, activa, onClick }: { src: string; activa: boolean; onClick: () => void }) {
  const [error, setError] = useState(false);
  if (error) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 ${activa ? "border-tinta" : "border-transparent opacity-70 hover:opacity-100"}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setError(true)} className="h-full w-full object-cover" />
    </button>
  );
}

/** Ficha completa de un carro: galería, especificaciones, radar de características y análisis. */
export default function FichaCarro({
  producto,
  insight,
  onCerrar,
  onComparar,
}: {
  producto: Producto;
  insight: InsightProducto | undefined;
  onCerrar: () => void;
  onComparar: (id: string) => void;
}) {
  const [foto, setFoto] = useState(0);
  const specs = specsClave(producto);
  const imagenes = [...producto.imagenes.slice(foto), ...producto.imagenes.slice(0, foto)];

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-niebla" role="dialog" aria-modal="true" aria-label={producto.nombre}>
      <div className="sticky top-0 z-10 border-b border-linea bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
          <button onClick={onCerrar} className="flex items-center gap-2 text-sm font-medium text-gris hover:text-tinta">
            ← Volver a resultados
          </button>
          <Fuente fuente={producto.fuente} conTexto />
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-8 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          {/* galería */}
          <div className="entrar">
            <div className="tarjeta overflow-hidden p-2">
              <FotoProducto
                key={foto}
                imagenes={imagenes}
                alt={producto.nombre}
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="aspect-[16/10] w-full rounded-[10px]"
                prioridad
              />
            </div>
            {producto.imagenes.length > 1 && (
              <div className="scroll-fino mt-3 flex gap-2 overflow-x-auto pb-1">
                {producto.imagenes.map((src, i) => (
                  <Miniatura key={src} src={src} activa={i === foto} onClick={() => setFoto(i)} />
                ))}
              </div>
            )}
          </div>

          {/* datos principales */}
          <div className="entrar space-y-5" style={{ animationDelay: "100ms" }}>
            <div>
              <div className="etiqueta text-gris">{marcaDe(producto.nombre)}</div>
              <h1 className="titulo mt-2 text-3xl sm:text-4xl">{producto.nombre}</h1>
            </div>
            {insight?.titular && (
              <div className="border-l-4 border-rojo bg-white px-4 py-3 text-[0.95rem] font-medium">{insight.titular}</div>
            )}
            <div className="flex flex-wrap items-end gap-4">
              <div className="cifra text-4xl font-bold">
                {producto.precio !== null ? formatoMoneda(producto.precio, producto.moneda) : <SinDato />}
              </div>
              <InsigniaMercado dato={insight?.precioVsMercado} />
            </div>
            {insight?.precioVsMercado.referencia && <p className="text-sm text-gris">{insight.precioVsMercado.referencia}</p>}

            <div className="flex flex-wrap gap-3">
              {producto.enlace && (
                <a href={producto.enlace} target="_blank" rel="noreferrer" className="etiqueta rounded-[10px] bg-tinta px-6 py-3.5 !text-[0.65rem] text-white hover:bg-black">
                  Ver publicación ↗
                </a>
              )}
              <button
                type="button"
                onClick={() => onComparar(producto.id)}
                className="boton-borde px-6 py-3.5 text-[0.65rem] text-tinta hover:bg-tinta hover:text-white"
              >
                Comparar este modelo
              </button>
            </div>

            {specs.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {specs.map((s) => (
                  <div key={s.clave} className="tarjeta flex flex-col items-center gap-1.5 p-4 text-center">
                    <Icono nombre={s.clave} className="h-5 w-5 text-rojo" />
                    <div className="etiqueta !text-[0.55rem] text-gris">{s.clave}</div>
                    <div className="cifra text-sm font-bold leading-tight sm:text-base">{s.valor}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="tarjeta p-5">
              <h2 className="cifra mb-3 font-bold">Especificaciones</h2>
              {producto.atributos.length ? (
                <dl className="grid gap-x-8 sm:grid-cols-2">
                  {producto.atributos.map((a) => (
                    <div key={a.clave} className="flex items-center justify-between gap-3 border-b border-niebla py-2.5 text-sm">
                      <dt className="flex items-center gap-2 text-gris">
                        <Icono nombre={a.clave} />
                        {a.clave}
                      </dt>
                      <dd className="text-right font-semibold">{a.valor}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <SinDato />
              )}
            </div>
          </div>
        </div>

        {insight && (
          <>
            <section className="tarjeta entrar grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <h2 className="cifra text-lg font-bold">Análisis de características</h2>
                  <AnilloPuntuacion valor={insight.puntuacion} tamaño={64} />
                </div>
                <p className="mt-1 text-xs text-gris">Evaluación estimada de 1 a 10 según la ficha y el modelo.</p>
                <div className="mt-4">
                  <Radar
                    ejes={DIMENSIONES.map((d) => d.label)}
                    series={[{ id: producto.id, nombre: producto.nombre, color: ROJO, valores: DIMENSIONES.map((d) => insight.dimensiones[d.id]) }]}
                    tamaño={340}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {DIMENSIONES.map((d) => (
                  <div key={d.id} className="rounded-[12px] border border-linea p-4">
                    <Icono nombre={ICONO_DIMENSION[d.id]} className="h-5 w-5 text-gris" />
                    <div className="mt-2 text-xs font-semibold">{d.label}</div>
                    <div className="mt-1">
                      <Contador valor={insight.dimensiones[d.id]} className="cifra text-2xl font-bold" />
                      <span className="text-xs text-gris"> /10</span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-niebla">
                      <div className="barra-llenado h-full rounded-full bg-tinta" style={{ width: `${insight.dimensiones[d.id] * 10}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="entrar flex gap-4 rounded-[14px] bg-white p-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-niebla">
                <Icono nombre="ideal" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="cifra font-bold">Perfil ideal</h2>
                <p className="mt-1 text-gris">{insight.idealPara}</p>
              </div>
            </section>

            <div className="grid gap-5 md:grid-cols-2">
              <section className="tarjeta entrar p-6">
                <h2 className="cifra flex items-center gap-2 font-bold text-verde">✓ Ventajas destacadas</h2>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {insight.pros.map((p) => (
                    <li key={p} className="flex gap-2.5">
                      <span className="text-verde">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </section>
              <section className="tarjeta entrar p-6" style={{ animationDelay: "80ms" }}>
                <h2 className="cifra flex items-center gap-2 font-bold text-rojo">✕ Puntos de mejora</h2>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {insight.contras.map((c) => (
                    <li key={c} className="flex gap-2.5">
                      <span className="text-rojo">✕</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
