const INSTRUMENTS = [
  { id: 'acoustic', label: 'Acoustic', icon: '🎸', ready: true },
  { id: 'electric', label: 'Electric', icon: '⚡', ready: false },
  { id: 'nylon',    label: 'Classical', icon: '🎵', ready: false },
];

export default function InstrumentSelector({ selected, onSelect }) {
  return (
    <div className="card p-4">
      <div className="label mb-3">Instrument</div>
      <div className="flex flex-col gap-1">
        {INSTRUMENTS.map((inst) => (
          <button
            key={inst.id}
            disabled={!inst.ready}
            onClick={() => inst.ready && onSelect(inst.id)}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
              ${!inst.ready ? 'opacity-25 cursor-not-allowed' :
                selected === inst.id
                  ? 'bg-accent/[0.1] text-accent'
                  : 'hover:bg-white/[0.04] text-text-secondary hover:text-text-primary'
              }
            `}
          >
            <span className="text-base">{inst.icon}</span>
            <span className="text-[12px] font-semibold">{inst.label}</span>
            {selected === inst.id && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(232,168,56,0.5)]" />
            )}
            {!inst.ready && <span className="ml-auto text-[8px] font-bold text-text-dim tracking-wider">SOON</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
