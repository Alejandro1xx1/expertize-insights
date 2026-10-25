"use client";

import { useState } from "react";
import { LogOut, TrendingUp, Users } from "lucide-react";
import DatosMercado from "@/components/admin/DatosMercado";
import GestionAsesores from "@/components/admin/GestionAsesores";
import Encabezado from "@/components/Encabezado";

const PESTAÑAS = [
  { id: "asesores", label: "Asesores", Icon: Users },
  { id: "mercado", label: "Datos de mercado", Icon: TrendingUp },
] as const;

export default function AdminPage() {
  const [pestaña, setPestaña] = useState<(typeof PESTAÑAS)[number]["id"]>("asesores");
  return (
    <main className="min-h-dvh">
      <div className="bg-negro">
        <Encabezado oscuro />
      </div>
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="entrar mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="etiqueta text-gris">Administración</div>
            <h1 className="titulo mt-2.5 text-[2rem] sm:text-[2.5rem]">Configuración del concesionario</h1>
          </div>
          <form action="/api/logout" method="post">
            <button className="btn btn-fantasma">
              <LogOut className="h-4 w-4" strokeWidth={1.5} /> Cerrar sesión
            </button>
          </form>
        </div>

        <div className="mb-8 flex gap-2" role="tablist">
          {PESTAÑAS.map((p) => (
            <button key={p.id} type="button" role="tab" aria-selected={pestaña === p.id} onClick={() => setPestaña(p.id)} className="chip !min-h-10 font-medium">
              <p.Icon className="h-4 w-4" strokeWidth={1.5} /> {p.label}
            </button>
          ))}
        </div>

        <div key={pestaña} className="entrar">
          {pestaña === "asesores" ? <GestionAsesores /> : <DatosMercado />}
        </div>
      </div>
    </main>
  );
}
