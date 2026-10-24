export function formatoMoneda(valor: number, moneda: string | null): string {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: moneda || "COP",
      maximumFractionDigits: 0,
    }).format(valor);
  } catch {
    return `${moneda ?? ""} ${Math.round(valor).toLocaleString("es-CO")}`.trim();
  }
}

export function dominio(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
