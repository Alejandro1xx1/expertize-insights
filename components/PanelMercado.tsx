import { dominio, formatoMoneda } from "@/lib/format";
import type { Mercado } from "@/lib/schemas";

const ORIGEN: Record<Mercado["origen"], string> = {
  "cache-repositorio": "Datos precargados",
  "cache-memoria": "Datos recientes",
  "en-vivo": "Investigado en vivo",
};

function millones(v: number, moneda: string) {
  if (moneda === "COP" && v >= 1_000_000) {
    const m = v / 1_000_000;
    return `$${m >= 100 ? Math.round(m) : m.toFixed(1).replace(".0", "")} M`;
  }
  return formatoMoneda(v, moneda);
}

export default function PanelMercado({ mercado }: { mercado: Mercado }) {
  const fecha = mercado.generadoEl ? new Date(mercado.generadoEl).toLocaleDateString("es-CO", { dateStyle: "medium" }) : null;
  const valores = mercado.rangosPrecio.flatMap((r) => [r.min, r.max, r.promedio]).filter((v): v is number => v !== null && v > 0);
  const escalaMin = valores.length ? Math.min(...valores) * 0.9 : 0;
  const escalaMax = valores.length ? Math.max(...valores) * 1.05 : 1;
  const pos = (v: number) => ((v - escalaMin) / (escalaMax - escalaMin)) * 100;

  return (
    <section className="tarjeta entrar overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 p-6 sm:p-8">
        <p className="max-w-3xl text-[1.05rem] leading-relaxed">{mercado.resumen}</p>
        <span className="shrink-0 rounded-full bg-niebla px-3 py-1 text-xs text-gris">
          {ORIGEN[mercado.origen]}
          {fecha ? ` · ${fecha}` : ""}
        </span>
      </div>

      {mercado.rangosPrecio.length > 0 && (
        <div className="border-t border-linea px-6 py-6 sm:px-8">
          <div className="etiqueta mb-5 !text-[0.62rem] text-gris">Rangos de precio por segmento</div>
          <ul className="space-y-5">
            {mercado.rangosPrecio.map((r, i) => {
              const tieneRango = r.min !== null && r.max !== null && valores.length > 0;
              return (
                <li key={i} className="grid gap-2 md:grid-cols-[15rem_1fr_7rem] md:items-center md:gap-6">
                  <div className="min-w-0">
                    <div className="font-semibold leading-snug">{r.segmento}</div>
                    <div className="text-xs text-gris">
                      {r.fuente && /^https?:/.test(r.fuente) ? (
                        <a className="hover:text-rojo" href={r.fuente} target="_blank" rel="noreferrer">
                          {dominio(r.fuente)}
                        </a>
                      ) : (
                        (r.fuente ?? "Fuente: Sin dato")
                      )}
                    </div>
                  </div>
                  <div className="relative h-8">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-linea" />
                    {tieneRango ? (
                      <>
                        <div
                          className="barra-llenado absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-tinta/85"
                          style={{ left: `${pos(r.min!)}%`, width: `${Math.max(1.5, pos(r.max!) - pos(r.min!))}%`, animationDelay: `${i * 80}ms` }}
                        />
                        {pos(r.max!) - pos(r.min!) > 16 ? (
                          <>
                            <span className="cifra absolute top-full -translate-y-1 text-[0.68rem] text-gris" style={{ left: `${pos(r.min!)}%` }}>
                              {millones(r.min!, r.moneda)}
                            </span>
                            <span className="cifra absolute top-full -translate-x-full -translate-y-1 text-[0.68rem] text-gris" style={{ left: `${pos(r.max!)}%` }}>
                              {millones(r.max!, r.moneda)}
                            </span>
                          </>
                        ) : (
                          <span className="cifra absolute top-full -translate-y-1 whitespace-nowrap text-[0.68rem] text-gris" style={{ left: `${Math.min(pos(r.min!), 70)}%` }}>
                            {millones(r.min!, r.moneda)} – {millones(r.max!, r.moneda)}
                          </span>
                        )}
                        {r.promedio !== null && (
                          <span
                            className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rojo"
                            style={{ left: `${pos(r.promedio)}%` }}
                            title={`Promedio: ${formatoMoneda(r.promedio, r.moneda)}`}
                          />
                        )}
                      </>
                    ) : (
                      <span className="absolute top-1/2 -translate-y-1/2 text-xs text-gris">Rango: Sin dato</span>
                    )}
                  </div>
                  <div className="cifra text-right font-bold md:text-base">
                    {r.promedio !== null ? millones(r.promedio, r.moneda) : <span className="text-sm font-normal text-gris">Sin dato</span>}
                    <div className="text-[0.65rem] font-normal text-gris">promedio</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="grid gap-px border-t border-linea bg-linea md:grid-cols-2">
        <div className="bg-white p-6 sm:p-8">
          <div className="etiqueta mb-4 !text-[0.62rem] text-gris">Qué decide la compra</div>
          <ol className="space-y-3">
            {mercado.factoresDecision.map((f, i) => (
              <li key={i} className="flex gap-4 text-sm">
                <span className="cifra font-bold text-rojo">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <strong className="font-semibold">{f.factor}.</strong> <span className="text-gris">{f.detalle}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="bg-white p-6 sm:p-8">
          <div className="etiqueta mb-4 !text-[0.62rem] text-gris">Tendencias</div>
          <ul className="space-y-3">
            {mercado.tendencias.map((t, i) => (
              <li key={i} className="flex gap-4 text-sm">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-tinta" />
                <span>
                  <strong className="font-semibold">{t.tendencia}.</strong> <span className="text-gris">{t.detalle}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {mercado.fuentes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-linea px-6 py-4 sm:px-8">
          <span className="etiqueta mr-1 !text-[0.6rem] text-gris">Fuentes</span>
          {mercado.fuentes.slice(0, 10).map((f, i) => (
            <a key={i} href={f.url} target="_blank" rel="noreferrer" title={f.titulo} className="rounded-full border border-linea px-2.5 py-1 text-xs hover:border-tinta">
              {dominio(f.url)}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
