"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Marca from "./Marca";

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/clientes", label: "Clientes" },
  { href: "/admin", label: "Admin" },
];

/**
 * Encabezado común. Tocar el logo o "Inicio" siempre empieza una atención nueva
 * (recarga la raíz para limpiar el estado).
 */
export default function Encabezado({ oscuro = false, children }: { oscuro?: boolean; children?: React.ReactNode }) {
  const ruta = usePathname();
  const base = oscuro ? "text-plata hover:text-white" : "text-gris hover:text-tinta";
  const activo = oscuro ? "text-white" : "text-tinta";
  return (
    <header className="relative z-20 mx-auto w-full max-w-7xl px-5 sm:px-8">
      <div className="flex h-20 items-center justify-between gap-4">
        <a href="/" aria-label="TORQUE · Inicio" className="shrink-0">
          <Marca claro={oscuro} />
        </a>
        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV.map((n) => {
            const esActivo = n.href === "/" ? ruta === "/" : ruta.startsWith(n.href);
            const clase = `enlace-suave rounded-md px-2 py-2 text-sm font-medium sm:px-3 ${esActivo ? activo : base}`;
            return n.href === "/" ? (
              <a key={n.href} href="/" className={clase}>
                {n.label}
              </a>
            ) : (
              <Link key={n.href} href={n.href} className={clase}>
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </header>
  );
}
