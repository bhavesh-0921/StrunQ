export default function CapoSelector({ capo, onCapoChange, progression }) {
  return (
    <div className="card p-4">
      <div className="label mb-3">Capo</div>
      <div className="grid grid-cols-4 gap-2">
        {[0,1,2,3,4,5,6,7].map((fret) => (
          <button
            key={fret}
            onClick={() => onCapoChange(fret)}
            className={`
              h-10 rounded-[10px] text-[12px] font-bold transition-all duration-200
              ${capo === fret
                ? 'bg-accent text-black shadow-[0_4px_12px_rgba(232,168,56,0.3)]'
                : 'bg-white/[0.03] text-text-secondary hover:bg-white/[0.06] hover:text-text-primary border border-white/[0.04]'
              }
            `}
          >
            {fret === 0 ? 'Off' : fret}
          </button>
        ))}
      </div>
    </div>
  );
}
