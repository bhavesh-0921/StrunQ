import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * Catmull-Rom spline interpolation for smooth curves through control points.
 * Returns an array of {x, bpm} samples along the curve.
 */
function catmullRomSpline(points, numSamples = 100) {
  if (points.length < 2) return points;

  const result = [];

  // Extend with virtual points at start and end for smooth curve
  const extended = [
    { x: points[0].x - (points[1].x - points[0].x), bpm: points[0].bpm },
    ...points,
    {
      x: points[points.length - 1].x + (points[points.length - 1].x - points[points.length - 2].x),
      bpm: points[points.length - 1].bpm,
    },
  ];

  const tension = 0.5;

  for (let i = 1; i < extended.length - 2; i++) {
    const p0 = extended[i - 1];
    const p1 = extended[i];
    const p2 = extended[i + 1];
    const p3 = extended[i + 2];

    const segSamples = Math.max(2, Math.round(numSamples / (points.length - 1)));

    for (let t = 0; t < segSamples; t++) {
      const f = t / segSamples;
      const f2 = f * f;
      const f3 = f2 * f;

      const x =
        tension * ((-f3 + 2 * f2 - f) * p0.x +
          (3 * f3 - 5 * f2 + 2) * p1.x +
          (-3 * f3 + 4 * f2 + f) * p2.x +
          (f3 - f2) * p3.x);

      const bpm =
        tension * ((-f3 + 2 * f2 - f) * p0.bpm +
          (3 * f3 - 5 * f2 + 2) * p1.bpm +
          (-3 * f3 + 4 * f2 + f) * p2.bpm +
          (f3 - f2) * p3.bpm);

      result.push({ x: Math.max(0, Math.min(1, x)), bpm: Math.round(bpm) });
    }
  }

  // Ensure we include the last point
  result.push({ ...points[points.length - 1] });

  return result;
}

export default function TempoCurve({ baseBPM, progression, onCurveChange, isPlaying }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [dragIndex, setDragIndex] = useState(-1);
  const [isEnabled, setIsEnabled] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(600);

  const height = 180;
  const padding = { top: 32, bottom: 32, left: 60, right: 24 };
  const graphW = canvasWidth - padding.left - padding.right;
  const graphH = height - padding.top - padding.bottom;

  const minBPM = Math.max(40, baseBPM - 50);
  const maxBPM = Math.min(220, baseBPM + 50);

  // Measure container width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setCanvasWidth(Math.floor(entry.contentRect.width));
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Initialize points when enabled
  useEffect(() => {
    if (isEnabled && progression.length > 0 && points.length === 0) {
      const numPoints = progression.length + 1;
      const defaultPoints = Array.from({ length: numPoints }, (_, i) => ({
        x: i / (numPoints - 1),
        bpm: baseBPM,
      }));
      setPoints(defaultPoints);
    } else if (!isEnabled) {
      onCurveChange(null);
    }
  }, [isEnabled, progression.length, baseBPM]);

  // Update curve output when points change
  useEffect(() => {
    if (!isEnabled || points.length < 2) return;
    const id = requestAnimationFrame(() => {
      onCurveChange(catmullRomSpline(points));
    });
    return () => cancelAnimationFrame(id);
  }, [points, isEnabled, onCurveChange]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isEnabled) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, canvasWidth, height);

    // Background - Graphite Surface
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(0, 0, canvasWidth, height, 16);
    ctx.fill();

    // Grid - DAW Style
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const y = padding.top + (graphH * i / gridSteps);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(canvasWidth - padding.right, y);
      ctx.stroke();

      const bpmVal = Math.round(maxBPM - (maxBPM - minBPM) * (i / gridSteps));
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.font = 'black 9px Orbitron, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${bpmVal}BPM`, padding.left - 12, y + 3);
    }

    // Chord divisions - Vertical Scanlines
    if (progression.length > 1) {
      for (let i = 1; i < progression.length; i++) {
        const x = padding.left + (graphW * i / progression.length);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();
      }
    }

    // Draw the smooth spline curve
    if (points.length >= 2) {
      const spline = catmullRomSpline(points, 150);

      // Filled area - Cyan Glow Gradient
      ctx.beginPath();
      const firstY = padding.top + graphH * (1 - (spline[0].bpm - minBPM) / (maxBPM - minBPM));
      ctx.moveTo(padding.left + spline[0].x * graphW, height - padding.bottom);
      ctx.lineTo(padding.left + spline[0].x * graphW, firstY);

      spline.forEach((p) => {
        const x = padding.left + p.x * graphW;
        const y = padding.top + graphH * (1 - (Math.max(minBPM, Math.min(maxBPM, p.bpm)) - minBPM) / (maxBPM - minBPM));
        ctx.lineTo(x, y);
      });

      ctx.lineTo(padding.left + spline[spline.length - 1].x * graphW, height - padding.bottom);
      ctx.closePath();
      const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, 'rgba(0, 210, 255, 0.08)');
      gradient.addColorStop(1, 'rgba(0, 210, 255, 0.01)');
      ctx.fillStyle = gradient;
      ctx.fill();

      // Curve line - Bold Cyan
      ctx.beginPath();
      spline.forEach((p, i) => {
        const x = padding.left + p.x * graphW;
        const y = padding.top + graphH * (1 - (Math.max(minBPM, Math.min(maxBPM, p.bpm)) - minBPM) / (maxBPM - minBPM));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#00d2ff';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Control points - LED Style
      points.forEach((p, idx) => {
        const x = padding.left + p.x * graphW;
        const y = padding.top + graphH * (1 - (p.bpm - minBPM) / (maxBPM - minBPM));

        // Point Halo
        ctx.beginPath();
        ctx.arc(x, y, dragIndex === idx ? 8 : 6, 0, Math.PI * 2);
        ctx.fillStyle = dragIndex === idx ? 'rgba(0, 210, 255, 0.25)' : 'rgba(0, 210, 255, 0.1)';
        ctx.fill();

        // Core Point
        ctx.beginPath();
        ctx.arc(x, y, dragIndex === idx ? 5 : 4, 0, Math.PI * 2);
        ctx.fillStyle = '#00d2ff';
        ctx.fill();

        // BPM Tooltip
        if (dragIndex === idx) {
          ctx.fillStyle = '#00d2ff';
          ctx.font = 'bold 10px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${p.bpm}`, x, y - 14);
        }
      });
    }

    // Industrial labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.font = 'black 8px Orbitron, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('MODULATION ACTIVE · CLICK TO ADD · RIGHT-CLICK REMOVE', canvasWidth - padding.right, padding.top - 12);
  }, [points, dragIndex, isEnabled, minBPM, maxBPM, canvasWidth, graphW, graphH]);

  const getCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvasWidth / rect.width),
      y: (e.clientY - rect.top) * (height / rect.height),
    };
  }, [canvasWidth]);

  const findNearest = useCallback((cx, cy, threshold = 18) => {
    let nearest = -1;
    let minDist = threshold;
    points.forEach((p, i) => {
      const px = padding.left + p.x * graphW;
      const py = padding.top + graphH * (1 - (p.bpm - minBPM) / (maxBPM - minBPM));
      const dist = Math.sqrt((cx - px) ** 2 + (cy - py) ** 2);
      if (dist < minDist) { minDist = dist; nearest = i; }
    });
    return nearest;
  }, [points, minBPM, maxBPM, graphW, graphH]);

  const canvasToData = useCallback((cx, cy) => {
    const relX = (cx - padding.left) / graphW;
    const relY = (cy - padding.top) / graphH;
    return {
      x: Math.max(0, Math.min(1, relX)),
      bpm: Math.round(Math.max(minBPM, Math.min(maxBPM, maxBPM - relY * (maxBPM - minBPM)))),
    };
  }, [graphW, graphH, minBPM, maxBPM]);

  const handlePointerDown = useCallback((e) => {
    if (!isEnabled) return;
    e.preventDefault();
    const coords = getCoords(e);
    if (!coords) return;

    const nearIdx = findNearest(coords.x, coords.y);
    if (nearIdx >= 0) {
      setDragIndex(nearIdx);
      e.target.setPointerCapture(e.pointerId);
    } else {
      const newPoint = canvasToData(coords.x, coords.y);
      setPoints(prev => [...prev, newPoint].sort((a, b) => a.x - b.x));
    }
  }, [isEnabled, getCoords, findNearest, canvasToData]);

  const handlePointerMove = useCallback((e) => {
    if (dragIndex < 0 || !isEnabled) return;
    const coords = getCoords(e);
    if (!coords) return;
    const data = canvasToData(coords.x, coords.y);

    setPoints(prev => {
      const updated = [...prev];
      if (dragIndex === 0) {
        updated[0] = { x: 0, bpm: data.bpm };
      } else if (dragIndex === prev.length - 1) {
        updated[prev.length - 1] = { x: 1, bpm: data.bpm };
      } else {
        const minX = updated[dragIndex - 1].x + 0.01;
        const maxX = updated[dragIndex + 1].x - 0.01;
        updated[dragIndex] = { x: Math.max(minX, Math.min(maxX, data.x)), bpm: data.bpm };
      }
      return updated;
    });
  }, [dragIndex, isEnabled, getCoords, canvasToData]);

  const handlePointerUp = useCallback(() => setDragIndex(-1), []);

  const handleContextMenu = useCallback((e) => {
    if (!isEnabled) return;
    e.preventDefault();
    const coords = getCoords(e);
    if (!coords) return;
    const nearIdx = findNearest(coords.x, coords.y);
    if (nearIdx > 0 && nearIdx < points.length - 1) {
      setPoints(prev => prev.filter((_, i) => i !== nearIdx));
    }
  }, [isEnabled, getCoords, findNearest, points.length]);

  const applyPreset = (type) => {
    const n = progression.length + 1;
    let newPoints;
    if (type === 'flat') {
      newPoints = Array.from({ length: n }, (_, i) => ({ x: i / (n - 1), bpm: baseBPM }));
    } else if (type === 'accel') {
      newPoints = Array.from({ length: n }, (_, i) => ({ x: i / (n - 1), bpm: Math.round(baseBPM - 20 + (40 * i / (n - 1))) }));
    } else if (type === 'ritard') {
      newPoints = Array.from({ length: n }, (_, i) => ({ x: i / (n - 1), bpm: Math.round(baseBPM + 20 - (40 * i / (n - 1))) }));
    } else if (type === 'wave') {
      newPoints = Array.from({ length: Math.max(4, n) }, (_, i) => ({ 
        x: i / (Math.max(4, n) - 1), 
        bpm: Math.round(baseBPM + Math.sin((i / (Math.max(4, n) - 1)) * Math.PI * 2) * 20) 
      }));
    }
    setPoints(newPoints);
  };

  return (
    <section className="card p-5 lg:p-6 animate-[float-in_0.5s_ease-out]" id="tempo-curve">
      <div className="flex items-center justify-between mb-5">
        <div className="label !mb-0">Tempo Curve</div>
        <button
          onClick={() => setIsEnabled(!isEnabled)}
          className={`
            px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all
            ${isEnabled ? 'bg-accent2/[0.12] text-accent2' : 'bg-white/[0.03] text-text-dim hover:bg-white/[0.05] hover:text-text-secondary border border-white/[0.04]'}
          `}
        >
          {isEnabled ? '✓ On' : 'Enable'}
        </button>
      </div>

      {isEnabled ? (
        <div>
          <div ref={containerRef} className="w-full relative bg-black/40 rounded-xl border border-white/[0.04] overflow-hidden">
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: `${height}px`, cursor: dragIndex >= 0 ? 'grabbing' : 'crosshair' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onContextMenu={handleContextMenu}
              className="touch-none"
            />
          </div>
          <div className="flex items-center gap-1.5 mt-4 flex-wrap">
            {[
              { key: 'flat', label: 'Flat' },
              { key: 'accel', label: 'Accel' },
              { key: 'ritard', label: 'Ritard' },
              { key: 'wave', label: 'Wave' },
            ].map((preset) => (
              <button
                key={preset.key}
                onClick={() => applyPreset(preset.key)}
                className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04] text-[10px] font-semibold text-text-dim hover:bg-white/[0.06] hover:text-text-secondary transition-all"
              >
                {preset.label}
              </button>
            ))}
            <span className="text-[10px] font-mono text-text-dim ml-auto">{points.length} nodes</span>
          </div>
        </div>
      ) : (
        <div className="h-[120px] flex items-center justify-center rounded-xl border border-dashed border-white/[0.04] bg-white/[0.01]">
          <p className="text-[11px] text-text-dim">Enable to modulate tempo across your progression</p>
        </div>
      )}
    </section>
  );
}
