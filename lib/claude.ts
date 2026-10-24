import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod/v4";

export const MODEL = "claude-sonnet-5-5";

// Si un clasificador de seguridad rechaza la petición por error, la API la
// reintenta automáticamente con otro modelo (opción "default").
const BETAS: Anthropic.Beta.AnthropicBeta[] = ["server-side-fallback-2026-07-01"];

export class ConfigError extends Error {}

let client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ConfigError(
      "Falta la variable ANTHROPIC_API_KEY. Cárgala en Vercel → Settings → Environment Variables.",
    );
  }
  client ??= new Anthropic({ maxRetries: 2, timeout: 100_000 });
  return client;
}

export const WEB_SEARCH = (maxUses: number): Anthropic.Beta.BetaToolUnion => ({
  type: "web_search_20260209",
  name: "web_search",
  max_uses: maxUses,
  user_location: { type: "approximate", country: "CO", timezone: "America/Bogota" },
});

export const WEB_FETCH = (maxUses: number): Anthropic.Beta.BetaToolUnion => ({
  type: "web_fetch_20260209",
  name: "web_fetch",
  max_uses: maxUses,
  max_content_tokens: 30_000,
});

export type ToolActivity =
  | { tipo: "busqueda"; consulta: string }
  | { tipo: "lectura"; url: string }
  | { tipo: "lectura_fallida"; codigo: string }
  | { tipo: "codigo" };

type RunToolsArgs = {
  system: string;
  prompt: string;
  tools: Anthropic.Beta.BetaToolUnion[];
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
  signal?: AbortSignal;
  onActivity?: (a: ToolActivity) => void;
};

export type RunToolsResult = {
  /** Texto final del modelo (donde debe venir el JSON). */
  texto: string;
  /** Todo lo que devolvieron las herramientas, serializado: sirve para verificar datos. */
  evidencia: string;
  /** Cuántas lecturas web_fetch devolvieron contenido. */
  lecturasExitosas: number;
};

/**
 * Ejecuta una petición con herramientas de servidor (búsqueda / lectura web),
 * en streaming para reportar actividad en vivo, y reanuda si la API pausa el turno.
 */
export async function runWithTools({
  system,
  prompt,
  tools,
  maxTokens = 16_000,
  effort = "low",
  signal,
  onActivity,
}: RunToolsArgs): Promise<RunToolsResult> {
  const anthropic = getClient();
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];
  const evidencia: string[] = [];
  let lecturasExitosas = 0;
  let texto = "";

  for (let vuelta = 0; vuelta < 4; vuelta++) {
    const stream = anthropic.beta.messages.stream(
      {
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages,
        tools,
        betas: BETAS,
        fallbacks: "default",
        output_config: { effort },
      },
      { signal },
    );

    stream.on("contentBlock", (block) => {
      if (block.type === "server_tool_use") {
        const input = (block.input ?? {}) as Record<string, unknown>;
        if (block.name === "web_search" && typeof input.query === "string") {
          onActivity?.({ tipo: "busqueda", consulta: input.query });
        } else if (block.name === "web_fetch" && typeof input.url === "string") {
          onActivity?.({ tipo: "lectura", url: input.url });
        } else {
          onActivity?.({ tipo: "codigo" });
        }
      } else if (block.type === "web_fetch_tool_result") {
        if (block.content.type === "web_fetch_tool_result_error") {
          onActivity?.({ tipo: "lectura_fallida", codigo: block.content.error_code });
        } else {
          lecturasExitosas++;
        }
        evidencia.push(JSON.stringify(block.content));
      } else if (block.type !== "text" && block.type !== "thinking") {
        evidencia.push(JSON.stringify(block));
      }
    });

    const msg = await stream.finalMessage();

    if (msg.stop_reason === "refusal") {
      throw new Error("El modelo no pudo procesar esta solicitud (rechazo de seguridad).");
    }

    texto = msg.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    if (msg.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: msg.content });
      continue;
    }
    break;
  }

  return { texto, evidencia: evidencia.join("\n"), lecturasExitosas };
}

/** Extrae el bloque JSON de un texto libre (con o sin ```json). */
export function extractJson(texto: string): unknown {
  const fence = [...texto.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1]);
  const candidatos = [...fence.reverse()];
  const ini = texto.indexOf("{");
  const fin = texto.lastIndexOf("}");
  if (ini !== -1 && fin > ini) candidatos.push(texto.slice(ini, fin + 1));
  for (const c of candidatos) {
    try {
      return JSON.parse(c.trim());
    } catch {
      /* siguiente candidato */
    }
  }
  throw new Error("La respuesta no contenía JSON válido.");
}

type ParseArgs<S extends z.ZodType> = {
  system: string;
  prompt: string;
  schema: S;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
  signal?: AbortSignal;
};

/**
 * Petición sin herramientas con salida JSON estructurada, validada con zod.
 * Reintenta una vez si el JSON viene mal formado o no cumple el esquema.
 */
export async function parseStructured<S extends z.ZodType>({
  system,
  prompt,
  schema,
  maxTokens = 16_000,
  effort = "low",
  signal,
}: ParseArgs<S>): Promise<z.infer<S>> {
  const anthropic = getClient();
  let ultimoError: unknown;
  for (let intento = 0; intento < 2; intento++) {
    try {
      const res = await anthropic.beta.messages.parse(
        {
          model: MODEL,
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: prompt }],
          betas: BETAS,
          fallbacks: "default",
          output_config: { effort, format: betaZodOutputFormat(schema) },
        },
        { signal },
      );
      if (res.stop_reason === "refusal") {
        throw new Error("El modelo no pudo procesar esta solicitud (rechazo de seguridad).");
      }
      const parsed = schema.safeParse(res.parsed_output);
      if (parsed.success) return parsed.data;
      ultimoError = parsed.error;
    } catch (err) {
      if (signal?.aborted || err instanceof ConfigError || err instanceof Anthropic.AuthenticationError) {
        throw err;
      }
      ultimoError = err;
    }
  }
  throw ultimoError instanceof Error ? ultimoError : new Error("JSON inválido del modelo.");
}

/**
 * Valida el JSON que vino en texto libre (respuestas con herramientas).
 * Si falla, pide al modelo que lo repare con salida estructurada (sin herramientas,
 * sin inventar: solo reformatea lo que ya estaba).
 */
export async function validateOrRepair<S extends z.ZodType>(
  texto: string,
  schema: S,
  signal?: AbortSignal,
): Promise<z.infer<S>> {
  try {
    const parsed = schema.safeParse(extractJson(texto));
    if (parsed.success) return parsed.data;
  } catch {
    /* se repara abajo */
  }
  return parseStructured({
    system:
      "Conviertes respuestas a JSON válido según el esquema. No agregues, inventes ni completes datos: usa null o listas vacías cuando falte algo. Copia los valores tal como aparecen.",
    prompt: `Convierte esta respuesta al esquema JSON pedido:\n\n${texto.slice(0, 60_000)}`,
    schema,
    signal,
  });
}

/** Mensaje humano para errores del SDK. */
export function describeError(err: unknown): string {
  if (err instanceof ConfigError) return err.message;
  if (err instanceof Anthropic.AuthenticationError) return "La ANTHROPIC_API_KEY no es válida.";
  if (err instanceof Anthropic.RateLimitError) return "Límite de uso de la API alcanzado; intenta en un minuto.";
  if (err instanceof Anthropic.APIConnectionTimeoutError) return "La API tardó demasiado en responder.";
  if (err instanceof Anthropic.PermissionDeniedError) return "La API key de Anthropic no tiene permiso para este modelo o herramienta.";
  if (err instanceof Anthropic.APIError) {
    if (/credit balance/i.test(err.message)) {
      return "La cuenta de Anthropic no tiene saldo. Carga saldo en console.anthropic.com → Billing.";
    }
    if (/web (search|fetch).*(not enabled|disabled)|not enabled.*web/i.test(err.message)) {
      return "La búsqueda/lectura web no está habilitada en tu organización de Anthropic (console.anthropic.com → Settings → Privacy/Web).";
    }
    return `Error de la API (${err.status ?? "?"}): ${err.message.slice(0, 160)}`;
  }
  if (err instanceof Error) {
    if (err.name === "AbortError" || /abort/i.test(err.message)) return "Tiempo de espera agotado.";
    return err.message;
  }
  return "Error desconocido.";
}
