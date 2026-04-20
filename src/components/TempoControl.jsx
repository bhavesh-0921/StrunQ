export default function TempoControl({ bpm, onBPMChange }) {
  return (
    <div className="card p-4">
      <div className="label mb-3">Tempo</div>
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-black tabular-nums tracking-tight text-accent leading-none" style={{ fontFamily: 'var(--font-mono)' }}>{bpm}</span>
        <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider">BPM</span>
      </div>
      <input
        type="range" min="40" max="220" value={bpm}
        onChange={(e) => onBPMChange(parseInt(e.target.value))}
        className="w-full mb-4"
      />
      <div className="flex gap-2">
        {[{l:'Slow',v:80},{l:'Mid',v:120},{l:'Fast',v:160}].map(p => (
          <button
            key={p.l}
            onClick={() => onBPMChange(p.v)}
            className={`flex-1 py-2 rounded-[10px] text-[11px] font-bold transition-all
              ${bpm === p.v
                ? 'bg-accent/[0.12] text-accent ring-1 ring-accent/30 shadow-sm'
                : 'bg-white/[0.03] text-text-dim hover:bg-white/[0.05] hover:text-text-secondary border border-white/[0.04]'
              }
            `}
          >{p.l}</button>
        ))}
      </div>
    </div>
  );
}
