"use client";

import { formatoMoneda } from "@/lib/format";
import type { InsightProducto, Producto } from "@/lib/schemas";
import AnilloPuntuacion from "./AnilloPuntuacion";
import FotoProducto from "./FotoProducto";
import Fuente, { SinDato } from "./Fuente";
import InsigniaMercado from "./InsigniaMercado";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Las 3 especificaciones que más pesan al comprar un carro, si existen. */
export function specsClave(p: Producto): { clave: string; valor: string }[] {
  const prioridad = ["ano", "kilometraje", "transmision", "motor", "combustible", "carroceria"];
  const out: { clave: string; valor: string }[] = [];
  for (const k of prioridad) {
    const a = p.atributos.find((x) => norm(x.clave) === k);
    if (a) out.push(a);
    if (out.length === 3) break;
  }
  return out;
}

export default function TarjetaProducto({
  producto,
  insight,
  posicion,
  destacado,
}: {
  producto: Producto;
  insight: InsightProducto | undefined;
  posicion: number;
  destacado: boolean;
}) {
  const specs = specsClave(producto);
  const resto = producto.atributos.filter((a) => !specs.includes(a)).slice(0, 6);

  return (
    <article className="tarjeta entrar flex flex-col overflow-hidden" style={{ animationDelay: `${Math.min(posicion, 6) * 80}ms` }}>
      <div className="relative">
        <FotoProducto imagenes={producto.imagenes} alt={producto.nombre} className="aspect-[16/10] w-full" prioridad={posicion < 3} />
        {destacado && <div className="etiqueta absolute left-0 top-4 bg-rojo px-3 py-1.5 !text-[0.62rem] text-white">Recomendado</div>}
        <div className="absolute right-3 top-3">
          <Fuente fuente={producto.fuente} oscuro />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="cifra text-lg font-semibold leading-snug">{producto.nombre}</h3>
            <div className="cifra mt-2 text-[1.7rem] font-bold leading-none">
              {producto.precio !== null ? formatoMoneda(producto.precio, producto.moneda) : <SinDato />}
            </div>
          </div>
          <AnilloPuntuacion valor={insight ? insight.puntuacion : null} tamaño={72} />
        </div>

        <div className="mt-4">
          <InsigniaMercado dato={insight?.precioVsMercado} />
        </div>

        {specs.length > 0 && (
          <dl className="mt-6 grid grid-cols-3 divide-x divide-linea border-y border-linea py-4">
            {specs.map((s) => (
              <div key={s.clave} className="min-w-0 px-3 text-center first:pl-0 last:pr-0">
                <dd className="cifra break-words text-[0.95rem] font-bold leading-tight" title={s.valor}>
                  {s.valor}
                </dd>
                <dt className="mt-1 text-[0.7rem] text-gris">{s.clave}</dt>
              </div>
            ))}
          </dl>
        )}

        {resto.length > 0 && (
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {resto.map((a) => (
              <div key={a.clave} className="flex min-w-0 justify-between gap-2 border-b border-niebla pb-1.5">
                <dt className="shrink-0 text-gris">{a.clave}</dt>
                <dd className="truncate text-right font-medium" title={a.valor}>
                  {a.valor}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {producto.atributos.length === 0 && <p className="mt-4 text-sm text-gris">Características: Sin dato</p>}

        {insight && (
          <div className="mt-6 space-y-4">
            <div className="rounded-[10px] bg-niebla p-4">
              <div className="etiqueta !text-[0.6rem] text-gris">Ideal para</div>
              <p className="mt-1.5 text-sm font-medium leading-relaxed">{insight.idealPara}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ul className="space-y-2 text-sm">
                {insight.pros.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="mt-[3px] h-3.5 w-3.5 shrink-0 rounded-full bg-verde/15 text-center text-[0.6rem] font-bold leading-[0.9rem] text-verde">+</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <ul className="space-y-2 text-sm">
                {insight.contras.map((c) => (
                  <li key={c} className="flex gap-2">
                    <span className="mt-[3px] h-3.5 w-3.5 shrink-0 rounded-full bg-rojo/10 text-center text-[0.6rem] font-bold leading-[0.9rem] text-rojo">–</span>
                    <span className="text-gris">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {producto.enlace && (
          <a
            href={producto.enlace}
            target="_blank"
            rel="noreferrer"
            className="etiqueta mt-auto inline-flex items-center gap-1 pt-6 !text-[0.62rem] text-tinta hover:text-rojo"
          >
            Ver publicación original ↗
          </a>
        )}
      </div>
    </article>
  );
}
