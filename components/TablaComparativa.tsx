"use client";

import { formatoMoneda } from "@/lib/format";
import type { InsightProducto, Producto } from "@/lib/schemas";
import { colorPuntuacion } from "./AnilloPuntuacion";
import FotoProducto from "./FotoProducto";
import Fuente, { SinDato } from "./Fuente";
import InsigniaMercado from "./InsigniaMercado";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Une las claves de atributos de todos los productos, ordenadas por cuántos productos las tienen. */
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
    .slice(0, 18)
    .map(([clave, v]) => ({ clave, etiqueta: v.etiqueta }));
}

export default function TablaComparativa({
  productos,
  insights,
  esperandoInsights,
}: {
  productos: Producto[];
  insights: Map<string, InsightProducto>;
  esperandoInsights: boolean;
}) {
  const filas = filasAtributos(productos);
  const celda = "border-b border-borde/60 px-4 py-3 align-top";
  const encabezado = `${celda} sticky left-0 z-10 bg-[#0a0e15] text-left etiqueta !text-tenue whitespace-nowrap`;

  return (
    <div className="vidrio entrar overflow-hidden">
      <div className="scroll-fino overflow-x-auto">
        <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className={`${encabezado} min-w-32`}>Producto</th>
              {productos.map((p) => (
                <th key={p.id} className={`${celda} w-60 min-w-52 max-w-64 text-left font-normal`}>
                  <FotoProducto imagenes={p.imagenes} alt={p.nombre} sizes="240px" className="mb-3 aspect-[4/3] w-full rounded-lg" />
                  <div className="flex items-start gap-2">
                    <Fuente fuente={p.fuente} />
                    <span className="font-titulo font-semibold leading-snug">{p.nombre}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className={encabezado}>Precio</th>
              {productos.map((p) => (
                <td key={p.id} className={`${celda} font-titulo text-base font-bold text-cian`}>
                  {p.precio !== null ? formatoMoneda(p.precio, p.moneda) : <SinDato />}
                </td>
              ))}
            </tr>
            <tr>
              <th className={encabezado}>Vs. mercado</th>
              {productos.map((p) => (
                <td key={p.id} className={celda}>
                  <InsigniaMercado dato={insights.get(p.id)?.precioVsMercado} cargando={esperandoInsights} />
                </td>
              ))}
            </tr>
            <tr>
              <th className={encabezado}>Puntuación</th>
              {productos.map((p) => {
                const ins = insights.get(p.id);
                return (
                  <td key={p.id} className={celda}>
                    {ins ? (
                      <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="barra-llenado h-full rounded-full"
                            style={{ width: `${ins.puntuacion}%`, background: colorPuntuacion(ins.puntuacion), boxShadow: `0 0 10px ${colorPuntuacion(ins.puntuacion)}` }}
                          />
                        </div>
                        <span className="font-titulo font-bold tabular-nums" style={{ color: colorPuntuacion(ins.puntuacion) }}>
                          {ins.puntuacion}
                        </span>
                      </div>
                    ) : (
                      <div className={`h-2 rounded-full bg-white/10 ${esperandoInsights ? "escaneo" : ""}`} />
                    )}
                  </td>
                );
              })}
            </tr>
            {filas.map((f) => (
              <tr key={f.clave}>
                <th className={encabezado}>{f.etiqueta}</th>
                {productos.map((p) => {
                  const a = p.atributos.find((x) => norm(x.clave) === f.clave);
                  return (
                    <td key={p.id} className={`${celda} max-w-64`}>
                      {a ? <span className="break-words">{a.valor}</span> : <SinDato />}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <th className={encabezado}>Ideal para</th>
              {productos.map((p) => (
                <td key={p.id} className={`${celda} max-w-64 text-[#dfe7ec]`}>
                  {insights.get(p.id)?.idealPara ?? (esperandoInsights ? <span className="text-tenue">…</span> : <SinDato />)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="border-t border-borde px-4 py-2.5 font-mono text-[0.7rem] text-tenue">
        Cada columna indica su fuente (E1 = Enlace 1, TX = texto pegado, XL = inventario). Los datos no encontrados se muestran como “Sin dato”.
      </p>
    </div>
  );
}
