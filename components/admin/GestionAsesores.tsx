"use client";

import { useEffect, useState } from "react";
import { Mail, MapPin, Pencil, Phone, Plus, X } from "lucide-react";
import type { Asesor, AsesorEntrada } from "@/lib/crm";

const VACIO: AsesorEntrada = { nombre: "", cargo: "", telefono: "", correo: "", sede: "", activo: true };

/** Crear, editar y activar/desactivar asesores del concesionario. */
export default function GestionAsesores() {
  const [asesores, setAsesores] = useState<Asesor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [persistente, setPersistente] = useState(true);
  const [editando, setEditando] = useState<{ id: string | null; datos: AsesorEntrada } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = () =>
    fetch("/api/asesores")
      .then((r) => r.json())
      .then((d) => {
        setAsesores(d.asesores ?? []);
        setPersistente(d.persistente !== false);
      })
      .finally(() => setCargando(false));

  useEffect(() => {
    void cargar();
  }, []);

  async function guardar(id: string | null, datos: AsesorEntrada) {
    setGuardando(true);
    setError(null);
    const res = await fetch("/api/asesores", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(id ? { ...datos, id } : datos),
    }).catch(() => null);
    setGuardando(false);
    if (!res?.ok) {
      setError((await res?.json().catch(() => null))?.error ?? "No se pudo guardar.");
      return false;
    }
    await cargar();
    return true;
  }

  const set = (cambios: Partial<AsesorEntrada>) => setEditando((e) => (e ? { ...e, datos: { ...e.datos, ...cambios } } : e));

  return (
    <div className="space-y-6">
      {!persistente && (
        <div className="rounded-[var(--radius-md)] border border-champan/30 bg-champan/[.06] px-4 py-3 text-sm text-champan-oscuro">
          Guardado temporal: conecta la base de datos en Vercel (Storage → Upstash Redis) para que los asesores no se borren.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gris">{cargando ? "Cargando…" : `${asesores.filter((a) => a.activo).length} activos · ${asesores.length} en total`}</p>
        <button type="button" onClick={() => setEditando({ id: null, datos: VACIO })} className="btn btn-oscuro">
          <Plus className="h-4 w-4" strokeWidth={1.75} /> Nuevo asesor
        </button>
      </div>

      {editando && (
        <form
          className="tarjeta entrar grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await guardar(editando.id, editando.datos)) setEditando(null);
          }}
        >
          {(
            [
              ["nombre", "Nombre", "Ej. Camila Gómez"],
              ["cargo", "Cargo", "Asesora comercial"],
              ["telefono", "Teléfono", "300 000 0000"],
              ["correo", "Correo", "camila@concesionario.com"],
              ["sede", "Sede", "El Poblado"],
            ] as const
          ).map(([k, label, ph]) => (
            <div key={k}>
              <label className="mb-2 block text-sm font-medium" htmlFor={`asesor-${k}`}>
                {label}
                {k === "nombre" && <span className="text-rojo"> *</span>}
              </label>
              <input id={`asesor-${k}`} className="campo" placeholder={ph} value={editando.datos[k]} onChange={(e) => set({ [k]: e.target.value })} autoFocus={k === "nombre"} />
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 lg:col-span-5">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input type="checkbox" className="casilla" checked={editando.datos.activo} onChange={(e) => set({ activo: e.target.checked })} />
              Activo (aparece en el inicio de la atención)
            </label>
            <div className="flex items-center gap-2">
              {error && <span className="text-sm text-rojo">{error}</span>}
              <button type="button" onClick={() => setEditando(null)} className="btn btn-fantasma">
                Cancelar
              </button>
              <button type="submit" disabled={!editando.datos.nombre.trim() || guardando} className="btn btn-primario">
                {guardando ? "Guardando…" : editando.id ? "Guardar cambios" : "Crear asesor"}
              </button>
            </div>
          </div>
        </form>
      )}

      {!cargando && asesores.length === 0 && !editando && (
        <div className="tarjeta p-10 text-center text-gris">Aún no hay asesores. Crea el primero para empezar a registrar atenciones.</div>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {asesores.map((a) => (
          <li key={a.id} className={`tarjeta p-5 transition-opacity ${a.activo ? "" : "opacity-60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">{a.nombre}</div>
                <div className="text-sm text-gris">{a.cargo || "Sin cargo"}</div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${a.activo ? "bg-verde/10 text-verde" : "bg-hueso text-gris"}`}>
                {a.activo ? "Activo" : "Inactivo"}
              </span>
            </div>
            <dl className="mt-4 space-y-1.5 text-sm text-gris">
              {a.sede && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} /> {a.sede}
                </div>
              )}
              {a.telefono && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" strokeWidth={1.5} /> {a.telefono}
                </div>
              )}
              {a.correo && (
                <div className="flex items-center gap-2 truncate">
                  <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} /> {a.correo}
                </div>
              )}
            </dl>
            <div className="mt-5 flex gap-2 border-t border-linea pt-4">
              <button
                type="button"
                onClick={() => setEditando({ id: a.id, datos: { nombre: a.nombre, cargo: a.cargo, telefono: a.telefono, correo: a.correo, sede: a.sede, activo: a.activo } })}
                className="btn btn-secundario btn-sm"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} /> Editar
              </button>
              <button type="button" onClick={() => void guardar(a.id, { ...a, activo: !a.activo })} className="btn btn-fantasma btn-sm">
                {a.activo ? (
                  <>
                    <X className="h-3.5 w-3.5" strokeWidth={1.5} /> Desactivar
                  </>
                ) : (
                  "Activar"
                )}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
