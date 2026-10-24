"use client";

import { useMemo, useState } from "react";
import { puntuar, type Respuestas } from "@/lib/comparador";
import { formatoMoneda } from "@/lib/format";
import type { ComparadorConfig } from "@/lib/schemas";
import FotoProducto from "./FotoProducto";

/** Vista que vería el comprador final. Todo sale del JSON de configuración. */
export default function Comparador({ config }: { config: ComparadorConfig }) {
  const presupuesto = config.preguntas.find((q) => q.tipo === "presupuesto");
  const inicial = (): Respuestas =>
    presupuesto && presupuesto.tipo === "presupuesto"
      ? { [presupuesto.id]: Math.round((presupuesto.min + presupuesto.max) / 2 / presupuesto.paso) * presupuesto.paso }
      : {};
  const [paso, setPaso] = useState(-1); // -1 = portada; preguntas.length = resultados
  const [respuestas, setRespuestas] = useState<Respuestas>(inicial);
  const total = config.preguntas.length;
  const resultados = useMemo(() => puntuar(config, respuestas), [config, respuestas]);
  const brand = config.marca.colorPrincipal || "#C8102E";

  const reiniciar = () => {
    setRespuestas(inicial());
    setPaso(-1);
  };

  return (
    <div
      className="relative overflow-hidden rounded-[14px] border border-linea bg-white text-tinta shadow-[0_30px_80px_-40px_rgba(0,0,0,.4)]"
      style={{ ["--brand" as string]: brand }}
    >
      <header className="flex items-center justify-between gap-3 border-b border-linea px-5 py-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {config.marca.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.marca.logoUrl} alt={config.marca.nombre} className="h-9 w-auto max-w-32 object-contain" />
          ) : (
            <div
              className="cifra flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-lg font-bold text-white"
              style={{ background: brand }}
            >
              {config.marca.nombre.trim().charAt(0).toUpperCase() || "M"}
            </div>
          )}
          <div className="min-w-0">
            <div className="titulo truncate text-base tracking-[0.08em]">{config.marca.nombre}</div>
            {config.marca.eslogan && <div className="truncate text-xs text-gris">{config.marca.eslogan}</div>}
          </div>
        </div>
        {paso >= 0 && (
          <button onClick={reiniciar} className="shrink-0 rounded-md border border-linea px-3 py-1.5 text-sm text-gris hover:border-tinta hover:text-tinta">
            Empezar de nuevo
          </button>
        )}
      </header>

      {paso >= 0 && paso < total && (
        <div className="h-1 bg-niebla">
          <div className="h-full transition-all duration-500" style={{ width: `${((paso + 1) / total) * 100}%`, background: brand }} />
        </div>
      )}

      <div className="p-5 sm:p-8">
        {paso === -1 && (
          <div className="entrar mx-auto max-w-xl py-6 text-center">
            <h2 className="titulo text-3xl sm:text-5xl">{config.titulo}</h2>
            <p className="mt-4 text-lg text-gris">{config.subtitulo}</p>
            <p className="mt-2 text-sm text-gris">
              {total} preguntas rápidas · {config.catalogo.length} opciones disponibles
            </p>
            <button
              onClick={() => setPaso(0)}
              className="etiqueta mt-10 rounded-[10px] px-10 py-5 !text-xs text-white transition-opacity hover:opacity-90"
              style={{ background: brand }}
            >
              Encontrar mi opción ideal
            </button>
          </div>
        )}

        {paso >= 0 && paso < total && (() => {
          const q = config.preguntas[paso];
          return (
            <div key={q.id} className="entrar mx-auto max-w-2xl">
              <div className="etiqueta" style={{ color: brand }}>
                Pregunta {paso + 1} de {total}
              </div>
              <h3 className="titulo mt-3 text-2xl sm:text-3xl">{q.texto}</h3>
              {q.ayuda && <p className="mt-2 text-gris">{q.ayuda}</p>}

              {q.tipo === "presupuesto" ? (
                <div className="mt-8">
                  <div className="cifra text-center text-4xl font-bold sm:text-5xl">
                    {formatoMoneda(Number(respuestas[q.id] ?? q.max), q.moneda)}
                  </div>
                  <input
                    type="range"
                    min={q.min}
                    max={q.max}
                    step={q.paso}
                    value={Number(respuestas[q.id] ?? q.max)}
                    onChange={(e) => setRespuestas((r) => ({ ...r, [q.id]: Number(e.target.value) }))}
                    className="mt-6 w-full"
                    style={{ accentColor: brand }}
                    aria-label={q.texto}
                  />
                  <div className="cifra mt-1 flex justify-between text-xs text-gris">
                    <span>{formatoMoneda(q.min, q.moneda)}</span>
                    <span>{formatoMoneda(q.max, q.moneda)}</span>
                  </div>
                  <button
                    onClick={() => setPaso(paso + 1)}
                    className="etiqueta mt-8 w-full rounded-[10px] py-4 !text-xs text-white"
                    style={{ background: brand }}
                  >
                    Continuar
                  </button>
                </div>
              ) : (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {q.opciones.map((o) => {
                    const activa = respuestas[q.id] === o.id;
                    return (
                      <button
                        key={o.id}
                        onClick={() => {
                          setRespuestas((r) => ({ ...r, [q.id]: o.id }));
                          setTimeout(() => setPaso((p) => p + 1), 180);
                        }}
                        className="rounded-[10px] border px-5 py-4 text-left text-base font-medium transition-colors"
                        style={{
                          borderColor: activa ? brand : "#e2e2de",
                          background: activa ? `${brand}12` : "#fff",
                        }}
                      >
                        {o.etiqueta}
                      </button>
                    );
                  })}
                </div>
              )}
              {paso > 0 && (
                <button onClick={() => setPaso(paso - 1)} className="mt-5 text-sm text-gris hover:text-tinta">
                  ← Anterior
                </button>
              )}
            </div>
          );
        })()}

        {paso >= total && (
          <div className="entrar space-y-8">
            <div className="text-center">
              <div className="etiqueta" style={{ color: brand }}>
                Tus resultados
              </div>
              <h3 className="titulo mt-3 text-2xl sm:text-4xl">Tus mejores opciones</h3>
            </div>

            <ol className="space-y-4">
              {resultados.map((r, i) => (
                <li
                  key={r.producto.id}
                  className="entrar flex flex-col gap-5 rounded-[12px] border p-4 sm:flex-row"
                  style={{
                    animationDelay: `${i * 80}ms`,
                    borderColor: i === 0 ? brand : "#e2e2de",
                    background: "#fff",
                  }}
                >
                  <FotoProducto imagenes={r.producto.imagenes} alt={r.producto.nombre} sizes="(max-width: 640px) 100vw, 220px" className="aspect-[16/10] w-full shrink-0 rounded-[10px] sm:w-60" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {i === 0 && (
                          <span className="etiqueta mb-2 inline-block rounded px-2 py-1 !text-[0.58rem] text-white" style={{ background: brand }}>
                            Recomendado para ti
                          </span>
                        )}
                        <h4 className="cifra text-lg font-semibold leading-snug">{r.producto.nombre}</h4>
                        <div className="cifra mt-1 text-xl font-bold">
                          {r.producto.precio !== null ? formatoMoneda(r.producto.precio, r.producto.moneda) : <span className="text-sm font-normal text-gris">Precio: Sin dato</span>}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="cifra text-3xl font-bold" style={{ color: brand }}>
                          {r.puntaje}%
                        </div>
                        <div className="text-xs text-gris">coincidencia</div>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-niebla">
                      <div className="barra-llenado h-full rounded-full" style={{ width: `${r.puntaje}%`, background: brand }} />
                    </div>
                    {r.dentroPresupuesto !== null && (
                      <div className={`mt-2 text-sm ${r.dentroPresupuesto ? "text-verde" : "text-champan-oscuro"}`}>
                        {r.dentroPresupuesto ? "✓ Dentro de tu presupuesto" : "Por encima de tu presupuesto"}
                      </div>
                    )}
                    {r.producto.idealPara && <p className="mt-2 text-sm text-gris">Ideal para: {r.producto.idealPara}</p>}
                    {r.producto.pros.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {r.producto.pros.map((p) => (
                          <li key={p} className="rounded-full bg-niebla px-2.5 py-1 text-xs">
                            {p}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            {resultados.length > 1 && <ComparacionLadoALado resultados={resultados.slice(0, 3)} brand={brand} />}
          </div>
        )}
      </div>
    </div>
  );
}

function ComparacionLadoALado({ resultados, brand }: { resultados: ReturnType<typeof puntuar>; brand: string }) {
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const claves: string[] = [];
  const etiquetas = new Map<string, string>();
  for (const r of resultados)
    for (const a of r.producto.atributos) {
      const k = norm(a.clave);
      if (!etiquetas.has(k)) {
        etiquetas.set(k, a.clave);
        claves.push(k);
      }
    }
  return (
    <div>
      <h4 className="titulo mb-4 text-xl">Compáralos lado a lado</h4>
      <div className="scroll-fino overflow-x-auto rounded-[12px] border border-linea">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white p-3" />
              {resultados.map((r) => (
                <th key={r.producto.id} className="w-56 min-w-48 p-3 text-left font-normal">
                  <FotoProducto imagenes={r.producto.imagenes} alt={r.producto.nombre} sizes="220px" className="mb-2 aspect-[4/3] w-full rounded-lg" />
                  <div className="cifra font-semibold leading-snug">{r.producto.nombre}</div>
                  <div className="font-bold" style={{ color: brand }}>
                    {r.puntaje}% coincidencia
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-linea">
              <th className="sticky left-0 bg-white p-3 text-left text-xs font-semibold text-gris">Precio</th>
              {resultados.map((r) => (
                <td key={r.producto.id} className="p-3 font-semibold">
                  {r.producto.precio !== null ? formatoMoneda(r.producto.precio, r.producto.moneda) : <span className="text-gris">Sin dato</span>}
                </td>
              ))}
            </tr>
            {claves.slice(0, 12).map((k) => (
              <tr key={k} className="border-t border-linea">
                <th className="sticky left-0 bg-white p-3 text-left text-xs font-semibold text-gris">{etiquetas.get(k)}</th>
                {resultados.map((r) => (
                  <td key={r.producto.id} className="max-w-56 p-3">
                    {r.producto.atributos.find((a) => norm(a.clave) === k)?.valor ?? <span className="text-gris">Sin dato</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
