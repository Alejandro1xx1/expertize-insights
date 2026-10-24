import type { Producto } from "@/lib/schemas";

export function codigoFuente(f: Producto["fuente"]): string {
  if (f.tipo === "enlace") return `E${f.indice}`;
  if (f.tipo === "texto") return "TX";
  return "XL";
}

/** Indicador pequeño de qué fuente salió un dato. */
export default function Fuente({ fuente, conTexto = false }: { fuente: Producto["fuente"]; conTexto?: boolean }) {
  const contenido = (
    <>
      <span className="rounded bg-cian/10 px-1 py-px font-mono text-[0.62rem] font-semibold text-cian">
        {codigoFuente(fuente)}
      </span>
      {conTexto && <span className="truncate font-mono text-[0.7rem] text-tenue">{fuente.etiqueta}</span>}
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
  return <span className="font-mono text-xs text-tenue/70">Sin dato</span>;
}
