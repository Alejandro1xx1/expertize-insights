import type { PrecioVsMercado } from "@/lib/schemas";

export default function InsigniaMercado({ dato }: { dato: PrecioVsMercado | undefined }) {
  if (!dato || dato.estado === "sin-dato") {
    return <span className="inline-flex rounded-full border border-linea px-3 py-1 text-xs text-gris">Vs. mercado: Sin dato</span>;
  }
  const estilos: Record<Exclude<PrecioVsMercado["estado"], "sin-dato">, string> = {
    oportunidad: "bg-champan text-white",
    "en-linea": "bg-tinta/[.06] text-tinta",
    "por-encima": "bg-rojo/10 text-rojo-oscuro",
  };
  return (
    <span title={dato.referencia ?? undefined} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${estilos[dato.estado]}`}>
      {dato.estado === "oportunidad" && <span aria-hidden>★</span>}
      {dato.etiqueta}
    </span>
  );
}
