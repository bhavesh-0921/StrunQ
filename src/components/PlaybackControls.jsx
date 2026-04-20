export default function PlaybackControls({ isPlaying, onPlay, onStop, canPlay }) {
  return (
    <div className="flex items-center gap-3">
      <button
        id="play-stop-btn"
        onClick={isPlaying ? onStop : onPlay}
        disabled={!canPlay && !isPlaying}
        className={`
          flex items-center gap-2.5 h-11 px-8 rounded-full
          text-[11px] font-bold tracking-wider uppercase
          transition-all duration-300 ease-out
          disabled:opacity-15 disabled:cursor-not-allowed
          ${isPlaying
            ? 'bg-danger/90 text-white hover:bg-danger shadow-lg shadow-danger/20'
            : 'bg-accent text-black hover:brightness-110 shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:scale-[1.02]'
          }
        `}
      >
        <span className="text-sm">{isPlaying ? '■' : '▶'}</span>
        {isPlaying ? 'Stop' : 'Play'}
      </button>
    </div>
  );
}
