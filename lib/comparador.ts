import type { ComparadorConfig } from "./schemas";

export type Respuestas = Record<string, string | number>;

export type ResultadoComparador = {
  producto: ComparadorConfig["catalogo"][number];
  puntaje: number;
  dentroPresupuesto: boolean | null;
};

/**
 * Reglas de puntuación del comparador (deterministas, reutilizables por cliente):
 * puntuación base + puntos de cada respuesta + efecto del presupuesto, limitado a 0–100.
 */
export function puntuar(config: ComparadorConfig, respuestas: Respuestas): ResultadoComparador[] {
  const { reglas } = config;
  return config.catalogo
    .map((producto) => {
      let puntaje = producto.puntuacionBase;
      let dentroPresupuesto: boolean | null = null;
      for (const q of config.preguntas) {
        const r = respuestas[q.id];
        if (r === undefined) continue;
        if (q.tipo === "presupuesto") {
          if (producto.precio === null || typeof r !== "number") continue;
          if (producto.precio <= r) {
            dentroPresupuesto = true;
            puntaje += reglas.bonoDentroPresupuesto;
          } else {
            dentroPresupuesto = false;
            const exceso = ((producto.precio - r) / r) * 100;
            puntaje -= Math.min(reglas.penalizacionMaxima, exceso * reglas.penalizacionPorPorcentajeExcedido);
          }
        } else {
          const opcion = q.opciones.find((o) => o.id === r);
          puntaje += opcion?.puntos.find((x) => x.productoId === producto.id)?.puntos ?? 0;
        }
      }
      return { producto, puntaje: Math.round(Math.max(0, Math.min(100, puntaje))), dentroPresupuesto };
    })
    .sort((a, b) => b.puntaje - a.puntaje);
}
