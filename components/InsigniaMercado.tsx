import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { PrecioVsMercado } from "@/lib/schemas";

/** Posición del precio frente al promedio del mercado. Color solo cuando aporta. */
export default function InsigniaMercado({ dato }: { dato: PrecioVsMercado | undefined }) {
  if (!dato || dato.estado === "sin-dato") {
    return <span className="inline-flex items-center rounded-full bg-hueso px-2.5 py-1 text-xs text-gris">Vs. mercado: sin dato</span>;
  }
  const estilos = {
    oportunidad: { clase: "bg-champan/12 text-champan-oscuro", Icono: TrendingDown },
    "en-linea": { clase: "bg-hueso text-gris", Icono: Minus },
    "por-encima": { clase: "bg-rojo/[.07] text-rojo-oscuro", Icono: TrendingUp },
  }[dato.estado];
  return (
    <span title={dato.referencia ?? undefined} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${estilos.clase}`}>
      <estilos.Icono className="h-3.5 w-3.5" strokeWidth={1.75} />
      {dato.etiqueta}
    </span>
  );
}
