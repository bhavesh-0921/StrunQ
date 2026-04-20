import { useState, useCallback } from 'react';
import { useAudioEngine } from './hooks/useAudioEngine.js';
import { DEFAULT_PROGRESSION, DEFAULT_PATTERN } from './audio/chord-data.js';

import Header from './components/Header.jsx';
import InstrumentSelector from './components/InstrumentSelector.jsx';
import CapoSelector from './components/CapoSelector.jsx';
import ChordProgressionBuilder from './components/ChordProgressionBuilder.jsx';
import StrumPatternBuilder from './components/StrumPatternBuilder.jsx';
import PatternVisualizer from './components/PatternVisualizer.jsx';
import TempoControl from './components/TempoControl.jsx';
import TempoCurve from './components/TempoCurve.jsx';
import TabEditor from './components/TabEditor.jsx';
import PlaybackControls from './components/PlaybackControls.jsx';
import Footer from './components/Footer.jsx';

export default function App() {
  const [instrument, setInstrument] = useState('acoustic');
  const [capo, setCapo] = useState(0);
  const [progression, setProgression] = useState(DEFAULT_PROGRESSION);
  const [pattern, setPattern] = useState(DEFAULT_PATTERN);
  const [bpm, setBPM] = useState(120);
  const [tempoCurve, setTempoCurve] = useState(null);
  const [mode, setMode] = useState('chord');
  const [tabData, setTabData] = useState(Array.from({ length: 8 }, () => Array(6).fill(null)));
  const [isHumanized, setIsHumanized] = useState(true);

  const {
    play, stop, changeBPM, isPlaying, currentChordIndex, currentBeatIndex,
  } = useAudioEngine();

  const addChord = useCallback((chord) => setProgression(prev => [...prev, chord]), []);
  const removeChord = useCallback((index) => setProgression(prev => prev.filter((_, i) => i !== index)), []);
  const addStrum = useCallback((strum) => setPattern(prev => [...prev, strum]), []);
  const removeLastStrum = useCallback(() => setPattern(prev => prev.slice(0, -1)), []);
  const clearPattern = useCallback(() => setPattern([]), []);

  const handleBPMChange = useCallback((newBPM) => {
    setBPM(newBPM);
    changeBPM(newBPM);
  }, [changeBPM]);

  const handlePlay = useCallback(() => {
    play({ progression, pattern, bpm, capo, curve: tempoCurve, mode, tabData, isHumanized });
  }, [play, progression, pattern, bpm, capo, tempoCurve, mode, tabData, isHumanized]);

  const handleStop = useCallback(() => stop(), [stop]);

  const canPlay = mode === 'tab'
    ? tabData && tabData.length > 0
    : progression.length > 0 && pattern.length > 0;

  return (
    <div className="studio-root studio-surface">
      {/* ─── FIXED TOP: STUDIO STATUS BAR ─── */}
      <Header isHumanized={isHumanized} onToggleHumanize={() => setIsHumanized(prev => !prev)} />

      {/* ─── MAIN STAGE: PERFORMANCE AREA ─── */}
      <main className="studio-main-stage studio-scroll">
        <div className="max-w-[1200px] mx-auto pb-32">
          
          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Sidebar Settings (3 cols on desktop) */}
            <aside className="lg:col-span-3 flex flex-col gap-6 order-2 lg:order-1">
              <InstrumentSelector selected={instrument} onSelect={setInstrument} />
              <CapoSelector capo={capo} onCapoChange={setCapo} progression={progression} />
              <TempoControl bpm={bpm} onBPMChange={handleBPMChange} />
            </aside>

            {/* Main Content (9 cols on desktop) */}
            <section className="lg:col-span-9 flex flex-col gap-6 order-1 lg:order-2">
              
              {/* Professional Mode Tabs */}
              <div className="flex bg-[#0f0f15] p-1 rounded-xl border border-white/[0.04] w-fit">
                {['chord', 'tab'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`
                      px-8 py-2 rounded-lg text-[12px] font-bold tracking-wider capitalize transition-all duration-300
                      ${mode === m 
                        ? 'bg-white/[0.06] text-white shadow-sm' 
                        : 'text-text-dim hover:text-text-secondary hover:bg-white/[0.02]'}
                    `}
                  >
                    {m === 'chord' ? 'Performance' : 'Notation'}
                  </button>
                ))}
              </div>

              {mode === 'chord' ? (
                <div className="flex flex-col gap-6">
                  <ChordProgressionBuilder
                    progression={progression}
                    onAdd={addChord}
                    onRemove={removeChord}
                    currentChordIndex={currentChordIndex}
                    isPlaying={isPlaying}
                  />
                  <StrumPatternBuilder
                    pattern={pattern}
                    onAdd={addStrum}
                    onRemove={removeLastStrum}
                    onClear={clearPattern}
                  />
                </div>
              ) : (
                <TabEditor
                  tabData={tabData}
                  onTabChange={setTabData}
                  capo={capo}
                  isPlaying={isPlaying}
                  currentBeatIndex={currentBeatIndex}
                />
              )}

              <TempoCurve
                baseBPM={bpm}
                progression={mode === 'chord' ? progression : ['Tab']}
                onCurveChange={setTempoCurve}
                isPlaying={isPlaying}
              />
            </section>
          </div>
          
          <Footer />
        </div>
      </main>

      {/* ─── FIXED BOTTOM: TRANSPORT BAR ─── */}
      <footer className="transport-bar px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: Status */}
        <div className="hidden md:flex items-center gap-5 min-w-[180px]">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-all duration-500 ${
              isPlaying ? 'bg-accent shadow-[0_0_10px_rgba(232,168,56,0.6)] animate-pulse' : 'bg-white/[0.08]'
            }`} />
            <span className={`text-[10px] font-mono font-bold tracking-wider transition-colors ${
              isPlaying ? 'text-accent' : 'text-text-muted'
            }`}>
              {isPlaying ? 'LIVE' : 'IDLE'}
            </span>
          </div>
          {isPlaying && (
            <>
              <div className="w-px h-4 bg-white/[0.06]" />
              <span className="text-[11px] font-mono font-bold text-accent2 tabular-nums">
                Beat {currentBeatIndex + 1}
              </span>
            </>
          )}
        </div>

        {/* Center: Transport */}
        <div className="flex justify-center">
          <PlaybackControls
            isPlaying={isPlaying}
            onPlay={handlePlay}
            onStop={handleStop}
            canPlay={canPlay}
          />
        </div>

        {/* Right: Visualizer */}
        <div className="hidden md:flex justify-end min-w-[180px]">
          <PatternVisualizer
            pattern={pattern}
            currentBeatIndex={currentBeatIndex}
            isPlaying={isPlaying}
          />
        </div>
      </footer>
    </div>
  );
}
