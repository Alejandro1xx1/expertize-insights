import { AtencionCambiosSchema } from "@/lib/crm";
import { almacenamientoPersistente, guardarAtencion, obtenerAsesor, obtenerAtencion } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const atencion = await obtenerAtencion(id);
  if (!atencion) return Response.json({ error: "No se encontró esta atención." }, { status: 404 });
  return Response.json({ atencion, persistente: almacenamientoPersistente });
}

/** Guardado automático: aplica solo los campos que llegan. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const actual = await obtenerAtencion(id);
  if (!actual) return Response.json({ error: "No se encontró esta atención." }, { status: 404 });
  const cambios = AtencionCambiosSchema.safeParse(await req.json().catch(() => null));
  if (!cambios.success) return Response.json({ error: cambios.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });

  const c = cambios.data;
  const siguiente = { ...actual };
  if (c.asesorId && c.asesorId !== actual.asesorId) {
    const asesor = await obtenerAsesor(c.asesorId);
    if (!asesor) return Response.json({ error: "El asesor no existe." }, { status: 400 });
    siguiente.asesorId = asesor.id;
    siguiente.asesorNombre = asesor.nombre;
  }
  if (c.cliente) {
    siguiente.cliente = {
      ...c.cliente,
      autorizacionFecha: c.cliente.autorizacionDatos ? (actual.cliente.autorizacionFecha ?? new Date().toISOString()) : null,
    };
  }
  if (c.perfil !== undefined) siguiente.perfil = c.perfil;
  if (c.ciudad !== undefined) siguiente.ciudad = c.ciudad;
  if (c.enlaces !== undefined) siguiente.enlaces = c.enlaces;
  if (c.textoManual !== undefined) siguiente.textoManual = c.textoManual;
  if (c.etapa !== undefined) siguiente.etapa = c.etapa;
  if (c.notas !== undefined) siguiente.notas = c.notas;
  if (c.resultado !== undefined) siguiente.resultado = c.resultado;
  siguiente.actualizadoEl = new Date().toISOString();

  await guardarAtencion(siguiente);
  return Response.json({ actualizadoEl: siguiente.actualizadoEl, persistente: almacenamientoPersistente });
}
