import {
  InsightsSchema,
  PreguntasComparadorSchema,
  type ComparadorConfig,
  type Insights,
  type InsightProducto,
  type Mercado,
  type PrecioVsMercado,
  type Producto,
} from "./schemas";
import { parseStructured } from "./claude";
import { formatoMoneda } from "./format";

type Contexto = { ciudad: string; mensaje: string };

function productosParaModelo(productos: Producto[]): string {
  return JSON.stringify(
    productos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      precio: p.precio,
      moneda: p.moneda,
      atributos: p.atributos,
      fuente: p.fuente.etiqueta,
    })),
  );
}

function mercadoParaModelo(m: Mercado | null): string {
  if (!m) return "(No hay investigación de mercado disponible: deja referenciaMercado en null.)";
  return JSON.stringify({
    resumen: m.resumen,
    rangosPrecio: m.rangosPrecio,
    factoresDecision: m.factoresDecision,
    tendencias: m.tendencias,
  });
}

/** El porcentaje frente al mercado se calcula en código, no lo calcula el modelo. */
function calcularPrecioVsMercado(p: Producto, ref: InsightProducto["referenciaMercado"]): PrecioVsMercado {
  if (p.precio === null || ref.promedio === null || ref.promedio <= 0) {
    return { porcentaje: null, etiqueta: "Sin dato", estado: "sin-dato", referencia: null };
  }
  if (ref.moneda && p.moneda && ref.moneda.toUpperCase() !== p.moneda.toUpperCase()) {
    return { porcentaje: null, etiqueta: "Sin dato (monedas distintas)", estado: "sin-dato", referencia: null };
  }
  const pct = ((p.precio - ref.promedio) / ref.promedio) * 100;
  const r = Math.round(Math.abs(pct));
  const referencia = `Promedio ${ref.segmento ?? "del segmento"}: ${formatoMoneda(ref.promedio, ref.moneda ?? p.moneda)}`;
  if (pct <= -5) return { porcentaje: pct, etiqueta: `Oportunidad · ${r}% por debajo del promedio`, estado: "oportunidad", referencia };
  if (pct < 5) return { porcentaje: pct, etiqueta: "En línea con el mercado", estado: "en-linea", referencia };
  return { porcentaje: pct, etiqueta: `${r}% por encima del promedio`, estado: "por-encima", referencia };
}

export async function generarInsights(
  productos: Producto[],
  mercado: Mercado | null,
  ctx: Contexto,
  signal: AbortSignal,
): Promise<Insights> {
  const data = await parseStructured({
    system: `Eres un asesor comercial experto en venta de carros (nuevos, usados y de lujo) en Colombia. Analizas productos frente al contexto de un prospecto y al mercado. Respondes en español claro, frases cortas, tono profesional y persuasivo pero honesto.

Reglas estrictas:
- Usa SOLO los datos de los productos y del mercado entregados. NUNCA inventes precios, cifras ni características. Si un dato no está, dilo como "Sin dato".
- "resumen": exactamente 3 frases cortas (una por línea) para un gerente comercial.
- "productos": uno por cada id recibido, con el mismo id.
  - "puntuacion": entero 0–100 según qué tan bien encaja con el contexto del mensaje (presupuesto, uso, perfil). Penaliza datos faltantes clave.
  - "titular": una frase de máximo 14 palabras que venda el carro (ej. "La SUV familiar con más equipamiento por menos de 100 millones").
  - "dimensiones": evaluación de 1 a 10 (enteros) en seguridad, confort, desempeno (motor/potencia), eficiencia (consumo y costo de uso), tecnologia (equipamiento) y calidadPrecio (lo que ofrece frente a su precio y al mercado). Basa la nota en los atributos entregados y en lo que se sabe públicamente del modelo y versión; si faltan datos, usa una nota prudente (5) en lugar de inventar fortalezas.
  - "pros" y "contras": 2 a 4 cada uno, concretos, basados en datos.
  - "idealPara": perfil de comprador en una frase.
  - "referenciaMercado": elige el rango de la investigación de mercado que corresponde a ese producto y copia su "promedio" (o el punto medio entre min y max si no hay promedio) y su moneda, en la MISMA unidad que el precio del producto (usa el segmento que coincida en tipo de carro, gama y antigüedad; explica la elección en "metodo"). Si no hay un rango comparable, todo en null.
- "preguntasCliente": 5 a 7 preguntas que el comprador final se hace antes de comprar, con "porQue" de una línea.`,
    prompt: `Contexto del prospecto: ${ctx.mensaje || "(sin contexto)"}
Ciudad: ${ctx.ciudad || "(sin ciudad)"}

Productos:
${productosParaModelo(productos)}

Investigación de mercado:
${mercadoParaModelo(mercado)}`,
    schema: InsightsSchema,
    signal,
  });

  const porId = new Map(data.productos.map((x) => [x.id, x]));
  const productosInsight: InsightProducto[] = productos.map((p) => {
    const x = porId.get(p.id) ?? {
      id: p.id,
      puntuacion: 0,
      justificacion: "Sin dato",
      titular: "",
      dimensiones: { seguridad: 0, confort: 0, desempeno: 0, eficiencia: 0, tecnologia: 0, calidadPrecio: 0 },
      pros: [],
      contras: [],
      idealPara: "Sin dato",
      referenciaMercado: { segmento: null, promedio: null, moneda: null, metodo: null },
    };
    return {
      ...x,
      puntuacion: Math.max(0, Math.min(100, Math.round(x.puntuacion))),
      dimensiones: Object.fromEntries(
        Object.entries(x.dimensiones).map(([k, v]) => [k, Math.max(0, Math.min(10, Math.round(v)))]),
      ) as InsightProducto["dimensiones"],
      precioVsMercado: calcularPrecioVsMercado(p, x.referenciaMercado),
    };
  });

  return {
    resumen: data.resumen.slice(0, 3),
    productos: productosInsight,
    preguntasCliente: data.preguntasCliente,
  };
}

function redondearPaso(v: number, paso: number, hacia: "abajo" | "arriba"): number {
  return (hacia === "abajo" ? Math.floor(v / paso) : Math.ceil(v / paso)) * paso;
}

export async function generarComparador(
  productos: Producto[],
  ctx: Contexto,
  signal: AbortSignal,
): Promise<ComparadorConfig> {
  const preguntas = await parseStructured({
    system: `Diseñas comparadores interactivos para compradores finales de carros en Colombia. Respondes en español, tono cercano (tú).

Crea 3 o 4 preguntas guiadas de opción múltiple sobre USO y PREFERENCIAS del carro (no sobre presupuesto, eso ya existe). Ejemplos de temas: uso principal (ciudad, carretera, familia, trabajo), tipo de carrocería preferida, transmisión, prioridad (consumo, espacio, potencia, tecnología, lujo), tolerancia al kilometraje. Cada pregunta tiene 2 a 4 opciones. Para cada opción, asigna "puntos" entre -20 y 20 a CADA producto (por id) según qué tan bien encaja con esa respuesta, basándote SOLO en los atributos dados. Si un atributo no está, usa 0 para ese producto.
"titulo": título atractivo del comparador (ej. "Encuentra tu próximo carro"). "subtitulo": una frase.
Ids de preguntas y opciones: cortos, en minúsculas y sin espacios.`,
    prompt: `Contexto del vendedor: ${ctx.mensaje || "(sin contexto)"} · Ciudad: ${ctx.ciudad || "(sin ciudad)"}

Productos:
${productosParaModelo(productos)}`,
    schema: PreguntasComparadorSchema,
    signal,
  });

  const ids = new Set(productos.map((p) => p.id));
  const precios = productos.map((p) => p.precio).filter((x): x is number => x !== null && x > 0);
  const moneda = productos.find((p) => p.moneda)?.moneda ?? "COP";
  const paso = precios.length && Math.max(...precios) > 10_000_000 ? 1_000_000 : precios.length && Math.max(...precios) > 100_000 ? 50_000 : 1;
  const min = precios.length ? redondearPaso(Math.min(...precios) * 0.7, paso, "abajo") : 0;
  const max = precios.length ? redondearPaso(Math.max(...precios) * 1.3, paso, "arriba") : 0;

  return {
    version: 1,
    marca: { nombre: "Mi Concesionario", colorPrincipal: "#C8102E", logoUrl: null, eslogan: null },
    titulo: preguntas.titulo,
    subtitulo: preguntas.subtitulo,
    preguntas: [
      ...(precios.length
        ? [
            {
              tipo: "presupuesto" as const,
              id: "presupuesto",
              texto: "¿Cuál es tu presupuesto máximo?",
              ayuda: "Mueve la barra hasta el valor que te sientes cómodo pagando.",
              min,
              max,
              paso,
              moneda,
            },
          ]
        : []),
      ...preguntas.preguntas.map((q) => ({
        tipo: "opcion" as const,
        id: q.id,
        texto: q.texto,
        ayuda: q.ayuda,
        opciones: q.opciones.map((o) => ({
          id: o.id,
          etiqueta: o.etiqueta,
          puntos: o.puntos
            .filter((x) => ids.has(x.productoId))
            .map((x) => ({ productoId: x.productoId, puntos: Math.max(-20, Math.min(20, Math.round(x.puntos))) })),
        })),
      })),
    ],
    reglas: { bonoDentroPresupuesto: 10, penalizacionPorPorcentajeExcedido: 2, penalizacionMaxima: 40 },
    catalogo: productos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      precio: p.precio,
      moneda: p.moneda,
      imagenes: p.imagenes,
      atributos: p.atributos,
      enlace: p.enlace,
      puntuacionBase: 50,
      pros: [],
      idealPara: null,
    })),
  };
}
