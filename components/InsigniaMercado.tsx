import type { PrecioVsMercado } from "@/lib/schemas";

export default function InsigniaMercado({ dato, cargando }: { dato: PrecioVsMercado | undefined; cargando: boolean }) {
  if (!dato) {
    return (
      <span className={`inline-flex rounded-full border border-borde px-2.5 py-1 font-mono text-[0.7rem] text-tenue ${cargando ? "escaneo" : ""}`}>
        {cargando ? "Comparando con el mercado…" : "Vs. mercado: Sin dato"}
      </span>
    );
  }
  const estilos: Record<PrecioVsMercado["estado"], string> = {
    oportunidad: "border-oro/60 bg-oro/15 text-oro-claro shadow-[0_0_14px_-4px_rgba(212,160,23,.6)]",
    "en-linea": "border-cian/40 bg-cian/10 text-cian-suave",
    "por-encima": "border-peligro/40 bg-peligro/10 text-[#ffb3bb]",
    "sin-dato": "border-borde text-tenue",
  };
  return (
    <span
      title={dato.referencia ?? undefined}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${estilos[dato.estado]}`}
    >
      {dato.estado === "oportunidad" && <span aria-hidden>★</span>}
      {dato.estado === "sin-dato" ? "Vs. mercado: Sin dato" : dato.etiqueta}
    </span>
  );
}
