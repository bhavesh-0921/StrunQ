import * as Tone from 'tone';
import { getChordNotes, STRUM_TYPES } from './chord-data.js';
import { tabColumnToNotes } from './tab-data.js';
import {
  playChordStrum, playPickedNotes, playChuck, playSlap,
  playFretNoise, setChuckChord, fadeOutAll, staggeredRelease, resetState,
  waitForLoad, initSynth, disposeSynth, setHumanized,
  advanceBar, resetBarVariation,
} from './guitar-synth.js';

let repeatId = null;
let isPlaying = false;
let currentBeatCallback = null;
let curveData = null;

// ═══ HUMANIZATION FLAGS ═══
let _engineHumanized = true;

function getBPMAtPosition(position, baseBPM) {
  if (!curveData || curveData.length < 2) return baseBPM;
  const pos = Math.max(0, Math.min(1, position));
  let lo = 0, hi = curveData.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (curveData[mid].x <= pos) lo = mid; else hi = mid;
  }
  const p1 = curveData[lo], p2 = curveData[hi];
  if (p1.x === p2.x) return p1.bpm;
  const t = (pos - p1.x) / (p2.x - p1.x);
  return Math.round(p1.bpm + t * (p2.bpm - p1.bpm));
}

/**
 * ═══════════════════════════════════════
 * BEAT ACCENT CURVE — with bar-to-bar variation
 *
 * Every bar has slightly different energy via golden-ratio
 * pseudo-random modulation. Prevents "clone loop" feel.
 * ═══════════════════════════════════════
 */
function getBeatAccent(beatIdx, patternLength, barNumber) {
  if (!_engineHumanized) return 1.0;
  const barPosition = beatIdx % patternLength;
  // ±4% energy shift per bar using golden ratio for organic variation
  const barEnergyShift = Math.sin(barNumber * 1.618) * 0.04;

  // Very first beat of the song — extra strong "count-in" feel
  if (barPosition === 0 && barNumber === 0) return 1.18 + Math.random() * 0.04 + barEnergyShift;
  // First beat of each bar — strong anchor
  if (barPosition === 0) return 1.10 + Math.random() * 0.05 + barEnergyShift;
  // Halfway beat — secondary accent
  const half = Math.floor(patternLength / 2);
  if (barPosition === half) return 1.04 + Math.random() * 0.04 + barEnergyShift;
  // Upbeats (odd positions) — softer with more variation
  if (barPosition % 2 === 1) return 0.85 + Math.random() * 0.08 + barEnergyShift;
  // Everything else — moderate
  return 0.94 + Math.random() * 0.08 + barEnergyShift;
}

/**
 * ═══════════════════════════════════════
 * HUMAN TIMING DRIFT v2 — Direction-aware, groove-aware
 *
 * Downstrokes: tight ±5ms, slightly early (confident punch)
 * Upstrokes: wider ±14ms, slightly late (casual drag)
 * Groove swing at tempos below 100 BPM.
 * Phrase-level re-anchoring every 4 beats.
 * ═══════════════════════════════════════
 */
function getHumanTimingDrift(beatIdx, direction, bpm) {
  if (!_engineHumanized) return 0;

  const isDown = direction === 'down';
  const isUp = direction === 'up';

  // Asymmetric drift per direction
  let driftRange, bias;
  if (isDown) { driftRange = 0.005; bias = -0.002; }
  else if (isUp) { driftRange = 0.014; bias = 0.004; }
  else { driftRange = 0.008; bias = 0.001; } // percussive

  const drift = (Math.random() - 0.5) * driftRange;

  // Groove-aware swing — even-numbered upbeats get pushed late at slow tempos
  let swing = 0;
  if (bpm < 100 && beatIdx % 2 === 1) {
    const swingIntensity = Math.max(0, (100 - bpm) / 100);
    swing = swingIntensity * 0.012;
  }

  // Phrase-level re-anchor — beat 1 of every 4 is tighter
  if (beatIdx % 4 === 0) return drift * 0.5 + bias * 0.5;

  return drift + bias + swing;
}

export function schedulePlayback({ progression, pattern, bpm, capo, onBeat, curve, mode, tabData, isHumanized }) {
  clearSchedule();
  const transport = Tone.getTransport();
  transport.bpm.value = bpm;
  curveData = curve;
  currentBeatCallback = onBeat;

  _engineHumanized = isHumanized !== false;
  setHumanized(_engineHumanized);

  initSynth();
  resetState();

  if (mode === 'tab' && tabData && tabData.length > 0) {
    scheduleTabMode(transport, tabData, capo, bpm);
  } else {
    scheduleChordMode(transport, progression, pattern, capo, bpm);
  }
}

function scheduleChordMode(transport, progression, pattern, capo, bpm) {
  if (!progression.length || !pattern.length) return;

  const totalBeats = pattern.length * progression.length;
  let beatIndex = 0;
  let prevChordName = null;
  let currentBarNumber = 0;
  let lastBarIdx = -1;

  repeatId = transport.scheduleRepeat((time) => {
    const currentBeat = beatIndex % totalBeats;
    const chordIdx = Math.floor(currentBeat / pattern.length);
    const beatIdx = currentBeat % pattern.length;
    const currentChordName = progression[chordIdx];

    // ═══ BAR TRACKING — advance variation state on each new chord/bar ═══
    if (chordIdx !== lastBarIdx) {
      currentBarNumber++;
      lastBarIdx = chordIdx;
      if (_engineHumanized) advanceBar(pattern.length);
    }

    // Loop restart — staggered release instead of hard cut
    if (currentBeat === 0 && beatIndex > 0) {
      if (_engineHumanized) {
        staggeredRelease(time - 0.025);
      } else {
        fadeOutAll(time - 0.02);
      }
      currentBarNumber = 0;
      lastBarIdx = -1;
      if (_engineHumanized) resetBarVariation();
    }

    // Apply tempo curve
    if (curveData && curveData.length >= 2) {
      const position = currentBeat / totalBeats;
      const targetBPM = getBPMAtPosition(position, bpm);
      transport.bpm.rampTo(targetBPM, 0.15);
    }

    // ═══ CHORD TRANSITION — fret noise with variable intensity ═══
    if (prevChordName !== null && currentChordName !== prevChordName && beatIdx === 0) {
      if (_engineHumanized) {
        const intensity = Math.random() < 0.3 ? 'heavy' : 'normal';
        playFretNoise(time - 0.018, intensity);
      }
    }

    const strumChar = pattern[beatIdx];
    const strumType = STRUM_TYPES[strumChar];
    if (!strumType) { beatIndex++; prevChordName = currentChordName; return; }

    // ═══ DIRECTION-AWARE timing drift and beat accent ═══
    const direction = strumType.direction || 'down';
    const accentMultiplier = getBeatAccent(beatIdx, pattern.length, currentBarNumber);
    const timingDrift = getHumanTimingDrift(beatIdx, direction, bpm);
    const humanizedTime = time + timingDrift;
    const humanizedVelocity = strumType.velocity * accentMultiplier;

    if (!strumType.skip) {
      const notes = getChordNotes(currentChordName, capo);

      if (strumType.percussive === 'chuck') {
        if (notes.length > 0) setChuckChord(notes);
        playChuck(humanizedTime, humanizedVelocity);
      } else if (strumType.percussive === 'slap') {
        playSlap(humanizedTime, humanizedVelocity);
      } else {
        if (notes.length > 0) {
          playChordStrum(notes, strumType.direction, humanizedVelocity, humanizedTime, strumType.ghost, chordIdx);
        }
      }
    }

    prevChordName = currentChordName;

    if (currentBeatCallback) {
      Tone.getDraw().schedule(() => { currentBeatCallback(chordIdx, beatIdx); }, time);
    }

    beatIndex++;
  }, '8n', 0);
}

function scheduleTabMode(transport, tabData, capo, bpm) {
  const totalCols = tabData.length;
  let colIndex = 0;
  let prevNotes = null;

  repeatId = transport.scheduleRepeat((time) => {
    const currentCol = colIndex % totalCols;

    // Loop restart — staggered release
    if (currentCol === 0 && colIndex > 0) {
      if (_engineHumanized) staggeredRelease(time - 0.025);
      else fadeOutAll(time - 0.02);
    }

    if (curveData && curveData.length >= 2) {
      const position = currentCol / totalCols;
      const targetBPM = getBPMAtPosition(position, bpm);
      transport.bpm.rampTo(targetBPM, 0.15);
    }

    const timingDrift = getHumanTimingDrift(currentCol, 'down', bpm);
    const humanizedTime = time + timingDrift;
    const accentMultiplier = getBeatAccent(currentCol, totalCols, Math.floor(colIndex / totalCols));

    const notes = tabColumnToNotes(tabData[currentCol], capo);

    // ═══ FRET NOISE on tab note changes too ═══
    if (_engineHumanized && prevNotes !== null && notes.length > 0) {
      const notesChanged = JSON.stringify(notes) !== JSON.stringify(prevNotes);
      if (notesChanged && Math.random() < 0.40) {
        playFretNoise(humanizedTime - 0.012, 'normal');
      }
    }

    if (notes.length > 0) {
      // Staggered release of previous notes
      if (_engineHumanized && prevNotes && prevNotes.length > 0) {
        staggeredRelease(humanizedTime - 0.010);
      }
      playPickedNotes(notes, humanizedTime, 0.7 * accentMultiplier);
    }

    prevNotes = notes.length > 0 ? [...notes] : prevNotes;

    if (currentBeatCallback) {
      Tone.getDraw().schedule(() => { currentBeatCallback(0, currentCol); }, time);
    }

    colIndex++;
  }, '8n', 0);
}

function clearSchedule() {
  const transport = Tone.getTransport();
  if (repeatId !== null) { transport.clear(repeatId); repeatId = null; }
  transport.cancel();
  transport.position = 0;
}

export async function startPlayback() {
  await Tone.start();
  await waitForLoad();
  Tone.getTransport().start('+0.05');
  isPlaying = true;
}

export function stopPlayback() {
  Tone.getTransport().stop();
  fadeOutAll(Tone.now());
  clearSchedule();
  isPlaying = false;
  currentBeatCallback = null;
  curveData = null;
  resetState();
}

export function updateBPM(bpm) { Tone.getTransport().bpm.rampTo(bpm, 0.3); }

export function disposeEngine() {
  stopPlayback();
  disposeSynth();
}
