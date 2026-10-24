import type { EventoStream } from "./schemas";

/**
 * Lee una respuesta Server-Sent Events (por fetch, para poder usar POST)
 * y llama a `onEvento` por cada evento recibido.
 */
export async function leerSSE(
  url: string,
  init: RequestInit,
  onEvento: (e: EventoStream) => void,
): Promise<void> {
  const res = await fetch(url, init);
  if (res.status === 401) {
    window.location.href = "/login";
    return;
  }
  if (!res.ok || !res.body) {
    const msg = (await res.json().catch(() => null))?.error ?? `Error del servidor (${res.status}).`;
    onEvento({ tipo: "error", mensaje: msg });
    return;
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let corte: number;
    while ((corte = buffer.indexOf("\n\n")) !== -1) {
      const bloque = buffer.slice(0, corte);
      buffer = buffer.slice(corte + 2);
      const data = bloque
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trimStart())
        .join("\n");
      if (!data) continue;
      try {
        onEvento(JSON.parse(data) as EventoStream);
      } catch {
        /* bloque incompleto o comentario */
      }
    }
  }
}
