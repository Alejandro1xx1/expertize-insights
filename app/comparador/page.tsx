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
    <main className="min-h-dvh">
      <header className="bg-negro">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-8">
          <Link href="/">
            <Marca claro />
          </Link>
          <Link href="/" className="boton-borde px-4 py-2.5 text-[0.7rem] text-white hover:bg-white hover:text-tinta">
            ← Volver
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8">
        {config ? (
          <EditorComparador config={config} />
        ) : (
          <div className="tarjeta entrar mx-auto max-w-xl space-y-5 p-8 text-center">
            <h1 className="titulo text-2xl">Comparadores guardados</h1>
            <p className="text-gris">Carga el JSON que descargaste desde “Así lo vería tu cliente” para mostrarlo de nuevo o ajustarlo para otro cliente.</p>
            <label className="boton-principal inline-block cursor-pointer px-8 py-4 text-xs">
              Elegir archivo JSON
              <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => cargar(e.target.files?.[0])} />
            </label>
            {error && <p className="text-sm text-rojo">{error}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
