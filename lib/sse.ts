import type { EventoStream } from "./schemas";

/** Crea una respuesta Server-Sent Events y una función para emitir eventos. */
export function crearSSE(alCancelar?: () => void) {
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  let cerrado = false;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
      cerrado = true;
      alCancelar?.();
    },
  });

  const emit = (evento: EventoStream) => {
    if (cerrado) return;
    try {
      controller.enqueue(encoder.encode(`event: ${evento.tipo}\ndata: ${JSON.stringify(evento)}\n\n`));
    } catch {
      cerrado = true;
    }
  };

  // Comentario periódico para que proxies y navegadores no corten la conexión.
  const latido = setInterval(() => {
    if (cerrado) return;
    try {
      controller.enqueue(encoder.encode(`: latido\n\n`));
    } catch {
      cerrado = true;
    }
  }, 10_000);

  const cerrar = () => {
    clearInterval(latido);
    if (cerrado) return;
    cerrado = true;
    try {
      controller.close();
    } catch {
      /* ya cerrado */
    }
  };

  const response = new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });

  return { response, emit, cerrar };
}

export function conTimeout(padre: AbortSignal, ms: number): AbortSignal {
  return AbortSignal.any([padre, AbortSignal.timeout(ms)]);
}
