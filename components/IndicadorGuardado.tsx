"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";
import type { EstadoGuardado } from "@/lib/useAutoguardado";

const hora = (d: Date) => d.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });

/** Indicador discreto del guardado automático. */
export default function IndicadorGuardado({ estado, onReintentar, oscuro = false }: { estado: EstadoGuardado; onReintentar?: () => void; oscuro?: boolean }) {
  const tenue = oscuro ? "text-plata" : "text-gris";
  if (estado.estado === "inactivo") return null;
  if (estado.estado === "error") {
    return (
      <button type="button" onClick={onReintentar} className="inline-flex items-center gap-1.5 text-xs text-rojo hover:underline">
        <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.75} /> No se guardó · Reintentar
      </button>
    );
  }
  if (estado.estado === "pendiente" || estado.estado === "guardando") {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs ${tenue}`}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} /> Guardando…
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${tenue}`}
      title={estado.persistente ? "Guardado en la base de datos" : "Guardado temporal: conecta la base de datos en Vercel para conservarlo"}
    >
      <Check className="h-3.5 w-3.5" strokeWidth={1.75} />
      {estado.persistente ? "Guardado" : "Guardado temporal"} {estado.hora ? hora(estado.hora) : ""}
    </span>
  );
}
