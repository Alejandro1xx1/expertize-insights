import Carro from "./Carro";

/** Edificios deterministas (sin Math.random, para evitar diferencias servidor/cliente). */
function skyline(semilla: number, alto: number, ancho = 1200) {
  const edificios: { x: number; w: number; h: number }[] = [];
  let x = 0;
  let s = semilla;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  while (x < ancho) {
    const w = 26 + rnd() * 54;
    edificios.push({ x, w, h: alto * (0.25 + rnd() * 0.75) });
    x += w + 2 + rnd() * 6;
  }
  return edificios;
}

function Ciudad({ semilla, alto, color, ventanas, className }: { semilla: number; alto: number; color: string; ventanas: boolean; className: string }) {
  const e = skyline(semilla, alto);
  const capa = (dx: number) =>
    e.map((b, i) => (
      <g key={`${dx}-${i}`}>
        <rect x={b.x + dx} y={alto - b.h} width={b.w} height={b.h} fill={color} />
        {ventanas &&
          Array.from({ length: Math.floor(b.h / 22) }).map((_, f) =>
            (i + f) % 3 === 0 ? (
              <rect key={f} x={b.x + dx + 6 + ((f * 7) % Math.max(1, b.w - 14))} y={alto - b.h + 10 + f * 22} width={4} height={6} fill="rgba(255,214,150,.35)" />
            ) : null,
          )}
      </g>
    ));
  return (
    <svg viewBox={`0 0 2400 ${alto}`} preserveAspectRatio="none" className={className} aria-hidden>
      {capa(0)}
      {capa(1200)}
    </svg>
  );
}

/** Escena nocturna en movimiento: ciudad con parallax, carretera y el carro rodando. */
export default function EscenaHero({ compacta = false }: { compacta?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-negro" aria-hidden>
      {/* cielo */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_70%_75%,rgba(200,16,46,.16),transparent_60%),radial-gradient(ellipse_70%_60%_at_30%_80%,rgba(167,172,179,.10),transparent_70%)]" />

      {/* ciudad: dos capas a distinta velocidad */}
      <div className={`absolute inset-x-0 ${compacta ? "bottom-[30%] h-[32%]" : "bottom-[26%] h-[38%]"} opacity-70`}>
        <Ciudad semilla={7} alto={300} color="#141518" ventanas={false} className="ciudad-lenta absolute bottom-0 h-full w-[200%]" />
      </div>
      <div className={`absolute inset-x-0 ${compacta ? "bottom-[30%] h-[22%]" : "bottom-[26%] h-[26%]"}`}>
        <Ciudad semilla={31} alto={220} color="#1c1d21" ventanas className="ciudad-media absolute bottom-0 h-full w-[200%]" />
      </div>

      {/* carretera */}
      <div className={`absolute inset-x-0 bottom-0 ${compacta ? "h-[30%]" : "h-[26%]"} bg-gradient-to-b from-[#121315] to-[#060607]`}>
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
        <div className="carril absolute inset-x-0 top-[38%] h-[3px] opacity-60" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
      </div>

      {/* estelas de luz */}
      <div className={`absolute inset-x-0 ${compacta ? "bottom-[24%]" : "bottom-[20%]"} h-24`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="estela absolute h-px w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            style={{ top: `${10 + i * 22}%`, left: "60%", animationDelay: `${i * 0.27}s` }}
          />
        ))}
      </div>

      {/* carro */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 ${
          compacta ? "bottom-[17%] w-[min(560px,80vw)]" : "bottom-[21%] w-[min(700px,92vw)] md:left-[64%]"
        }`}
      >
        <div className="flotar">
          <Carro acabado="plata" enMovimiento luces className="w-full" />
        </div>
      </div>

      {/* viñeta para leer el texto encima */}
      <div className="absolute inset-0 bg-gradient-to-r from-negro via-negro/70 to-transparent md:via-negro/40" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-negro to-transparent" />
    </div>
  );
}
