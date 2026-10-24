"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatoMoneda } from "@/lib/format";
import { atributo, mejores, norm, numeroDe, reglaMejor } from "@/lib/numeros";
import { SERIES } from "@/lib/paleta";
import { DIMENSIONES, type InsightProducto, type Producto } from "@/lib/schemas";
import { colorPuntuacion } from "./AnilloPuntuacion";
import FotoProducto from "./FotoProducto";
import Fuente, { SinDato } from "./Fuente";
import Radar from "./graficas/Radar";
import Icono from "./Iconos";
import InsigniaMercado from "./InsigniaMercado";

const MAX_TABLA = 4;
const MAX_RADAR = SERIES.length;

/** Une las claves de atributos de los carros elegidos, ordenadas por cuántos las tienen. */
function filasAtributos(productos: Producto[]): { clave: string; etiqueta: string }[] {
  const conteo = new Map<string, { etiqueta: string; n: number; orden: number }>();
  let orden = 0;
  for (const p of productos) {
    for (const a of p.atributos) {
      const k = norm(a.clave);
      const actual = conteo.get(k);
      if (actual) actual.n++;
      else conteo.set(k, { etiqueta: a.clave, n: 1, orden: orden++ });
    }
  }
  return [...conteo.entries()]
    .sort((a, b) => b[1].n - a[1].n || a[1].orden - b[1].orden)
    .slice(0, 16)
    .map(([clave, v]) => ({ clave, etiqueta: v.etiqueta }));
}

function Mejor() {
  return <span className="etiqueta ml-1.5 rounded bg-verde/10 px-1.5 py-0.5 !text-[0.5rem] !tracking-[0.1em] text-verde">Mejor</span>;
}

export default function TablaComparativa({
  productos,
  insights,
  pedido,
  onAbrirFicha,
}: {
  productos: Producto[];
  insights: Map<string, InsightProducto>;
  /** Carro que otra parte de la pantalla pidió comparar. */
  pedido?: { id: string; n: number } | null;
  onAbrirFicha?: (id: string) => void;
}) {
  const [seleccion, setSeleccion] = useState<string[]>(() => productos.slice(0, Math.min(3, MAX_TABLA)).map((p) => p.id));
  // El color sigue al carro, no a su posición: al quitar uno, los demás conservan el suyo.
  const [colores, setColores] = useState<Record<string, number>>(() =>
    Object.fromEntries(productos.slice(0, MAX_RADAR).map((p, i) => [p.id, i])),
  );
  const [abierto, setAbierto] = useState(false);
  const ultimoPedido = useRef(0);

  const agregar = (id: string) => {
    setSeleccion((s) => (s.includes(id) ? s : [...s, id].slice(-MAX_TABLA)));
    setColores((c) => {
      if (c[id] !== undefined) return c;
      const usados = new Set(Object.values(c));
      const libre = [...Array(MAX_RADAR).keys()].find((i) => !usados.has(i));
      return libre === undefined ? c : { ...c, [id]: libre };
    });
    setAbierto(false);
  };
  const quitar = (id: string) => {
    setSeleccion((s) => s.filter((x) => x !== id));
    setColores((c) => {
      const { [id]: _quitado, ...resto } = c;
      return resto;
    });
  };

  useEffect(() => {
    if (pedido && pedido.n !== ultimoPedido.current) {
      ultimoPedido.current = pedido.n;
      agregar(pedido.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido]);

  const elegidos = seleccion.map((id) => productos.find((p) => p.id === id)).filter((p): p is Producto => !!p);
  const disponibles = productos.filter((p) => !seleccion.includes(p.id));
  const filas = useMemo(() => filasAtributos(elegidos), [elegidos]);
  const enRadar = elegidos.filter((p) => colores[p.id] !== undefined && insights.get(p.id)).slice(0, MAX_RADAR);

  const mejorPrecio = mejores(elegidos, (p) => p.precio, "min");
  const mejorPuntaje = mejores(elegidos, (p) => insights.get(p.id)?.puntuacion ?? null, "max");

  const celda = "border-b border-linea px-5 py-4 align-top";
  const encabezado = `${celda} sticky left-0 z-10 bg-white text-left whitespace-nowrap text-[0.78rem] font-semibold text-gris`;

  return (
    <div className="space-y-6">
      {/* selector de modelos */}
      <div className="tarjeta p-5">
        <div className="mb-3 text-sm font-semibold">Selecciona los modelos a comparar</div>
        <div className="flex flex-wrap items-center gap-2">
          {elegidos.map((p) => (
            <span key={p.id} className="flex max-w-full items-center gap-2 rounded-[10px] border border-linea bg-niebla py-2 pl-3 pr-2 text-sm">
              {colores[p.id] !== undefined && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SERIES[colores[p.id]] }} />}
              <span className="truncate">{p.nombre}</span>
              <button type="button" onClick={() => quitar(p.id)} aria-label={`Quitar ${p.nombre}`} className="rounded px-1.5 text-gris hover:bg-white hover:text-tinta">
                ✕
              </button>
            </span>
          ))}
          {disponibles.length > 0 && elegidos.length < MAX_TABLA && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAbierto((a) => !a)}
                className="rounded-[10px] border border-dashed border-[#c9c9c4] px-4 py-2 text-sm font-medium hover:border-tinta"
              >
                + Añadir modelo
              </button>
              {abierto && (
                <ul className="absolute left-0 top-full z-20 mt-1 max-h-64 w-72 overflow-y-auto rounded-[10px] border border-linea bg-white p-1 shadow-xl">
                  {disponibles.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => agregar(p.id)} className="w-full truncate rounded-md px-3 py-2 text-left text-sm hover:bg-niebla">
                        {p.nombre}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        {elegidos.length >= MAX_TABLA && <p className="mt-2 text-xs text-gris">Máximo {MAX_TABLA} modelos a la vez. Quita uno para añadir otro.</p>}
      </div>

      {elegidos.length === 0 ? (
        <p className="text-sm text-gris">Añade al menos un modelo para comparar.</p>
      ) : (
        <>
          {enRadar.length > 0 && (
            <div className="tarjeta grid gap-6 p-6 lg:grid-cols-[1fr_1fr] lg:items-center">
              <div>
                <h3 className="cifra text-lg font-bold">Características frente a frente</h3>
                <p className="mt-1 text-sm text-gris">Evaluación estimada de 1 a 10. Pasa el mouse por la leyenda para resaltar un modelo.</p>
                <div className="mt-5 space-y-2">
                  {DIMENSIONES.map((d) => {
                    const ganador = mejores(enRadar, (p) => insights.get(p.id)?.dimensiones[d.id] ?? null, "max");
                    return (
                      <div key={d.id} className="flex items-center justify-between gap-3 border-b border-niebla pb-2 text-sm">
                        <span className="text-gris">{d.label}</span>
                        <span className="flex gap-3">
                          {enRadar.map((p) => (
                            <span key={p.id} className={`cifra flex items-center gap-1.5 ${ganador.has(p.id) ? "font-bold text-tinta" : "text-gris"}`}>
                              <span className="h-2 w-2 rounded-full" style={{ background: SERIES[colores[p.id]] }} />
                              {insights.get(p.id)!.dimensiones[d.id]}
                            </span>
                          ))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <Radar
                ejes={DIMENSIONES.map((d) => d.label)}
                series={enRadar.map((p) => ({
                  id: p.id,
                  nombre: p.nombre,
                  color: SERIES[colores[p.id]],
                  valores: DIMENSIONES.map((d) => insights.get(p.id)!.dimensiones[d.id]),
                }))}
                tamaño={380}
              />
            </div>
          )}

          <div className="tarjeta entrar overflow-hidden">
            <div className="scroll-fino overflow-x-auto">
              <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className={`${encabezado} min-w-36 align-bottom`}>
                      <span className="etiqueta !text-[0.6rem]">Modelo</span>
                    </th>
                    {elegidos.map((p) => (
                      <th key={p.id} className={`${celda} w-64 min-w-56 max-w-72 text-left font-normal`}>
                        <button type="button" onClick={() => onAbrirFicha?.(p.id)} className="block w-full text-left">
                          <FotoProducto imagenes={p.imagenes} alt={p.nombre} sizes="280px" className="mb-4 aspect-[16/10] w-full rounded-[10px]" />
                        </button>
                        <div className="flex items-start gap-2">
                          {colores[p.id] !== undefined && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SERIES[colores[p.id]] }} />}
                          <span className="cifra font-semibold leading-snug">{p.nombre}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <Fuente fuente={p.fuente} />
                          {onAbrirFicha && (
                            <button type="button" onClick={() => onAbrirFicha(p.id)} className="text-xs font-semibold text-rojo hover:underline">
                              Ver ficha →
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th className={encabezado}>
                      <span className="flex items-center gap-2">
                        <Icono nombre="precio" /> Precio
                      </span>
                    </th>
                    {elegidos.map((p) => (
                      <td key={p.id} className={`${celda} ${mejorPrecio.has(p.id) ? "bg-verde/[.04]" : ""}`}>
                        <span className="cifra text-lg font-bold">{p.precio !== null ? formatoMoneda(p.precio, p.moneda) : <SinDato />}</span>
                        {mejorPrecio.has(p.id) && <Mejor />}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th className={encabezado}>
                      <span className="flex items-center gap-2">
                        <Icono nombre="mercado" /> Vs. mercado
                      </span>
                    </th>
                    {elegidos.map((p) => (
                      <td key={p.id} className={celda}>
                        <InsigniaMercado dato={insights.get(p.id)?.precioVsMercado} />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th className={encabezado}>
                      <span className="flex items-center gap-2">
                        <Icono nombre="puntuacion" /> Puntuación
                      </span>
                    </th>
                    {elegidos.map((p) => {
                      const ins = insights.get(p.id);
                      return (
                        <td key={p.id} className={`${celda} ${mejorPuntaje.has(p.id) ? "bg-verde/[.04]" : ""}`}>
                          {ins ? (
                            <div className="flex items-center gap-3">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-niebla">
                                <div className="barra-llenado h-full rounded-full" style={{ width: `${ins.puntuacion}%`, background: colorPuntuacion(ins.puntuacion) }} />
                              </div>
                              <span className="cifra font-bold">{ins.puntuacion}</span>
                              {mejorPuntaje.has(p.id) && <Mejor />}
                            </div>
                          ) : (
                            <SinDato />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  {filas.map((f) => {
                    const regla = reglaMejor(f.clave);
                    const ganadores = regla ? mejores(elegidos, (p) => numeroDe(atributo(p, f.clave)), regla) : new Set<string>();
                    return (
                      <tr key={f.clave}>
                        <th className={encabezado}>
                          <span className="flex items-center gap-2">
                            <Icono nombre={f.clave} /> {f.etiqueta}
                          </span>
                        </th>
                        {elegidos.map((p) => {
                          const a = p.atributos.find((x) => norm(x.clave) === f.clave);
                          const gana = ganadores.has(p.id);
                          return (
                            <td key={p.id} className={`${celda} max-w-72 ${gana ? "bg-verde/[.04]" : ""}`}>
                              {a ? <span className={`break-words ${gana ? "font-bold text-verde" : "font-medium"}`}>{a.valor}</span> : <SinDato />}
                              {gana && <Mejor />}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  <tr>
                    <th className={encabezado}>
                      <span className="flex items-center gap-2">
                        <Icono nombre="ideal" /> Ideal para
                      </span>
                    </th>
                    {elegidos.map((p) => (
                      <td key={p.id} className={`${celda} max-w-72 leading-relaxed`}>
                        {insights.get(p.id)?.idealPara ?? <SinDato />}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="bg-niebla px-5 py-3 text-xs text-gris">
              En verde, el mejor valor de cada fila (menor precio y kilometraje; mayor año, potencia y puntuación). Los datos no encontrados aparecen como
              “Sin dato”.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
