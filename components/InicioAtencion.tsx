"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Mail, MapPin, Phone, UserRound } from "lucide-react";
import type { Asesor, Cliente } from "@/lib/crm";

export const CLAVE_ASESOR = "torque:asesor";

function leerAsesorGuardado(): string {
  try {
    return localStorage.getItem(CLAVE_ASESOR) ?? "";
  } catch {
    return "";
  }
}

const correoValido = (c: string) => !c || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c);

/**
 * Primer paso de la atención: quién atiende y a quién. "Empezar" se activa con
 * asesor y nombre del cliente (y la autorización si se dejan datos de contacto).
 */
export default function InicioAtencion({
  asesores,
  cargandoAsesores,
  onEmpezar,
}: {
  asesores: Asesor[];
  cargandoAsesores: boolean;
  onEmpezar: (datos: { asesorId: string; cliente: Cliente }) => Promise<string | null>;
}) {
  const activos = asesores.filter((a) => a.activo);
  const [asesorId, setAsesorId] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [autoriza, setAutoriza] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recuerda el último asesor usado en este dispositivo.
  useEffect(() => {
    const guardado = leerAsesorGuardado();
    if (guardado && activos.some((a) => a.id === guardado)) setAsesorId(guardado);
    else if (activos.length === 1) setAsesorId(activos[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asesores]);

  const asesor = activos.find((a) => a.id === asesorId);
  const tieneContacto = telefono.trim() !== "" || correo.trim() !== "";
  const listo = !!asesor && nombre.trim() !== "" && (!tieneContacto || autoriza) && correoValido(correo.trim());

  async function empezar(e: React.FormEvent) {
    e.preventDefault();
    if (!listo || !asesor) return;
    setEnviando(true);
    setError(null);
    try {
      localStorage.setItem(CLAVE_ASESOR, asesor.id);
    } catch {
      /* sin almacenamiento local */
    }
    const err = await onEmpezar({
      asesorId: asesor.id,
      cliente: {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        correo: correo.trim(),
        autorizacionDatos: tieneContacto ? autoriza : false,
        autorizacionFecha: null,
      },
    });
    setEnviando(false);
    if (err) setError(err);
  }

  return (
    <form onSubmit={empezar} className="entrar w-full rounded-[var(--radius-xl)] border border-linea bg-white shadow-2">
      <div className="grid md:grid-cols-2">
        {/* Asesor */}
        <section className="border-b border-linea p-6 sm:p-10 md:border-b-0 md:border-r">
          <div className="cifra text-xs font-semibold text-gris-claro">01</div>
          <h2 className="titulo mt-1.5 text-xl">Asesor de venta</h2>
          <p className="mt-2 text-sm text-gris">Quién atiende a este cliente.</p>

          <div className="mt-7">
            <label htmlFor="asesor" className="mb-2 block text-sm font-medium">
              Asesor
            </label>
            {cargandoAsesores ? (
              <div className="campo cargando bg-hueso" />
            ) : activos.length ? (
              <div className="relative">
                <select id="asesor" className="campo" value={asesorId} onChange={(e) => setAsesorId(e.target.value)}>
                <option value="">Selecciona un asesor</option>
                {activos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                    {a.cargo ? ` · ${a.cargo}` : ""}
                  </option>
                ))}
                </select>
              </div>
            ) : (
              <div className="rounded-[var(--radius-md)] border border-dashed border-linea-fuerte p-4 text-sm text-gris">
                Aún no hay asesores.{" "}
                <Link href="/admin" className="font-medium text-tinta underline underline-offset-4">
                  Créalos en Admin
                </Link>
                .
              </div>
            )}
          </div>

          {asesor && (
            <dl className="entrar mt-6 space-y-2.5 text-sm text-gris">
              {asesor.sede && (
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4" strokeWidth={1.5} /> {asesor.sede}
                </div>
              )}
              {asesor.telefono && (
                <div className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4" strokeWidth={1.5} /> {asesor.telefono}
                </div>
              )}
              {asesor.correo && (
                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4" strokeWidth={1.5} /> {asesor.correo}
                </div>
              )}
            </dl>
          )}
        </section>

        {/* Cliente */}
        <section className="p-6 sm:p-10">
          <div className="cifra text-xs font-semibold text-gris-claro">02</div>
          <h2 className="titulo mt-1.5 text-xl">Datos del cliente</h2>
          <p className="mt-2 text-sm text-gris">Solo el nombre es obligatorio.</p>

          <div className="mt-7 space-y-4">
            <div>
              <label htmlFor="cliente-nombre" className="mb-2 block text-sm font-medium">
                Nombre del cliente
              </label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gris-claro" strokeWidth={1.5} />
                <input id="cliente-nombre" className="campo pl-9" placeholder="Ej. Laura Restrepo" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="off" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="cliente-telefono" className="mb-2 block text-sm font-medium">
                  Teléfono <span className="font-normal text-gris-claro">· opcional</span>
                </label>
                <input id="cliente-telefono" className="campo" inputMode="tel" placeholder="300 000 0000" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
              </div>
              <div>
                <label htmlFor="cliente-correo" className="mb-2 block text-sm font-medium">
                  Correo <span className="font-normal text-gris-claro">· opcional</span>
                </label>
                <input
                  id="cliente-correo"
                  className={`campo ${!correoValido(correo.trim()) ? "!border-rojo" : ""}`}
                  type="email"
                  inputMode="email"
                  placeholder="nombre@correo.com"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                />
              </div>
            </div>

            {tieneContacto && (
              <label className="entrar flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-linea bg-niebla p-4 text-sm leading-snug">
                <input type="checkbox" className="casilla mt-0.5" checked={autoriza} onChange={(e) => setAutoriza(e.target.checked)} />
                <span>
                  El cliente autorizó el tratamiento de sus datos personales <span className="text-gris">(Ley 1581 de 2012)</span>.
                  <span className="text-rojo"> *</span>
                </span>
              </label>
            )}
          </div>
        </section>
      </div>

      <div className="flex flex-col-reverse items-stretch gap-3 border-t border-linea px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <p className="text-sm text-gris">
          {error ??
            (!asesor
              ? "Selecciona el asesor para continuar."
              : !nombre.trim()
                ? "Escribe el nombre del cliente."
                : tieneContacto && !autoriza
                  ? "Confirma la autorización de tratamiento de datos."
                  : "Todo listo. La atención se guarda automáticamente.")}
        </p>
        <button type="submit" disabled={!listo || enviando} className="btn btn-primario btn-lg">
          {enviando ? "Creando…" : "Empezar"}
          {!enviando && <ArrowRight className="h-4 w-4" strokeWidth={1.75} />}
        </button>
      </div>
    </form>
  );
}
