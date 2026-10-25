"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";
import Encabezado from "@/components/Encabezado";
import { ETAPAS, etapaLabel, type Asesor, type AtencionResumen } from "@/lib/crm";

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });

const COLOR_ETAPA: Record<string, string> = {
  perfil: "bg-hueso text-gris",
  analizado: "bg-tinta/[.06] text-tinta",
  seguimiento: "bg-tinta/[.06] text-tinta",
  negociacion: "bg-champan/12 text-champan-oscuro",
  ganado: "bg-verde/10 text-verde",
  perdido: "bg-rojo/[.07] text-rojo-oscuro",
};

/** Lista de atenciones guardadas, con buscador y filtros. Al abrir una, se retoma donde quedó. */
export default function ClientesPage() {
  const [atenciones, setAtenciones] = useState<AtencionResumen[]>([]);
  const [asesores, setAsesores] = useState<Asesor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [persistente, setPersistente] = useState(true);
  const [q, setQ] = useState("");
  const [asesor, setAsesor] = useState("");
  const [etapa, setEtapa] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/clientes").then((r) => r.json()), fetch("/api/asesores").then((r) => r.json())])
      .then(([c, a]) => {
        setAtenciones(c.atenciones ?? []);
        setPersistente(c.persistente !== false);
        setAsesores(a.asesores ?? []);
      })
      .finally(() => setCargando(false));
  }, []);

  const filtradas = useMemo(() => {
    const t = q.toLowerCase().trim();
    return atenciones.filter((a) => {
      if (asesor && a.asesorId !== asesor) return false;
      if (etapa && a.etapa !== etapa) return false;
      const dia = a.creadoEl.slice(0, 10);
      if (desde && dia < desde) return false;
      if (hasta && dia > hasta) return false;
      if (t) {
        const texto = `${a.cliente.nombre} ${a.cliente.telefono} ${a.cliente.correo} ${a.perfil} ${a.recomendado ?? ""} ${a.asesorNombre}`.toLowerCase();
        if (!texto.includes(t)) return false;
      }
      return true;
    });
  }, [atenciones, q, asesor, etapa, desde, hasta]);

  const hayFiltros = !!(q || asesor || etapa || desde || hasta);

  return (
    <main className="min-h-dvh">
      <div className="bg-negro">
        <Encabezado oscuro />
      </div>
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="entrar mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="etiqueta text-gris">Clientes</div>
            <h1 className="titulo mt-2.5 text-[2rem] sm:text-[2.5rem]">Atenciones guardadas</h1>
            <p className="mt-3 text-gris">Cada análisis se guarda solo. Abre uno para retomarlo donde quedó.</p>
          </div>
          <a href="/" className="btn btn-primario">
            Nueva atención
          </a>
        </div>

        {!persistente && (
          <div className="mb-6 rounded-[var(--radius-md)] border border-champan/30 bg-champan/[.06] px-4 py-3 text-sm text-champan-oscuro">
            Los datos se están guardando de forma temporal. Conecta la base de datos en Vercel (Storage → Upstash Redis) para conservarlos.
          </div>
        )}

        {/* Filtros en una fila */}
        <div className="tarjeta mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_0.8fr_0.8fr_auto]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gris-claro" strokeWidth={1.5} />
            <input className="campo pl-9" placeholder="Buscar cliente, teléfono, carro…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
          </div>
          <select className="campo" value={asesor} onChange={(e) => setAsesor(e.target.value)} aria-label="Filtrar por asesor">
            <option value="">Todos los asesores</option>
            {asesores.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
          <select className="campo" value={etapa} onChange={(e) => setEtapa(e.target.value)} aria-label="Filtrar por etapa">
            <option value="">Todas las etapas</option>
            {ETAPAS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
          <input type="date" className="campo" value={desde} onChange={(e) => setDesde(e.target.value)} aria-label="Desde" />
          <input type="date" className="campo" value={hasta} onChange={(e) => setHasta(e.target.value)} aria-label="Hasta" />
          <button
            type="button"
            disabled={!hayFiltros}
            onClick={() => {
              setQ("");
              setAsesor("");
              setEtapa("");
              setDesde("");
              setHasta("");
            }}
            className="btn btn-fantasma disabled:opacity-40"
          >
            <X className="h-4 w-4" strokeWidth={1.5} /> Limpiar
          </button>
        </div>

        <p className="mb-4 text-sm text-gris">
          {cargando ? "Cargando…" : `${filtradas.length} de ${atenciones.length} atenciones`}
        </p>

        {!cargando && filtradas.length === 0 ? (
          <div className="tarjeta p-12 text-center text-gris">{atenciones.length ? "Ninguna atención coincide con los filtros." : "Todavía no hay atenciones guardadas."}</div>
        ) : (
          <div className="tarjeta overflow-hidden">
            {/* Escritorio: tabla */}
            <table className="hidden w-full text-sm md:table">
              <thead>
                <tr className="border-b border-linea text-left text-xs text-gris">
                  <th className="px-6 py-3.5 font-medium">Cliente</th>
                  <th className="px-4 py-3.5 font-medium">Asesor</th>
                  <th className="px-4 py-3.5 font-medium">Recomendado</th>
                  <th className="px-4 py-3.5 font-medium">Etapa</th>
                  <th className="px-4 py-3.5 font-medium">Actualizado</th>
                  <th className="px-6 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {filtradas.map((a) => (
                  <tr key={a.id} className="group border-b border-linea last:border-0 transition-colors duration-150 hover:bg-niebla">
                    <td className="px-6 py-4">
                      <a href={`/?atencion=${a.id}`} className="font-medium text-tinta">
                        {a.cliente.nombre}
                      </a>
                      <div className="mt-0.5 max-w-xs truncate text-xs text-gris">{a.perfil || a.cliente.telefono || a.cliente.correo || "Sin perfil"}</div>
                    </td>
                    <td className="px-4 py-4 text-gris">{a.asesorNombre}</td>
                    <td className="px-4 py-4">
                      {a.recomendado ? <span className="line-clamp-1">{a.recomendado}</span> : <span className="text-gris-claro">—</span>}
                      {a.totalCarros > 0 && <div className="text-xs text-gris">{a.totalCarros} carros</div>}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${COLOR_ETAPA[a.etapa] ?? ""}`}>{etapaLabel(a.etapa)}</span>
                    </td>
                    <td className="cifra px-4 py-4 text-gris">
                      {fecha(a.actualizadoEl)}
                      <div className="text-xs">{hora(a.actualizadoEl)}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a href={`/?atencion=${a.id}`} className="btn btn-secundario btn-sm">
                        Abrir <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Celular: lista */}
            <ul className="divide-y divide-linea md:hidden">
              {filtradas.map((a) => (
                <li key={a.id}>
                  <a href={`/?atencion=${a.id}`} className="block px-5 py-4 transition-colors active:bg-niebla">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{a.cliente.nombre}</div>
                        <div className="mt-0.5 truncate text-xs text-gris">{a.recomendado ?? a.perfil ?? "Sin análisis"}</div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${COLOR_ETAPA[a.etapa] ?? ""}`}>{etapaLabel(a.etapa)}</span>
                    </div>
                    <div className="mt-2 text-xs text-gris">
                      {a.asesorNombre} · {fecha(a.actualizadoEl)}, {hora(a.actualizadoEl)}
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
