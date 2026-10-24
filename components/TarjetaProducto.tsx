"use client";

import { formatoMoneda } from "@/lib/format";
import type { InsightProducto, Producto } from "@/lib/schemas";
import AnilloPuntuacion from "./AnilloPuntuacion";
import FotoProducto from "./FotoProducto";
import Fuente, { SinDato } from "./Fuente";
import InsigniaMercado from "./InsigniaMercado";

export default function TarjetaProducto({
  producto,
  insight,
  esperandoInsights,
  posicion,
  destacado,
}: {
  producto: Producto;
  insight: InsightProducto | undefined;
  esperandoInsights: boolean;
  posicion: number;
  destacado: boolean;
}) {
  return (
    <article
      className={`vidrio entrar flex flex-col overflow-hidden ${destacado ? "vidrio-oro" : ""}`}
      style={{ animationDelay: `${Math.min(posicion, 6) * 60}ms` }}
    >
      <div className="relative">
        <FotoProducto imagenes={producto.imagenes} alt={producto.nombre} className="aspect-[4/3] w-full" prioridad={posicion < 3} />
        {destacado && (
          <div className="absolute left-3 top-3 rounded-full bg-oro px-2.5 py-1 font-titulo text-xs font-bold text-[#1a1203] shadow-[0_0_18px_rgba(212,160,23,.6)]">
            Mejor opción
          </div>
        )}
        <div className="absolute right-3 top-3 rounded-full bg-black/65 px-2 py-1 backdrop-blur">
          <Fuente fuente={producto.fuente} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold leading-snug">{producto.nombre}</h3>
            <div className="mt-1.5 font-titulo text-2xl font-bold text-cian">
              {producto.precio !== null ? formatoMoneda(producto.precio, producto.moneda) : <SinDato />}
            </div>
          </div>
          <AnilloPuntuacion valor={insight ? insight.puntuacion : null} tamaño={76} />
        </div>

        <InsigniaMercado dato={insight?.precioVsMercado} cargando={esperandoInsights} />

        {producto.atributos.length > 0 ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {producto.atributos.slice(0, 6).map((a) => (
              <div key={a.clave} className="min-w-0">
                <dt className="etiqueta !text-[0.6rem] !text-tenue">{a.clave}</dt>
                <dd className="truncate text-sm font-medium" title={a.valor}>
                  {a.valor}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-tenue">Características: Sin dato</p>
        )}

        {insight && (
          <div className="entrar space-y-3 border-t border-borde pt-4">
            <div>
              <div className="etiqueta mb-1 !text-oro-claro">Ideal para</div>
              <p className="text-sm">{insight.idealPara}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ul className="space-y-1.5 text-sm">
                {insight.pros.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="mt-0.5 text-ok">＋</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <ul className="space-y-1.5 text-sm">
                {insight.contras.map((c) => (
                  <li key={c} className="flex gap-2">
                    <span className="mt-0.5 text-peligro">－</span>
                    <span className="text-[#dfe7ec]">{c}</span>
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
            className="mt-auto inline-flex items-center gap-1 pt-1 font-mono text-xs text-cian-suave hover:text-cian"
          >
            Ver publicación original ↗
          </a>
        )}
      </div>
    </article>
  );
}
