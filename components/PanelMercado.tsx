import { dominio, formatoMoneda } from "@/lib/format";
import type { Mercado } from "@/lib/schemas";

const ORIGEN: Record<Mercado["origen"], string> = {
  "cache-repositorio": "Caché del repositorio",
  "cache-memoria": "Caché en memoria",
  "en-vivo": "Investigado en vivo",
};

function rango(min: number | null, max: number | null, moneda: string) {
  if (min === null && max === null) return "Sin dato";
  if (min !== null && max !== null) return `${formatoMoneda(min, moneda)} – ${formatoMoneda(max, moneda)}`;
  return formatoMoneda((min ?? max)!, moneda);
}

export default function PanelMercado({ mercado }: { mercado: Mercado }) {
  const fecha = mercado.generadoEl ? new Date(mercado.generadoEl).toLocaleDateString("es-CO", { dateStyle: "medium" }) : null;
  return (
    <section className="vidrio entrar space-y-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="etiqueta">Mercado · {mercado.ciudad}</div>
          <p className="mt-2 max-w-3xl text-[0.95rem] leading-relaxed text-[#dfe7ec]">{mercado.resumen}</p>
        </div>
        <span className="rounded-full border border-borde px-2.5 py-1 font-mono text-[0.7rem] text-tenue">
          {ORIGEN[mercado.origen]}
          {fecha ? ` · ${fecha}` : ""}
        </span>
      </div>

      {mercado.rangosPrecio.length > 0 && (
        <div className="scroll-fino overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="etiqueta text-left !text-tenue">
                <th className="pb-2 pr-4 font-normal">Segmento</th>
                <th className="pb-2 pr-4 font-normal">Rango</th>
                <th className="pb-2 pr-4 font-normal">Promedio</th>
                <th className="pb-2 font-normal">Fuente</th>
              </tr>
            </thead>
            <tbody>
              {mercado.rangosPrecio.map((r, i) => (
                <tr key={i} className="border-t border-borde/60">
                  <td className="py-2.5 pr-4 font-medium">
                    {r.segmento}
                    {r.unidad && <span className="block text-xs text-tenue">{r.unidad}</span>}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums">{rango(r.min, r.max, r.moneda)}</td>
                  <td className="py-2.5 pr-4 font-semibold text-cian tabular-nums">
                    {r.promedio !== null ? formatoMoneda(r.promedio, r.moneda) : <span className="font-mono text-xs text-tenue">Sin dato</span>}
                  </td>
                  <td className="py-2.5 font-mono text-xs">
                    {r.fuente && /^https?:/.test(r.fuente) ? (
                      <a className="text-cian-suave hover:text-cian" href={r.fuente} target="_blank" rel="noreferrer">
                        {dominio(r.fuente)} ↗
                      </a>
                    ) : (
                      <span className="text-tenue">{r.fuente ?? "Sin dato"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="etiqueta mb-3">Factores de decisión del comprador</div>
          <ol className="space-y-2.5">
            {mercado.factoresDecision.map((f, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="font-mono text-cian">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <strong className="font-semibold">{f.factor}.</strong> <span className="text-[#cfd9df]">{f.detalle}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <div className="etiqueta mb-3">Tendencias</div>
          <ul className="space-y-2.5">
            {mercado.tendencias.map((t, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="text-oro">▲</span>
                <span>
                  <strong className="font-semibold">{t.tendencia}.</strong> <span className="text-[#cfd9df]">{t.detalle}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {mercado.fuentes.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-borde pt-4">
          <span className="etiqueta mr-1 self-center !text-tenue">Fuentes</span>
          {mercado.fuentes.slice(0, 10).map((f, i) => (
            <a
              key={i}
              href={f.url}
              target="_blank"
              rel="noreferrer"
              title={f.titulo}
              className="rounded-full border border-borde px-2.5 py-1 font-mono text-[0.7rem] text-cian-suave hover:border-cian"
            >
              {dominio(f.url)}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
