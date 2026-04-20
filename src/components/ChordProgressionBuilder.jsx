import { AVAILABLE_CHORDS } from '../audio/chord-data.js';

export default function ChordProgressionBuilder({
  progression, onAdd, onRemove, currentChordIndex, isPlaying,
}) {
  return (
    <div className="card p-5 lg:p-6 animate-[float-in_0.4s_ease-out]">
      {/* Chord Picker */}
      <div className="flex items-center justify-between mb-3">
        <div className="label !mb-0">Chords</div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-6">
        {AVAILABLE_CHORDS.map((chord) => (
          <button
            key={chord}
            onClick={() => onAdd(chord)}
            className="chord-pad h-9 px-4 text-[12px]"
          >
            {chord}
          </button>
        ))}
      </div>

      {/* Active Progression */}
      <div className="flex items-center justify-between mb-3">
        <div className="label !mb-0">Your Progression</div>
        {progression.length > 0 && (
          <button
            onClick={() => { for (let i = progression.length - 1; i >= 0; i--) onRemove(i); }}
            className="text-[10px] font-semibold text-text-dim hover:text-danger transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {progression.length === 0 ? (
        <div className="flex items-center justify-center h-24 rounded-xl border border-dashed border-white/[0.06] bg-white/[0.01]">
          <p className="text-[12px] text-text-dim">Tap chords above to start building</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {progression.map((chord, i) => (
            <button
              key={`${chord}-${i}`}
              onClick={() => onRemove(i)}
              className={`perf-pad w-[68px] h-[68px] sm:w-[76px] sm:h-[76px] ${isPlaying && currentChordIndex === i ? 'active' : ''}`}
            >
              <span className="absolute top-1.5 left-2.5 text-[8px] font-mono text-white/[0.15]">{i + 1}</span>
              <span className={`text-[18px] sm:text-[20px] font-bold transition-all ${
                isPlaying && currentChordIndex === i ? 'text-accent scale-110' : 'text-text-primary'
              }`}>{chord}</span>
            </button>
          ))}
        </div>
      )}

      {progression.length > 0 && (
        <div className="mt-4 text-center text-[10px] font-semibold text-text-dim">
          {progression.length} chord{progression.length > 1 ? 's' : ''} · looping
        </div>
      )}
    </div>
  );
}
