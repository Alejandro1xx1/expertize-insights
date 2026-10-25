import { z } from "zod/v4";

/* ───────────── Catálogo común ───────────── */

export const CIUDADES_CACHE = ["Medellín", "Bogotá", "Cali", "Barranquilla"] as const;

/* ───────────── Productos ───────────── */

export const AtributoSchema = z.object({
  clave: z.string(),
  valor: z.string(),
});

/** Lo que el modelo devuelve por cada producto que encuentra en una fuente. */
export const ProductoExtraidoSchema = z.object({
  nombre: z.string(),
  precio: z.number().nullable(),
  moneda: z.string().nullable(),
  precioTexto: z.string().nullable(),
  imagenes: z.array(z.string()),
  atributos: z.array(AtributoSchema),
  enlace: z.string().nullable(),
  condicion: z.enum(["nuevo", "usado"]).nullable().optional(),
});

export const ExtraccionSchema = z.object({
  tipo: z.enum(["producto", "catalogo", "sin_productos"]),
  productos: z.array(ProductoExtraidoSchema),
  nota: z.string().nullable(),
});

export type Extraccion = z.infer<typeof ExtraccionSchema>;

/** Producto ya normalizado que viaja al navegador. */
export type Producto = {
  id: string;
  nombre: string;
  precio: number | null;
  moneda: string | null;
  precioTexto: string | null;
  imagenes: string[];
  atributos: { clave: string; valor: string }[];
  /** Enlace exacto del producto (puede ser distinto al de la fuente si venía de un catálogo). */
  enlace: string | null;
  /** Avisos de coherencia detectados al revisar los datos (ej. kilometraje alto para el año). */
  alertas: string[];
  fuente: {
    tipo: "enlace" | "texto" | "archivo";
    /** Número de la fuente tal como la escribió el usuario (Enlace 1, Enlace 2…). */
    indice: number;
    etiqueta: string;
    url: string | null;
  };
};

/* ───────────── Mercado ───────────── */

export const RangoPrecioSchema = z.object({
  segmento: z.string(),
  min: z.number().nullable(),
  max: z.number().nullable(),
  promedio: z.number().nullable(),
  moneda: z.string(),
  unidad: z.string().nullable(),
  fuente: z.string().nullable(),
});

export const MercadoSchema = z.object({
  resumen: z.string(),
  rangosPrecio: z.array(RangoPrecioSchema),
  factoresDecision: z.array(z.object({ factor: z.string(), detalle: z.string() })),
  tendencias: z.array(z.object({ tendencia: z.string(), detalle: z.string() })),
  fuentes: z.array(z.object({ titulo: z.string(), url: z.string() })),
});

export type MercadoModelo = z.infer<typeof MercadoSchema>;

export type Mercado = MercadoModelo & {
  industria: string;
  ciudad: string;
  generadoEl: string;
  origen: "cache-repositorio" | "cache-memoria" | "en-vivo";
};

/* ───────────── Insights ───────────── */

export const InsightsSchema = z.object({
  resumen: z.array(z.string()),
  veredicto: z.string(),
  productos: z.array(
    z.object({
      id: z.string(),
      puntuacion: z.number(),
      justificacion: z.string(),
      titular: z.string(),
      dimensiones: z.object({
        seguridad: z.number(),
        confort: z.number(),
        desempeno: z.number(),
        eficiencia: z.number(),
        tecnologia: z.number(),
        calidadPrecio: z.number(),
      }),
      pros: z.array(z.string()),
      contras: z.array(z.string()),
      idealPara: z.string(),
      referenciaMercado: z.object({
        segmento: z.string().nullable(),
        promedio: z.number().nullable(),
        moneda: z.string().nullable(),
        metodo: z.string().nullable(),
      }),
    }),
  ),
  preguntasCliente: z.array(z.object({ pregunta: z.string(), porQue: z.string() })),
});

export type InsightsModelo = z.infer<typeof InsightsSchema>;

export const DIMENSIONES = [
  { id: "seguridad", label: "Seguridad" },
  { id: "confort", label: "Confort" },
  { id: "desempeno", label: "Desempeño" },
  { id: "eficiencia", label: "Eficiencia" },
  { id: "tecnologia", label: "Tecnología" },
  { id: "calidadPrecio", label: "Calidad-precio" },
] as const;

export type DimensionId = (typeof DIMENSIONES)[number]["id"];

export type PrecioVsMercado = {
  porcentaje: number | null;
  etiqueta: string;
  estado: "oportunidad" | "en-linea" | "por-encima" | "sin-dato";
  referencia: string | null;
};

export type InsightProducto = InsightsModelo["productos"][number] & {
  precioVsMercado: PrecioVsMercado;
};

export type Insights = {
  resumen: string[];
  veredicto: string;
  productos: InsightProducto[];
  preguntasCliente: InsightsModelo["preguntasCliente"];
};

/* ───────────── Eventos del streaming ───────────── */

export type LogNivel = "info" | "ok" | "warn" | "error" | "dato";

export type EventoStream =
  | { tipo: "log"; nivel: LogNivel; texto: string }
  | { tipo: "avance"; progreso: number; texto: string }
  | { tipo: "producto"; producto: Producto }
  | { tipo: "productos_listos"; total: number }
  | { tipo: "mercado"; mercado: Mercado }
  | { tipo: "insights"; insights: Insights }
  | { tipo: "error"; mensaje: string }
  | { tipo: "fin"; segundos: number };
