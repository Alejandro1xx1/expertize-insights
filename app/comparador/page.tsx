"use client";

import Link from "next/link";
import { useState } from "react";
import EditorComparador from "@/components/EditorComparador";
import Marca from "@/components/Marca";
import { ComparadorConfigSchema, type ComparadorConfig } from "@/lib/schemas";

/** Abre un comparador guardado (JSON descargado antes) para reutilizarlo con un cliente. */
export default function ComparadorPage() {
  const [config, setConfig] = useState<ComparadorConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cargar(file: File | undefined) {
    setError(null);
    if (!file) return;
    try {
      const parsed = ComparadorConfigSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) throw new Error();
      setConfig(parsed.data);
    } catch {
      setError("El archivo no es un JSON de comparador válido.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-5 sm:px-6">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/">
          <Marca />
        </Link>
        <Link href="/" className="boton-secundario px-3.5 py-2 text-sm">
          ← Volver
        </Link>
      </header>
      {config ? (
        <EditorComparador config={config} />
      ) : (
        <div className="vidrio entrar mx-auto max-w-xl space-y-4 p-6 text-center">
          <h1 className="text-2xl font-bold">Abrir comparador guardado</h1>
          <p className="text-tenue">Carga el JSON que descargaste desde “Así lo vería tu cliente” para mostrarlo de nuevo o ajustarlo para otro cliente.</p>
          <label className="boton-procesar inline-block cursor-pointer px-6 py-3">
            Elegir archivo JSON
            <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => cargar(e.target.files?.[0])} />
          </label>
          {error && <p className="text-sm text-peligro">{error}</p>}
        </div>
      )}
    </div>
  );
}
