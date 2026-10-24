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

/** Une las claves de atributos de todos los carros, ordenadas por cuántos las tienen. */
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
}: {
  productos: Producto[];
  insights: Map<string, InsightProducto>;
}) {
  const filas = filasAtributos(productos);
  const celda = "border-b border-linea px-5 py-4 align-top";
  const encabezado = `${celda} sticky left-0 z-10 bg-white text-left whitespace-nowrap text-[0.78rem] font-semibold text-gris`;

  return (
    <div className="tarjeta entrar overflow-hidden">
      <div className="scroll-fino overflow-x-auto">
        <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className={`${encabezado} min-w-32 align-bottom`}>
                <span className="etiqueta !text-[0.6rem]">Modelo</span>
              </th>
              {productos.map((p) => (
                <th key={p.id} className={`${celda} w-64 min-w-56 max-w-72 text-left font-normal`}>
                  <FotoProducto imagenes={p.imagenes} alt={p.nombre} sizes="280px" className="mb-4 aspect-[16/10] w-full rounded-[10px]" />
                  <div className="flex items-start gap-2">
                    <Fuente fuente={p.fuente} />
                    <span className="cifra font-semibold leading-snug">{p.nombre}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className={encabezado}>Precio</th>
              {productos.map((p) => (
                <td key={p.id} className={`${celda} cifra text-lg font-bold`}>
                  {p.precio !== null ? formatoMoneda(p.precio, p.moneda) : <SinDato />}
                </td>
              ))}
            </tr>
            <tr>
              <th className={encabezado}>Vs. mercado</th>
              {productos.map((p) => (
                <td key={p.id} className={celda}>
                  <InsigniaMercado dato={insights.get(p.id)?.precioVsMercado} />
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
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-niebla">
                          <div className="barra-llenado h-full rounded-full" style={{ width: `${ins.puntuacion}%`, background: colorPuntuacion(ins.puntuacion) }} />
                        </div>
                        <span className="cifra font-bold" style={{ color: colorPuntuacion(ins.puntuacion) }}>
                          {ins.puntuacion}
                        </span>
                      </div>
                    ) : (
                      <SinDato />
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
                    <td key={p.id} className={`${celda} max-w-72`}>
                      {a ? <span className="break-words font-medium">{a.valor}</span> : <SinDato />}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <th className={encabezado}>Ideal para</th>
              {productos.map((p) => (
                <td key={p.id} className={`${celda} max-w-72 leading-relaxed`}>
                  {insights.get(p.id)?.idealPara ?? <SinDato />}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="bg-niebla px-5 py-3 text-xs text-gris">
        Cada columna indica su fuente (E1 = Enlace 1, TX = texto pegado, XL = inventario). Los datos no encontrados se muestran como “Sin dato”.
      </p>
    </div>
  );
}
