/** Logotipo TORQUE: wordmark expandido con la barra roja de acento. */
export default function Marca({ claro = false, conLema = true }: { claro?: boolean; conLema?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="leading-none">
        <div className={`titulo text-[1.35rem] tracking-[0.22em] ${claro ? "text-white" : "text-tinta"}`}>
          TORQUE
        </div>
        {conLema && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="h-[3px] w-5 bg-rojo" />
            <span className={`etiqueta !text-[0.55rem] !tracking-[0.28em] ${claro ? "text-plata" : "text-gris"}`}>
              Inteligencia automotriz
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
