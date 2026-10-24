import { useId } from "react";

type Acabado = "plata" | "grafito" | "rojo";

const ACABADOS: Record<Acabado, [string, string, string]> = {
  plata: ["#f2f3f4", "#a3a8ae", "#3b3e44"],
  grafito: ["#6b7078", "#2e3136", "#0e0f11"],
  rojo: ["#f0465a", "#c8102e", "#5c0714"],
};

/**
 * Silueta lateral de un sedán deportivo (SVG propio, sin imágenes externas).
 * `enMovimiento` hace girar las ruedas; `luces` agrega el haz de los faros.
 */
export default function Carro({
  acabado = "plata",
  enMovimiento = false,
  luces = false,
  className = "",
}: {
  acabado?: Acabado;
  enMovimiento?: boolean;
  luces?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const [c1, c2, c3] = ACABADOS[acabado];

  const rueda = (cx: number) => (
    <g>
      <circle cx={cx} cy={150} r={34} fill="#0c0c0d" />
      <circle cx={cx} cy={150} r={33} fill="none" stroke="#2b2d31" strokeWidth={2} />
      <circle cx={cx} cy={150} r={22} fill={`url(#rin-${id})`} />
      <g className={enMovimiento ? "rueda-gira" : undefined}>
        <circle cx={cx} cy={150} r={22} fill="none" />
        {[0, 72, 144, 216, 288].map((a) => (
          <line
            key={a}
            x1={cx}
            y1={150}
            x2={cx + 19 * Math.cos((a * Math.PI) / 180)}
            y2={150 + 19 * Math.sin((a * Math.PI) / 180)}
            stroke="#24262a"
            strokeWidth={4.5}
            strokeLinecap="round"
          />
        ))}
      </g>
      <circle cx={cx} cy={150} r={5} fill="#d9dbde" />
      {/* disco de freno */}
      <circle cx={cx} cy={150} r={22} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth={1} />
    </g>
  );

  return (
    <svg viewBox="0 0 600 190" className={className} style={{ overflow: "visible" }} aria-hidden>
      <defs>
        <linearGradient id={`carroceria-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="0.45" stopColor={c2} />
          <stop offset="1" stopColor={c3} />
        </linearGradient>
        <linearGradient id={`vidrio-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a4048" />
          <stop offset="0.5" stopColor="#14171b" />
          <stop offset="1" stopColor="#2a3038" />
        </linearGradient>
        <radialGradient id={`rin-${id}`}>
          <stop offset="0" stopColor="#f5f6f7" />
          <stop offset="0.7" stopColor="#9aa0a7" />
          <stop offset="1" stopColor="#4a4e55" />
        </radialGradient>
        <linearGradient id={`haz-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(255,250,235,.55)" />
          <stop offset="1" stopColor="rgba(255,250,235,0)" />
        </linearGradient>
        <radialGradient id={`sombra-${id}`}>
          <stop offset="0" stopColor="rgba(0,0,0,.55)" />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      {luces && <polygon points="566,112 900,70 900,170" fill={`url(#haz-${id})`} />}

      <ellipse cx={305} cy={184} rx={290} ry={12} fill={`url(#sombra-${id})`} />

      {/* carrocería */}
      <path
        d="M40 150 L36 128 C36 114 44 106 60 103 L118 96 C150 92 180 70 222 58 C262 47 330 44 372 50 C404 55 430 70 452 86 L532 98 C556 101 568 110 570 124 L572 142 C572 148 568 150 562 150 L512 150 A42 42 0 0 0 428 150 L192 150 A42 42 0 0 0 108 150 Z"
        fill={`url(#carroceria-${id})`}
      />
      {/* vidrios */}
      <path
        d="M130 97 C162 92 190 74 228 64 C266 54 326 52 366 57 C392 61 414 72 432 87 Z"
        fill={`url(#vidrio-${id})`}
      />
      <path d="M298 54 L306 54 L304 93 L296 93 Z" fill={c3} opacity={0.9} />
      {/* reflejo en el vidrio */}
      <path d="M236 66 C270 58 320 56 352 60 L346 66 C316 63 276 64 244 71 Z" fill="rgba(255,255,255,.18)" />
      {/* línea de hombro y detalles */}
      <path d="M66 112 C200 103 380 99 548 108" stroke="rgba(255,255,255,.45)" strokeWidth={1.6} fill="none" />
      <path d="M300 97 L300 142 M200 99 L198 142" stroke="rgba(0,0,0,.25)" strokeWidth={1.2} fill="none" />
      <path d="M194 144 L426 144" stroke="rgba(0,0,0,.35)" strokeWidth={3} />
      <path d="M318 106 L334 106" stroke="rgba(0,0,0,.35)" strokeWidth={2.2} strokeLinecap="round" />
      <path d="M212 108 L226 108" stroke="rgba(0,0,0,.35)" strokeWidth={2.2} strokeLinecap="round" />
      {/* espejo */}
      <path d="M428 84 L444 82 L446 90 L430 92 Z" fill={c2} />
      {/* faro y stop */}
      <path d="M538 104 L566 112 L561 119 L537 112 Z" fill="#fffaf0" />
      <path d="M538 104 L566 112 L561 119 L537 112 Z" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth={0.8} />
      <path d="M37 110 L60 105 L61 113 L39 118 Z" fill="#e3122f" />

      {rueda(150)}
      {rueda(470)}
    </svg>
  );
}
