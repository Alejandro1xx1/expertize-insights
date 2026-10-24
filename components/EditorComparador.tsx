"use client";

import { useEffect, useState } from "react";
import type { ComparadorConfig } from "@/lib/schemas";
import { slug } from "@/lib/slug";
import Comparador from "./Comparador";

export function descargarJSON(nombre: string, datos: unknown) {
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const COLORES = ["#C8102E", "#111214", "#1F3A93", "#0E6B5C", "#A8834A", "#5E636B", "#E85D04"];

/** Comparador + controles para personalizar marca y descargar el JSON. */
export default function EditorComparador({
  config: inicial,
  onCerrar,
}: {
  config: ComparadorConfig;
  onCerrar?: () => void;
}) {
  const [config, setConfig] = useState(inicial);
  useEffect(() => setConfig(inicial), [inicial]);

  useEffect(() => {
    if (!onCerrar) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [onCerrar]);

  const marca = (cambios: Partial<ComparadorConfig["marca"]>) =>
    setConfig((c) => ({ ...c, marca: { ...c.marca, ...cambios } }));

  const contenido = (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="tarjeta flex flex-col gap-4 p-4 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label className="etiqueta mb-1.5 block !text-[0.6rem] text-gris" htmlFor="marca-nombre">
            Nombre de la marca
          </label>
          <input id="marca-nombre" className="campo !py-2" value={config.marca.nombre} onChange={(e) => marca({ nombre: e.target.value })} />
        </div>
        <div className="flex-1">
          <label className="etiqueta mb-1.5 block !text-[0.6rem] text-gris" htmlFor="marca-logo">
            Logo (URL, opcional)
          </label>
          <input
            id="marca-logo"
            className="campo !py-2"
            placeholder="https://…/logo.png"
            value={config.marca.logoUrl ?? ""}
            onChange={(e) => marca({ logoUrl: e.target.value.trim() || null })}
          />
        </div>
        <div>
          <span className="etiqueta mb-1.5 block !text-[0.6rem] text-gris">Color principal</span>
          <div className="flex items-center gap-2">
            {COLORES.map((c) => (
              <button
                key={c}
                onClick={() => marca({ colorPrincipal: c })}
                aria-label={`Color ${c}`}
                className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                style={{ background: c, borderColor: config.marca.colorPrincipal.toLowerCase() === c.toLowerCase() ? "#111214" : "#fff", boxShadow: "0 0 0 1px #e2e2de" }}
              />
            ))}
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(config.marca.colorPrincipal) ? config.marca.colorPrincipal : "#c8102e"}
              onChange={(e) => marca({ colorPrincipal: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border border-linea bg-transparent"
              aria-label="Color personalizado"
            />
          </div>
        </div>
        <button
          onClick={() => descargarJSON(`comparador-${slug(config.marca.nombre) || "cliente"}.json`, config)}
          className="boton-borde px-4 py-3 text-[0.7rem] text-tinta hover:bg-tinta hover:text-white"
        >
          ⤓ Descargar JSON
        </button>
      </div>
      <Comparador config={config} />
    </div>
  );

  if (!onCerrar) return contenido;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-niebla" role="dialog" aria-modal="true" aria-label="Así lo vería tu cliente">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-negro px-4 py-4 text-white sm:px-8">
        <div>
          <div className="etiqueta !text-[0.6rem] text-plata">Vista previa</div>
          <div className="titulo text-base">Así lo vería tu cliente</div>
        </div>
        <button onClick={onCerrar} className="boton-borde px-4 py-2.5 text-[0.7rem] text-white hover:bg-white hover:text-tinta">
          Cerrar ✕
        </button>
      </div>
      <div className="px-4 py-6 sm:px-6">{contenido}</div>
    </div>
  );
}
