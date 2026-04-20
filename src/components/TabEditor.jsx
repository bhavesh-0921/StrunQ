import { useState, useCallback } from 'react';
import { STANDARD_TUNING } from '../audio/tab-data.js';

export default function TabEditor({ tabData, onTabChange, capo, isPlaying, currentBeatIndex }) {
  const [columns, setColumns] = useState(tabData || Array.from({ length: 8 }, () => Array(6).fill(null)));
  const [focusedCell, setFocusedCell] = useState(null);

  function createEmptyTab(numCols) {
    return Array.from({ length: numCols }, () => Array(6).fill(null));
  }

  const updateCell = useCallback((colIdx, stringIdx, value) => {
    let updated;
    setColumns(prev => {
      updated = prev.map(col => [...col]);
      if (value === '' || value === null) {
        updated[colIdx][stringIdx] = null;
      } else {
        const num = parseInt(value);
        if (!isNaN(num) && num >= 0 && num <= 24) {
          updated[colIdx][stringIdx] = num;
        }
      }
      return updated;
    });
    setTimeout(() => onTabChange(updated), 0);
  }, [onTabChange]);

  const insertColumn = useCallback((index) => {
    setColumns(prev => {
      const newCols = [...prev];
      newCols.splice(index, 0, Array(6).fill(null));
      setTimeout(() => onTabChange(newCols), 0);
      return newCols;
    });
  }, [onTabChange]);

  const removeColumn = useCallback((index) => {
    if (columns.length <= 1) return;
    setColumns(prev => {
      const newCols = prev.map(col => [...col]);
      newCols.splice(index, 1);
      setTimeout(() => onTabChange(newCols), 0);
      return newCols;
    });
  }, [columns.length, onTabChange]);

  const clearTab = useCallback(() => {
    const empty = createEmptyTab(columns.length);
    setColumns(empty);
    onTabChange(empty);
  }, [columns.length, onTabChange]);

  const applyPreset = (name) => {
    let preset;
    if (name === 'arpeggio') {
      preset = [
        [null, null, null, null, null, 0], [null, null, null, null, 2, null],
        [null, null, 2, null, null, null], [null, 2, null, null, null, null],
        [0, null, null, null, null, null], [null, 0, null, null, null, null],
        [null, null, 0, null, null, null], [null, null, null, 0, null, null],
      ];
    } else if (name === 'fingerpick') {
      preset = [
        [null, null, null, null, null, 3], [null, null, null, null, 0, null],
        [null, null, null, 2, null, null], [null, null, 0, null, null, null],
        [null, 3, null, null, null, null], [null, null, null, null, 0, null],
        [null, null, null, 2, null, null], [null, null, 0, null, null, null],
      ];
    } else if (name === 'power') {
      preset = [
        [null, null, null, null, null, 0], [null, null, null, null, 2, 2],
        [null, null, null, null, 2, 2], [null, null, null, null, 3, 3],
        [null, null, null, null, 3, 3], [null, null, null, null, 5, 5],
        [null, null, null, null, 5, 5], [null, null, null, null, null, null],
      ];
    }
    if (preset) {
      setColumns(preset);
      onTabChange(preset);
    }
  };

  return (
    <section className="card p-5 lg:p-6 animate-[float-in_0.5s_ease-out]" id="notation-grid">
      <div className="flex items-center justify-between mb-5">
        <div className="label !mb-0">Tab Notation Matrix</div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-text-dim uppercase tracking-wider">RES: 1/8</span>
          <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(232,168,56,0.5)]" />
        </div>
      </div>

      <div className="relative p-5 bg-black/40 border border-white/[0.04] rounded-xl overflow-x-auto studio-scroll">
        <div className="inline-block min-w-full">
          {isPlaying && (
            <div
              className="absolute top-0 bottom-0 bg-accent/[0.08] border-x border-accent/20 transition-all duration-100 z-0 pointer-events-none"
              style={{
                left: `${80 + (currentBeatIndex * 50)}px`,
                width: '50px'
              }}
            />
          )}

          {/* Controls Header Row */}
          <div className="flex items-center h-8 relative mb-2">
            <div className="w-16 flex-shrink-0 flex items-center justify-end px-3">
              <span className="text-[9px] font-bold text-text-dim uppercase">Beat</span>
            </div>
            <div className="flex z-10">
              {columns.map((_, colIdx) => (
                <div key={colIdx} className="relative w-[50px] h-8 flex items-center justify-center group/header">
                  <div className="flex items-center gap-1 opacity-10 md:opacity-0 md:group-hover/header:opacity-100 transition-opacity">
                    <button
                      onClick={() => insertColumn(colIdx)}
                      className="w-4 h-4 rounded flex items-center justify-center bg-accent/[0.1] text-accent hover:bg-accent/[0.2] transition-colors text-[10px]"
                      title="Insert before"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeColumn(colIdx)}
                      disabled={columns.length <= 1}
                      className="w-4 h-4 rounded flex items-center justify-center bg-danger/[0.1] text-danger hover:bg-danger/[0.2] disabled:opacity-30 disabled:hover:bg-danger/[0.1] transition-colors text-[10px]"
                      title="Remove beat"
                    >
                      -
                    </button>
                  </div>
                  {/* Default subtle number */}
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-text-dim font-bold opacity-100 md:group-hover/header:opacity-0 transition-opacity pointer-events-none">
                    {colIdx + 1}
                  </span>
                </div>
              ))}
              <div className="w-[50px] h-8 flex items-center justify-center group/header">
                  <button
                    onClick={() => insertColumn(columns.length)}
                    className="w-6 h-6 rounded flex items-center justify-center border border-dashed border-white/[0.2] text-white/50 hover:border-accent/40 hover:text-accent hover:bg-accent/[0.05] transition-all text-[12px] opacity-10 md:opacity-40 md:group-hover/header:opacity-100"
                    title="Add at end"
                  >
                    +
                  </button>
              </div>
            </div>
          </div>

          {STANDARD_TUNING.map((string, stringIdx) => (
            <div key={stringIdx} className="flex items-center h-10 relative border-b border-white/[0.03] last:border-none">
              {/* String Label */}
              <div className="w-16 flex-shrink-0 flex items-center justify-between px-3">
                <span className="text-[10px] font-mono font-bold text-white/20">{string.note}</span>
                <span className="text-[10px] font-mono font-bold text-accent/50">{string.name}</span>
              </div>

              {/* Fret Cells */}
              <div className="flex z-10">
                {columns.map((col, colIdx) => {
                  const fretVal = col[stringIdx];
                  const isFocused = focusedCell?.col === colIdx && focusedCell?.string === stringIdx;
                  const hasValue = fretVal !== null && fretVal !== undefined;

                  return (
                    <div
                      key={colIdx}
                      className="relative w-[50px] h-10 flex items-center justify-center group/cell"
                      onClick={() => setFocusedCell({ col: colIdx, string: stringIdx })}
                    >
                      {/* String guide line */}
                      <div className="absolute left-0 right-0 h-px top-1/2 -translate-y-1/2 bg-white/[0.08]" />

                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={hasValue ? fretVal : ''}
                        onChange={(e) => updateCell(colIdx, stringIdx, e.target.value)}
                        onFocus={() => setFocusedCell({ col: colIdx, string: stringIdx })}
                        onBlur={() => setFocusedCell(null)}
                        className={`
                          w-7 h-7 flex items-center justify-center rounded border outline-none text-center
                          text-[12px] font-mono font-bold z-20 relative transition-all duration-200
                          ${isFocused
                            ? 'border-accent bg-accent/[0.15] text-accent shadow-[0_0_12px_rgba(232,168,56,0.3)]'
                            : hasValue
                              ? 'border-accent3/40 bg-accent3/10 text-accent3 shadow-[0_4px_10px_rgba(0,0,0,0.5)]'
                              : 'border-transparent bg-transparent text-white/5 placeholder-transparent hover:border-white/[0.08] hover:bg-white/[0.03] hover:text-white/40'
                          }
                        `}
                        placeholder="—"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1.5">
          {['arpeggio', 'fingerpick', 'power'].map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 rounded-lg border border-white/[0.04] bg-white/[0.02] text-[10px] font-semibold text-text-dim hover:bg-white/[0.04] hover:text-accent3 hover:border-accent3/30 transition-all capitalize"
            >
              {p}
            </button>
          ))}
        </div>
        <button onClick={clearTab} className="text-[10px] font-semibold text-text-dim hover:text-danger transition-colors">Clear Matrix</button>
      </div>
    </section>
  );
}
