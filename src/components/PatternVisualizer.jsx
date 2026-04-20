import { STRUM_TYPES } from '../audio/chord-data.js';

export default function PatternVisualizer({ pattern, currentBeatIndex, isPlaying }) {
  if (!pattern.length) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="label">Pattern</span>
        <span className="text-[10px] text-text-dim">—</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {pattern.map((s, i) => {
        const type = STRUM_TYPES[s];
        const isActive = isPlaying && i === currentBeatIndex;
        const isDown = type?.direction === 'down';
        return (
          <div
            key={i}
            className={`
              w-1.5 rounded-full transition-all duration-150
              ${isActive
                ? 'bg-accent h-6 shadow-[0_0_6px_rgba(232,168,56,0.5)]'
                : type?.skip
                  ? 'bg-white/[0.04] h-2'
                  : isDown ? 'bg-white/[0.12] h-4' : 'bg-white/[0.08] h-3'
              }
            `}
          />
        );
      })}
    </div>
  );
}
