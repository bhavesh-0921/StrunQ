import { STRUM_TYPES } from '../audio/chord-data.js';

const STROKES = [
  { key: 'D', icon: '↓', name: 'Down' },
  { key: 'U', icon: '↑', name: 'Up' },
  { key: 'd', icon: '↓', name: 'Ghost ↓', ghost: true },
  { key: 'u', icon: '↑', name: 'Ghost ↑', ghost: true },
  { key: 'x', icon: '✕', name: 'Mute' },
  { key: 'c', icon: '✋', name: 'Chuck' },
  { key: 's', icon: '👊', name: 'Slap' },
];

function stepColor(key) {
  if (key === 'D' || key === 'U') return { bg: 'bg-accent2/[0.12]', border: 'border-accent2/25', text: 'text-accent2' };
  if (key === 'd' || key === 'u') return { bg: 'bg-white/[0.03]', border: 'border-white/[0.06]', text: 'text-text-dim' };
  if (key === 'x') return { bg: 'bg-danger/[0.08]', border: 'border-danger/20', text: 'text-danger' };
  return { bg: 'bg-accent/[0.08]', border: 'border-accent/20', text: 'text-accent' };
}

export default function StrumPatternBuilder({ pattern, onAdd, onRemove, onClear }) {
  return (
    <div className="card p-5 lg:p-6 animate-[float-in_0.45s_ease-out]">
      <div className="label mb-3">Strum Pattern</div>

      {/* Stroke Picker */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {STROKES.map(({ key, icon, name, ghost }) => (
          <button
            key={key}
            onClick={() => onAdd(key)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.04]
              bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.08]
              active:scale-90 transition-all duration-200
              ${ghost ? 'opacity-40 hover:opacity-80' : ''}
            `}
          >
            <span className="text-[16px] leading-none">{icon}</span>
            <span className="text-[10px] font-semibold text-text-dim">{name}</span>
          </button>
        ))}
      </div>

      {/* Built Steps */}
      {pattern.length === 0 ? (
        <div className="flex items-center justify-center h-14 rounded-xl border border-dashed border-white/[0.05] bg-white/[0.01]">
          <p className="text-[11px] text-text-dim italic">Tap strokes to build your rhythm</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-black/20 border border-white/[0.03]">
          {pattern.map((s, i) => {
            const c = stepColor(s);
            const stroke = STROKES.find(st => st.key === s);
            return (
              <div key={i} className={`flex flex-col items-center justify-center w-9 h-11 rounded-lg border ${c.bg} ${c.border}`}>
                <span className="text-[7px] font-mono opacity-30">{String(i+1).padStart(2,'0')}</span>
                <span className={`text-[14px] font-bold leading-none ${c.text}`}>{stroke?.icon || '?'}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center mt-3 gap-4">
        <button onClick={onRemove} disabled={!pattern.length} className="text-[10px] font-semibold text-text-dim hover:text-text-primary disabled:opacity-10 transition-all">Undo</button>
        <button onClick={onClear} disabled={!pattern.length} className="text-[10px] font-semibold text-text-dim hover:text-danger disabled:opacity-10 transition-all">Clear</button>
        <span className="ml-auto text-[10px] font-mono text-text-dim">{pattern.length} steps</span>
      </div>
    </div>
  );
}
