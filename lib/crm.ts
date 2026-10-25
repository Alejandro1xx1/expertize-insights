import { z } from "zod/v4";

/* ───────────── Asesores ───────────── */

export const AsesorEntradaSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  cargo: z.string().trim().max(80).default(""),
  telefono: z.string().trim().max(40).default(""),
  correo: z.string().trim().max(120).default(""),
  sede: z.string().trim().max(80).default(""),
  activo: z.boolean().default(true),
});

export type AsesorEntrada = z.infer<typeof AsesorEntradaSchema>;
export type Asesor = AsesorEntrada & { id: string; creadoEl: string };

/* ───────────── Atenciones (análisis guardados) ───────────── */

export const ETAPAS = [
  { id: "perfil", label: "Perfilando" },
  { id: "analizado", label: "Analizado" },
  { id: "seguimiento", label: "Seguimiento" },
  { id: "negociacion", label: "Negociación" },
  { id: "ganado", label: "Venta cerrada" },
  { id: "perdido", label: "No compró" },
] as const;

export type EtapaId = (typeof ETAPAS)[number]["id"];
export const etapaLabel = (id: string) => ETAPAS.find((e) => e.id === id)?.label ?? id;

export const ClienteSchema = z
  .object({
    nombre: z.string().trim().min(1, "El nombre del cliente es obligatorio").max(120),
    telefono: z.string().trim().max(40).default(""),
    correo: z.string().trim().max(120).default(""),
    autorizacionDatos: z.boolean().default(false),
    autorizacionFecha: z.string().nullable().default(null),
  })
  .refine((c) => (!c.telefono && !c.correo) || c.autorizacionDatos, {
    message: "Falta la autorización de tratamiento de datos (Ley 1581 de 2012).",
  });

export type Cliente = z.infer<typeof ClienteSchema>;

const EtapaSchema = z.enum(ETAPAS.map((e) => e.id) as [EtapaId, ...EtapaId[]]);

/** Lo que se puede crear o actualizar desde la app (el resultado viaja como JSON libre). */
export const AtencionCambiosSchema = z.object({
  asesorId: z.string().max(60).optional(),
  cliente: ClienteSchema.optional(),
  perfil: z.string().max(4000).optional(),
  ciudad: z.string().max(80).optional(),
  enlaces: z.array(z.string().max(2000)).max(12).optional(),
  textoManual: z.string().max(60_000).optional(),
  etapa: EtapaSchema.optional(),
  notas: z.string().max(8000).optional(),
  resultado: z.unknown().optional(),
});

export type AtencionCambios = z.infer<typeof AtencionCambiosSchema>;

export type Atencion = {
  id: string;
  asesorId: string;
  asesorNombre: string;
  cliente: Cliente;
  perfil: string;
  ciudad: string;
  enlaces: string[];
  textoManual: string;
  etapa: EtapaId;
  notas: string;
  resultado: unknown | null;
  creadoEl: string;
  actualizadoEl: string;
};

/** Versión liviana para la lista de Clientes. */
export type AtencionResumen = Pick<Atencion, "id" | "asesorId" | "asesorNombre" | "perfil" | "ciudad" | "etapa" | "creadoEl" | "actualizadoEl"> & {
  cliente: Pick<Cliente, "nombre" | "telefono" | "correo">;
  recomendado: string | null;
  totalCarros: number;
};
