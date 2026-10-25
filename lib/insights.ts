import {
  InsightsSchema,
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
- "resumen": una frase por cada uno de los 3 carros con mayor puntuación (en orden de puntuación, máximo 3), explicando en lenguaje de vendedor por qué ocupa ese puesto para ESTE cliente (presupuesto, uso, precio frente al mercado, kilometraje). Empieza cada frase con el nombre corto del carro.
- "veredicto": una sola frase final con la recomendación concreta para cerrar la venta.
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
    veredicto: data.veredicto,
    productos: productosInsight,
    preguntasCliente: data.preguntasCliente,
  };
}
