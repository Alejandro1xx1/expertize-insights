import { AtencionCambiosSchema, ClienteSchema, type Atencion } from "@/lib/crm";
import { almacenamientoPersistente, guardarAtencion, listarAtenciones, nuevoId, obtenerAsesor } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lista de atenciones (resumen), con filtros opcionales. */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const q = (p.get("q") ?? "").toLowerCase().trim();
  const asesor = p.get("asesor") ?? "";
  const etapa = p.get("etapa") ?? "";
  const desde = p.get("desde") ?? "";
  const hasta = p.get("hasta") ?? "";
  const todas = await listarAtenciones();
  const filtradas = todas.filter((a) => {
    if (asesor && a.asesorId !== asesor) return false;
    if (etapa && a.etapa !== etapa) return false;
    const dia = a.creadoEl.slice(0, 10);
    if (desde && dia < desde) return false;
    if (hasta && dia > hasta) return false;
    if (q) {
      const texto = `${a.cliente.nombre} ${a.cliente.telefono} ${a.cliente.correo} ${a.perfil} ${a.recomendado ?? ""} ${a.asesorNombre}`.toLowerCase();
      if (!texto.includes(q)) return false;
    }
    return true;
  });
  return Response.json({ atenciones: filtradas, total: todas.length, persistente: almacenamientoPersistente });
}

/** Inicia una atención nueva (asesor + cliente). */
export async function POST(req: Request) {
  const cuerpo = await req.json().catch(() => null);
  const cambios = AtencionCambiosSchema.safeParse(cuerpo);
  const cliente = ClienteSchema.safeParse(cuerpo?.cliente);
  if (!cambios.success || !cliente.success || !cambios.data.asesorId) {
    const msg = !cliente.success ? cliente.error.issues[0]?.message : "Selecciona un asesor.";
    return Response.json({ error: msg ?? "Datos inválidos." }, { status: 400 });
  }
  const asesor = await obtenerAsesor(cambios.data.asesorId);
  if (!asesor) return Response.json({ error: "El asesor no existe." }, { status: 400 });
  const ahora = new Date().toISOString();
  const atencion: Atencion = {
    id: nuevoId(),
    asesorId: asesor.id,
    asesorNombre: asesor.nombre,
    cliente: { ...cliente.data, autorizacionFecha: cliente.data.autorizacionDatos ? (cliente.data.autorizacionFecha ?? ahora) : null },
    perfil: cambios.data.perfil ?? "",
    ciudad: cambios.data.ciudad ?? "",
    enlaces: cambios.data.enlaces ?? [],
    textoManual: cambios.data.textoManual ?? "",
    etapa: "perfil",
    notas: "",
    resultado: null,
    creadoEl: ahora,
    actualizadoEl: ahora,
  };
  await guardarAtencion(atencion);
  return Response.json({ atencion, persistente: almacenamientoPersistente });
}
