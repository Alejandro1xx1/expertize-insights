"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AtencionCambios } from "./crm";

export type EstadoGuardado = {
  estado: "inactivo" | "pendiente" | "guardando" | "guardado" | "error";
  hora: Date | null;
  persistente: boolean;
};

/**
 * Guardado automático de una atención: junta los cambios que llegan seguidos
 * (espera `retraso` ms sin cambios) y los envía en un solo PATCH.
 */
export function useAutoguardado(atencionId: string | null, retraso = 800) {
  const [estado, setEstado] = useState<EstadoGuardado>({ estado: "inactivo", hora: null, persistente: true });
  const pendiente = useRef<AtencionCambios>({});
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(atencionId);
  idRef.current = atencionId;

  const enviar = useCallback(async () => {
    const id = idRef.current;
    const cambios = pendiente.current;
    if (!id || !Object.keys(cambios).length) return;
    pendiente.current = {};
    setEstado((e) => ({ ...e, estado: "guardando" }));
    try {
      const res = await fetch(`/api/clientes/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cambios),
        keepalive: JSON.stringify(cambios).length < 60_000,
      });
      if (!res.ok) throw new Error(String(res.status));
      const datos = await res.json();
      setEstado({ estado: "guardado", hora: new Date(datos.actualizadoEl), persistente: datos.persistente !== false });
    } catch {
      // Se reintenta con el próximo cambio o con el botón "Reintentar".
      pendiente.current = { ...cambios, ...pendiente.current };
      setEstado((e) => ({ ...e, estado: "error" }));
    }
  }, []);

  const guardar = useCallback(
    (cambios: AtencionCambios, inmediato = false) => {
      if (!idRef.current) return;
      pendiente.current = { ...pendiente.current, ...cambios };
      setEstado((e) => ({ ...e, estado: "pendiente" }));
      if (temporizador.current) clearTimeout(temporizador.current);
      if (inmediato) void enviar();
      else temporizador.current = setTimeout(() => void enviar(), retraso);
    },
    [enviar, retraso],
  );

  // Al salir de la página, envía lo que falte.
  useEffect(() => {
    const salir = () => void enviar();
    window.addEventListener("pagehide", salir);
    return () => window.removeEventListener("pagehide", salir);
  }, [enviar]);

  const marcarGuardado = useCallback((hora: string, persistente: boolean) => {
    setEstado({ estado: "guardado", hora: new Date(hora), persistente });
  }, []);

  return { estado, guardar, reintentar: enviar, marcarGuardado };
}
