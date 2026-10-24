"use client";

import { useRef, useState } from "react";
import { INDUSTRIAS, type IndustriaId } from "@/lib/schemas";
import CajonesEnlaces from "./CajonesEnlaces";

export type DatosEntrada = {
  enlaces: string[];
  mensaje: string;
  industria: IndustriaId;
  ciudad: string;
  textoManual: string;
  archivo: { nombre: string; csv: string; filas: number } | null;
};

export const ENTRADA_VACIA: DatosEntrada = {
  enlaces: [""],
  mensaje: "",
  industria: "carros",
  ciudad: "Medellín",
  textoManual: "",
  archivo: null,
};

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

  return (
    <form
      className="vidrio entrar mx-auto w-full max-w-3xl space-y-6 p-5 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (listo) onProcesar();
      }}
    >
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="etiqueta">Enlaces de productos o catálogo</span>
          <span className="font-mono text-xs text-tenue">{numEnlaces} enlace(s) · uno por cajón</span>
        </div>
        <CajonesEnlaces valor={valor.enlaces} onChange={(enlaces) => set({ enlaces })} />
      </div>

      <div>
        <label htmlFor="mensaje" className="etiqueta mb-2 block">
          Contexto del prospecto
        </label>
        <textarea
          id="mensaje"
          rows={3}
          className="campo resize-y"
          placeholder="Ej. Concesionario de usados en Medellín, familias con presupuesto de 60 a 100 millones"
          value={valor.mensaje}
          onChange={(e) => set({ mensaje: e.target.value })}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-[1fr_14rem]">
        <fieldset>
          <legend className="etiqueta mb-2">Industria</legend>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIAS.map((i) => {
              const activa = valor.industria === i.id;
              return (
                <button
                  type="button"
                  key={i.id}
                  onClick={() => set({ industria: i.id })}
                  aria-pressed={activa}
                  className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-all ${
                    activa
                      ? "border-cian bg-cian/15 text-white shadow-[0_0_16px_-4px_rgba(0,229,255,.6)]"
                      : "border-white/10 bg-white/[.03] text-tenue hover:border-cian/40 hover:text-white"
                  }`}
                >
                  {i.label}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div>
          <label htmlFor="ciudad" className="etiqueta mb-2 block">
            Ciudad
          </label>
          <input
            id="ciudad"
            className="campo"
            list="ciudades"
            placeholder="Medellín"
            value={valor.ciudad}
            onChange={(e) => set({ ciudad: e.target.value })}
          />
          <datalist id="ciudades">
            {["Medellín", "Bogotá", "Cali", "Barranquilla", "Cartagena", "Bucaramanga", "Pereira"].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-oro/35 bg-oro/[.04] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="etiqueta mr-1 !text-oro-claro">Plan B</span>
          <span className="mr-auto text-sm text-tenue">Si un sitio no se deja leer:</span>
          <button
            type="button"
            onClick={() => setPlanB(planB === "texto" ? null : "texto")}
            className={`rounded-lg border px-3 py-1.5 text-sm ${planB === "texto" ? "border-oro text-oro-claro" : "border-white/15 text-[#dfe7ec] hover:border-oro/60"}`}
          >
            Pegar texto manualmente
          </button>
          <button
            type="button"
            onClick={() => setPlanB(planB === "archivo" ? null : "archivo")}
            className={`rounded-lg border px-3 py-1.5 text-sm ${planB === "archivo" ? "border-oro text-oro-claro" : "border-white/15 text-[#dfe7ec] hover:border-oro/60"}`}
          >
            Subir Excel/CSV del inventario
          </button>
        </div>

        {planB === "texto" && (
          <textarea
            rows={5}
            className="campo entrar mt-3 resize-y text-sm"
            placeholder="Copia y pega aquí el texto de la página (nombre, precio, características)…"
            value={valor.textoManual}
            onChange={(e) => set({ textoManual: e.target.value })}
            aria-label="Texto pegado manualmente"
          />
        )}

        {planB === "archivo" && (
          <div className="entrar mt-3">
            <input
              ref={inputArchivo}
              type="file"
              accept=".xlsx,.csv,.tsv,.txt"
              className="hidden"
              onChange={(e) => cargarArchivo(e.target.files?.[0])}
            />
            <div
              onClick={() => inputArchivo.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                cargarArchivo(e.dataTransfer.files?.[0]);
              }}
              className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-white/10 bg-black/30 px-4 py-5 text-center hover:border-oro/50"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && inputArchivo.current?.click()}
            >
              {valor.archivo ? (
                <>
                  <span className="font-medium">{valor.archivo.nombre}</span>
                  <span className="font-mono text-xs text-ok">{valor.archivo.filas} filas listas</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      set({ archivo: null });
                    }}
                    className="mt-1 text-xs text-tenue underline"
                  >
                    Quitar archivo
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm">Arrastra el archivo o haz clic para elegirlo</span>
                  <span className="font-mono text-xs text-tenue">.xlsx o .csv · se usan hasta 12 productos</span>
                </>
              )}
            </div>
            {errorArchivo && <p className="mt-2 text-sm text-peligro">{errorArchivo}</p>}
          </div>
        )}
      </div>

      <button type="submit" disabled={!listo} className="boton-procesar w-full py-4 text-lg">
        Procesar
      </button>
    </form>
  );
}
