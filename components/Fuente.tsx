import type { Producto } from "@/lib/schemas";

export function codigoFuente(f: Producto["fuente"]): string {
  if (f.tipo === "enlace") return `E${f.indice}`;
  if (f.tipo === "texto") return "TX";
  return "XL";
}

/** Indicador pequeño de qué fuente salió un dato. */
export default function Fuente({ fuente, conTexto = false, oscuro = false }: { fuente: Producto["fuente"]; conTexto?: boolean; oscuro?: boolean }) {
  const contenido = (
    <>
      <span className={`cifra rounded px-1.5 py-0.5 text-[0.62rem] font-bold ${oscuro ? "bg-white/90 text-tinta" : "bg-tinta text-white"}`}>
        {codigoFuente(fuente)}
      </span>
      {conTexto && <span className="truncate text-[0.72rem] text-gris">{fuente.etiqueta}</span>}
    </>
  );
  const clase = "inline-flex max-w-full items-center gap-1.5 align-middle";
  return fuente.url ? (
    <a href={fuente.url} target="_blank" rel="noreferrer" title={`Fuente: ${fuente.etiqueta}`} className={`${clase} hover:opacity-80`}>
      {contenido}
    </a>
  ) : (
    <span title={`Fuente: ${fuente.etiqueta}`} className={clase}>
      {contenido}
    </span>
  );
}

export function SinDato() {
  return <span className="text-sm text-gris/80">Sin dato</span>;
}
