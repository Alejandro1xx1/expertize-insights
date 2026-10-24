export default function Marca({ pequeña = false }: { pequeña?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 64 64" className={pequeña ? "h-8 w-8" : "h-10 w-10"} aria-hidden>
        <rect width="64" height="64" rx="14" fill="#0B0F16" stroke="rgba(0,229,255,.35)" />
        <path d="M18 20h28M18 32h20M18 44h28" stroke="#00E5FF" strokeWidth="5" strokeLinecap="round" />
        <circle cx="46" cy="32" r="4" fill="#D4A017" />
      </svg>
      <div className="leading-tight">
        <div className={`font-titulo font-bold tracking-tight ${pequeña ? "text-base" : "text-lg"}`}>
          Expertize <span className="text-cian">Insights</span>
        </div>
        {!pequeña && <div className="etiqueta !text-[0.6rem] !text-tenue">Centro de mando comercial</div>}
      </div>
    </div>
  );
}
