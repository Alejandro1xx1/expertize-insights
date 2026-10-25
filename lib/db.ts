import { Redis } from "@upstash/redis";
import type { Asesor, Atencion, AtencionResumen } from "./crm";

/**
 * Almacenamiento de asesores y atenciones.
 * En Vercel se conecta a Upstash Redis (Storage → Upstash → Redis); las variables
 * KV_REST_API_URL/KV_REST_API_TOKEN o UPSTASH_REDIS_REST_URL/TOKEN se leen solas.
 * Sin esas variables usa memoria del servidor (se pierde al reiniciar) y lo informa.
 */

const P = "torque:";
const K = {
  asesores: `${P}asesores`,
  atencion: (id: string) => `${P}atencion:${id}`,
  indice: `${P}atenciones`,
};

const hayRedis = !!(
  (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
  (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
);

let redis: Redis | null = null;
function r(): Redis {
  redis ??= Redis.fromEnv();
  return redis;
}

// Respaldo en memoria (desarrollo o mientras no se conecte la base de datos).
const mem = {
  asesores: new Map<string, Asesor>(),
  atenciones: new Map<string, Atencion>(),
};

export const almacenamientoPersistente = hayRedis;

export function nuevoId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/* ───────────── Asesores ───────────── */

export async function listarAsesores(): Promise<Asesor[]> {
  let lista: Asesor[];
  if (hayRedis) {
    const datos = await r().hgetall<Record<string, Asesor>>(K.asesores);
    lista = Object.values(datos ?? {});
  } else {
    lista = [...mem.asesores.values()];
  }
  return lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export async function guardarAsesor(a: Asesor): Promise<void> {
  if (hayRedis) await r().hset(K.asesores, { [a.id]: a });
  else mem.asesores.set(a.id, a);
}

export async function obtenerAsesor(id: string): Promise<Asesor | null> {
  if (hayRedis) return (await r().hget<Asesor>(K.asesores, id)) ?? null;
  return mem.asesores.get(id) ?? null;
}

/* ───────────── Atenciones ───────────── */

export async function guardarAtencion(a: Atencion): Promise<void> {
  if (hayRedis) {
    await r().set(K.atencion(a.id), a);
    await r().zadd(K.indice, { score: Date.parse(a.actualizadoEl), member: a.id });
  } else {
    mem.atenciones.set(a.id, a);
  }
}

export async function obtenerAtencion(id: string): Promise<Atencion | null> {
  if (hayRedis) return (await r().get<Atencion>(K.atencion(id))) ?? null;
  return mem.atenciones.get(id) ?? null;
}

function resumir(a: Atencion): AtencionResumen {
  const res = a.resultado as { productos?: { id: string; nombre: string }[]; insights?: { productos?: { id: string; puntuacion: number }[] } } | null;
  const productos = res?.productos ?? [];
  const mejor = [...(res?.insights?.productos ?? [])].sort((x, y) => y.puntuacion - x.puntuacion)[0];
  const recomendado = mejor ? (productos.find((p) => p.id === mejor.id)?.nombre ?? null) : (productos[0]?.nombre ?? null);
  return {
    id: a.id,
    asesorId: a.asesorId,
    asesorNombre: a.asesorNombre,
    cliente: { nombre: a.cliente.nombre, telefono: a.cliente.telefono, correo: a.cliente.correo },
    perfil: a.perfil,
    ciudad: a.ciudad,
    etapa: a.etapa,
    creadoEl: a.creadoEl,
    actualizadoEl: a.actualizadoEl,
    recomendado,
    totalCarros: productos.length,
  };
}

/** Las atenciones más recientes primero (hasta `limite`). */
export async function listarAtenciones(limite = 300): Promise<AtencionResumen[]> {
  if (hayRedis) {
    const ids = await r().zrange<string[]>(K.indice, 0, limite - 1, { rev: true });
    if (!ids.length) return [];
    const datos = await r().mget<(Atencion | null)[]>(...ids.map(K.atencion));
    return datos.filter((a): a is Atencion => !!a).map(resumir);
  }
  return [...mem.atenciones.values()]
    .sort((a, b) => b.actualizadoEl.localeCompare(a.actualizadoEl))
    .slice(0, limite)
    .map(resumir);
}
