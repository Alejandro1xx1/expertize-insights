"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import PortadaFoto from "@/components/PortadaFoto";
import Marca from "@/components/Marca";

function Formulario() {
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => null))?.error ?? "No se pudo ingresar.");
        return;
      }
      const destino = params.get("next");
      window.location.href = destino && destino.startsWith("/") && !destino.startsWith("//") ? destino : "/";
    } catch {
      setError("Sin conexión. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={entrar} className="entrar w-full space-y-7 rounded-[var(--radius-xl)] bg-white p-8 shadow-3 sm:p-10">
      <Marca />
      <div>
        <h1 className="titulo text-2xl">Acceso privado</h1>
        <p className="mt-2 text-sm text-gris">Ingresa la contraseña del equipo para continuar.</p>
      </div>
      <input
        type="password"
        autoFocus
        className="campo"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        aria-label="Contraseña"
      />
      {error && <p className="text-sm text-rojo">{error}</p>}
      <button type="submit" disabled={cargando || !password} className="btn btn-primario btn-lg w-full">
        {cargando ? "Verificando…" : "Entrar"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-negro px-4">
      <PortadaFoto />
      <div className="relative z-10 w-full max-w-md">
        <Suspense>
          <Formulario />
        </Suspense>
      </div>
    </main>
  );
}
