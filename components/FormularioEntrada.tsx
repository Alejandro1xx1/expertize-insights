"use client";

import { useRef, useState } from "react";
import { BatteryCharging, Briefcase, Fuel, Gem, KeyRound, Landmark, Users, Wrench, type LucideIcon } from "lucide-react";
import CajonesEnlaces from "./CajonesEnlaces";

export type DatosEntrada = {
  enlaces: string[];
  mensaje: string;
  ciudad: string;
  textoManual: string;
  archivo: { nombre: string; csv: string; filas: number } | null;
};

export const ENTRADA_VACIA: DatosEntrada = {
  enlaces: [""],
  mensaje: "",
  ciudad: "Medellín",
  textoManual: "",
  archivo: null,
};

const CIUDADES = ["Medellín", "Bogotá", "Cali", "Barranquilla"];

// Atajos para describir al cliente rápido durante la reunión.
const PERFILES: { i: LucideIcon; t: string }[] = [
  { i: Users, t: "Familia con hijos" },
  { i: KeyRound, t: "Primer carro" },
  { i: Briefcase, t: "Ejecutivo" },
  { i: Gem, t: "Busca lujo" },
  { i: Wrench, t: "Trabaja con el carro" },
  { i: Fuel, t: "Prioriza bajo consumo" },
  { i: Landmark, t: "Quiere financiar" },
  { i: BatteryCharging, t: "Prefiere híbrido o eléctrico" },
];

async function archivoACsv(file: File): Promise<{ csv: string; filas: number }> {
  const Papa = (await import("papaparse")).default;
  if (/\.(csv|txt|tsv)$/i.test(file.name)) {
    const texto = await file.text();
    const parsed = Papa.parse<string[]>(texto.trim(), { skipEmptyLines: true });
    return { csv: Papa.unparse(parsed.data.slice(0, 400)), filas: Math.max(0, parsed.data.length - 1) };
  }
  const { readSheet } = await import("read-excel-file/universal");
  const filas = await readSheet(file);
  const datos = filas
    .filter((f) => f.some((c) => c !== null && String(c).trim() !== ""))
    .slice(0, 400)
    .map((f) => f.map((c) => (c instanceof Date ? c.toISOString().slice(0, 10) : c === null ? "" : String(c))));
  return { csv: Papa.unparse(datos), filas: Math.max(0, datos.length - 1) };
}

function Paso({ n, titulo, ayuda, children }: { n: string; titulo: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5 border-t border-linea py-8 first:border-t-0 first:pt-0 md:grid-cols-[14rem_1fr] md:gap-10">
      <div>
        <div className="cifra text-xs font-semibold text-gris-claro">{n}</div>
        <h2 className="titulo mt-1.5 text-xl">{titulo}</h2>
        {ayuda && <p className="mt-2 text-sm leading-relaxed text-gris">{ayuda}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default function FormularioEntrada({
  valor,
  onChange,
  onProcesar,
}: {
  valor: DatosEntrada;
  onChange: (v: DatosEntrada) => void;
  onProcesar: () => void;
}) {
  const [planB, setPlanB] = useState<"texto" | "archivo" | null>(valor.textoManual ? "texto" : valor.archivo ? "archivo" : null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);
  const set = (cambios: Partial<DatosEntrada>) => onChange({ ...valor, ...cambios });

  const numEnlaces = valor.enlaces.filter((l) => l.trim()).length;
  const listo = numEnlaces > 0 || valor.textoManual.trim().length > 20 || valor.archivo !== null;
  const otraCiudad = !CIUDADES.includes(valor.ciudad);

  async function cargarArchivo(file: File | undefined) {
    setErrorArchivo(null);
    if (!file) return;
    try {
      const { csv, filas } = await archivoACsv(file);
      if (!filas) throw new Error("vacío");
      set({ archivo: { nombre: file.name, csv, filas } });
    } catch {
      setErrorArchivo("No se pudo leer el archivo. Usa .xlsx o .csv con una fila de encabezados.");
    }
  }

  function agregarPerfil(p: string) {
    const actual = valor.mensaje.trim();
    if (actual.toLowerCase().includes(p.toLowerCase())) return;
    set({ mensaje: actual ? `${actual.replace(/[.\s]+$/, "")}. ${p}.` : `${p}.` });
  }

  return (
    <form
      className="entrar w-full rounded-[var(--radius-xl)] border border-linea bg-white p-6 shadow-2 sm:p-10"
      onSubmit={(e) => {
        e.preventDefault();
        if (listo) onProcesar();
      }}
    >
      <Paso n="01" titulo="Los carros" ayuda="Pega el enlace de cada carro o de un catálogo completo. Uno por cajón.">
        <CajonesEnlaces valor={valor.enlaces} onChange={(enlaces) => set({ enlaces })} />

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="text-gris">¿El sitio no se deja leer?</span>
          <button type="button" aria-pressed={planB === "texto"} onClick={() => setPlanB(planB === "texto" ? null : "texto")} className="chip">
            Pegar texto manualmente
          </button>
          <button type="button" aria-pressed={planB === "archivo"} onClick={() => setPlanB(planB === "archivo" ? null : "archivo")} className="chip">
            Subir inventario Excel/CSV
          </button>
        </div>

        {planB === "texto" && (
          <textarea
            rows={6}
            className="campo entrar mt-3 resize-y text-sm"
            placeholder={"Abre la publicación en otra pestaña, presiona Ctrl+A y Ctrl+C, y pega aquí con Ctrl+V.\nPuedes pegar varias publicaciones seguidas: la app separa cada carro."}
            value={valor.textoManual}
            onChange={(e) => set({ textoManual: e.target.value })}
            aria-label="Texto pegado manualmente"
          />
        )}

        {planB === "archivo" && (
          <div className="entrar mt-3">
            <input ref={inputArchivo} type="file" accept=".xlsx,.csv,.tsv,.txt" className="hidden" onChange={(e) => cargarArchivo(e.target.files?.[0])} />
            <div
              onClick={() => inputArchivo.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                cargarArchivo(e.dataTransfer.files?.[0]);
              }}
              className="flex cursor-pointer flex-col items-center gap-1 rounded-[var(--radius-md)] border border-dashed border-linea-fuerte bg-niebla px-4 py-6 text-center transition-colors hover:border-tinta"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && inputArchivo.current?.click()}
            >
              {valor.archivo ? (
                <>
                  <span className="font-semibold">{valor.archivo.nombre}</span>
                  <span className="text-sm text-verde">{valor.archivo.filas} carros listos</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      set({ archivo: null });
                    }}
                    className="mt-1 text-xs text-gris underline"
                  >
                    Quitar archivo
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium">Arrastra el archivo o haz clic para elegirlo</span>
                  <span className="text-xs text-gris">.xlsx o .csv · se analizan hasta 12 carros</span>
                </>
              )}
            </div>
            {errorArchivo && <p className="mt-2 text-sm text-rojo">{errorArchivo}</p>}
          </div>
        )}
      </Paso>

      <Paso n="02" titulo="Tu cliente" ayuda="Quién compra, para qué y cuánto quiere pagar. Con esto se calcula la puntuación.">
        <textarea
          id="mensaje"
          rows={3}
          className="campo resize-y"
          placeholder="Ej. Familia con dos hijos en Medellín, presupuesto de 80 a 110 millones, quiere una SUV automática y segura"
          value={valor.mensaje}
          onChange={(e) => set({ mensaje: e.target.value })}
          aria-label="Contexto del cliente"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {PERFILES.map((p) => {
            const incluido = valor.mensaje.toLowerCase().includes(p.t.toLowerCase());
            return (
              <button type="button" key={p.t} onClick={() => agregarPerfil(p.t)} aria-pressed={incluido} className="chip">
                <p.i className="h-3.5 w-3.5" strokeWidth={1.5} />
                {p.t}
              </button>
            );
          })}
        </div>
      </Paso>

      <Paso n="03" titulo="Ciudad" ayuda="Para comparar los precios con el mercado local.">
        <div className="flex flex-wrap gap-2">
          {CIUDADES.map((c) => {
            const activa = valor.ciudad === c;
            return (
              <button
                type="button"
                key={c}
                onClick={() => set({ ciudad: c })}
                aria-pressed={activa}
                className="chip !min-h-11 !rounded-[var(--radius-md)] !px-4 font-medium"
              >
                {c}
              </button>
            );
          })}
          <input
            className={`campo !w-44 text-sm ${otraCiudad && valor.ciudad ? "!border-tinta" : ""}`}
            placeholder="Otra ciudad"
            value={otraCiudad ? valor.ciudad : ""}
            onChange={(e) => set({ ciudad: e.target.value })}
            aria-label="Otra ciudad"
          />
        </div>
      </Paso>

      <div className="flex flex-col items-stretch gap-4 border-t border-linea pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gris">
          {listo
            ? `${numEnlaces || "Sin"} enlace(s)${valor.textoManual.trim() ? " + texto pegado" : ""}${valor.archivo ? " + inventario" : ""} · ${valor.ciudad || "Colombia"}`
            : "Agrega al menos un carro para empezar."}
        </p>
        <button type="submit" disabled={!listo} className="btn btn-primario btn-lg">
          Analizar carros
        </button>
      </div>
    </form>
  );
}
