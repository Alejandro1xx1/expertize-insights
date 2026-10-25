import {
  BadgeCheck,
  Banknote,
  BarChart3,
  Calendar,
  Car,
  CarFront,
  Cog,
  DoorOpen,
  Droplet,
  Fuel,
  Gauge,
  KeyRound,
  type LucideIcon,
  MapPin,
  Palette,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  Zap,
  CircleDot,
  RectangleHorizontal,
  Workflow,
  Cpu,
  Sofa,
} from "lucide-react";
import { norm } from "@/lib/numeros";

/** Un solo set de íconos de línea fina (Lucide) para toda la app. */
const MAPA: Record<string, LucideIcon> = {
  ano: Calendar,
  kilometraje: Gauge,
  condicion: BadgeCheck,
  motor: Cog,
  potencia: Zap,
  transmision: Workflow,
  combustible: Fuel,
  traccion: CircleDot,
  carroceria: CarFront,
  color: Palette,
  puertas: DoorOpen,
  airbags: Shield,
  ubicacion: MapPin,
  placa: RectangleHorizontal,
  "unico dueno": KeyRound,
  garantia: ShieldCheck,
  consumo: Droplet,
  version: Car,
  precio: Banknote,
  puntuacion: Star,
  mercado: BarChart3,
  ideal: User,
  // dimensiones del radar
  seguridad: Shield,
  confort: Sofa,
  desempeno: Zap,
  eficiencia: Fuel,
  tecnologia: Cpu,
  calidadprecio: Banknote,
};

export function iconoPara(nombre: string): LucideIcon {
  return MAPA[norm(nombre).replace(/[^a-z ]/g, "")] ?? Sparkles;
}

/** Ícono lineal para una característica del carro (por nombre de la clave). */
export default function Icono({ nombre, className = "h-4 w-4" }: { nombre: string; className?: string }) {
  const C = iconoPara(nombre);
  return <C className={className} strokeWidth={1.5} aria-hidden />;
}
