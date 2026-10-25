import { z } from "zod/v4";
import { AsesorEntradaSchema, type Asesor } from "@/lib/crm";
import { almacenamientoPersistente, guardarAsesor, listarAsesores, nuevoId, obtenerAsesor } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ asesores: await listarAsesores(), persistente: almacenamientoPersistente });
}

/** Crea un asesor, o lo actualiza si viene `id`. */
export async function POST(req: Request) {
  const cuerpo = await req.json().catch(() => null);
  const id = z.string().max(60).optional().safeParse(cuerpo?.id).data;
  const datos = AsesorEntradaSchema.safeParse(cuerpo);
  if (!datos.success) {
    return Response.json({ error: datos.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }
  const anterior = id ? await obtenerAsesor(id) : null;
  if (id && !anterior) return Response.json({ error: "Asesor no encontrado." }, { status: 404 });
  const asesor: Asesor = { ...datos.data, id: anterior?.id ?? nuevoId(), creadoEl: anterior?.creadoEl ?? new Date().toISOString() };
  await guardarAsesor(asesor);
  return Response.json({ asesor, persistente: almacenamientoPersistente });
}
