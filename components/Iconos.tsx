import { norm } from "@/lib/numeros";

const P: Record<string, string> = {
  ano: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  kilometraje: "M4 16a8 8 0 1 1 16 0M12 16l4-5M12 16h.01",
  motor: "M4 9h3l2-2h5l2 2h2v3h2v-2h1v6h-1v-2h-2v3h-3l-2 2H9l-2-2H4zM9 7V5h5v2",
  potencia: "M13 2 5 14h6l-1 8 8-12h-6z",
  transmision: "M6 5v14M12 5v14M18 5v7M6 12h12",
  combustible: "M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h14M15 9h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3M7 7h6v4H7z",
  traccion: "M5 7h4M15 7h4M5 17h4M15 17h4M7 7v10M17 7v10M7 12h10",
  carroceria: "M3 15v-3l2-4h11l4 4h1v3M6 15a2 2 0 1 0 4 0M14 15a2 2 0 1 0 4 0M10 15h4",
  color: "M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-1.2-1-1.5-1-2.5s.8-1.5 1.8-1.5H17a4 4 0 0 0 4-4c0-4.7-4-8.5-9-8.5zM7.5 11h.01M10 7h.01M15 7h.01",
  puertas: "M6 3h10l3 4v14H6zM14 13h2",
  airbags: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z",
  ubicacion: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  placa: "M3 7h18v10H3zM7 12h2M11 12h2M15 12h2",
  "unico dueno": "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  garantia: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6zM9 12l2 2 4-4",
  consumo: "M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h14M7 7h6v4H7z",
  precio: "M12 2v20M17 6.5C17 4.6 14.8 3.5 12 3.5S7 4.6 7 6.5 9 9.4 12 10s5 1.8 5 3.8-2.2 3.2-5 3.2-5-1.2-5-3.2",
  puntuacion: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  mercado: "M4 19V9M10 19V5M16 19v-7M22 19H2",
  ideal: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
};

const POR_DEFECTO = "M12 4v16M4 12h16";

/** Ícono lineal para una característica del carro (por nombre de la clave). */
export default function Icono({ nombre, className = "h-4 w-4" }: { nombre: string; className?: string }) {
  const d = P[norm(nombre)] ?? POR_DEFECTO;
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
