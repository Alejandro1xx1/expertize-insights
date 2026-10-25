/** Logotipo TORQUE: wordmark expandido con la línea roja de acento. */
export default function Marca({ claro = false, conLema = true }: { claro?: boolean; conLema?: boolean }) {
  return (
    <div className="leading-none">
      <div className={`display text-[1.15rem] tracking-[0.24em] ${claro ? "text-white" : "text-tinta"}`}>TORQUE</div>
      {conLema && (
        <div className="mt-1.5 hidden items-center gap-2 min-[440px]:flex">
          <span className="h-[2px] w-4 bg-rojo" />
          <span className={`text-[0.55rem] font-semibold uppercase tracking-[0.26em] ${claro ? "text-plata" : "text-gris"}`}>Inteligencia automotriz</span>
        </div>
      )}
    </div>
  );
}
