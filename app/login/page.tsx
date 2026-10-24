"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
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
    <form onSubmit={entrar} className="vidrio entrar w-full max-w-sm space-y-5 p-7">
      <Marca />
      <div>
        <h1 className="text-xl font-semibold">Acceso privado</h1>
        <p className="mt-1 text-sm text-tenue">Ingresa la contraseña del equipo para continuar.</p>
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
      {error && <p className="text-sm text-peligro">{error}</p>}
      <button type="submit" disabled={cargando || !password} className="boton-procesar w-full py-3 text-base">
        {cargando ? "Verificando…" : "Entrar"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Suspense>
        <Formulario />
      </Suspense>
    </main>
  );
}
