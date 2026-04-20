export default function Header({ isHumanized, onToggleHumanize }) {
  return (
    <header className="relative px-6 flex items-center justify-between bg-bg-deep/80 backdrop-blur-xl border-b border-white/[0.04] z-50">
      {/* Left: Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-amber-600 flex items-center justify-center text-black font-black text-sm shadow-lg shadow-accent/20">
          Q
        </div>
        <div className="leading-none">
          <div className="text-[13px] font-extrabold tracking-tight text-text-primary">StrunQ</div>
          <div className="text-[9px] font-semibold text-text-dim tracking-wider">STUDIO PRO</div>
        </div>
      </div>

      {/* Center: Human Pro */}
      <button
        id="human-pro-toggle"
        onClick={onToggleHumanize}
        className={`
          flex items-center gap-2.5 px-4 py-1.5 rounded-full border transition-all duration-400
          ${isHumanized
            ? 'bg-accent2/[0.08] border-accent2/25'
            : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.1]'
          }
        `}
      >
        <div className={`relative w-7 h-4 rounded-full transition-all duration-500 ${isHumanized ? 'bg-accent2/30' : 'bg-white/[0.08]'}`}>
          <div className={`absolute top-[3px] w-2.5 h-2.5 rounded-full transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.27,1.55)]
            ${isHumanized ? 'left-[13px] bg-accent2 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'left-[3px] bg-white/30'}
          `} />
        </div>
        <span className={`text-[10px] font-bold tracking-wide transition-colors ${isHumanized ? 'text-accent2' : 'text-text-dim'}`}>
          Human Pro
        </span>
      </button>

      {/* Right: Status */}
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
        <span className="text-[10px] font-semibold text-text-dim">Online</span>
      </div>
    </header>
  );
}
