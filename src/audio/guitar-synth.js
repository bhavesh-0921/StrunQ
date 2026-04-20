import * as Tone from 'tone';

// ── Real guitar samples ──
const SAMPLE_BASE_URL = 'https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples/guitar-acoustic/';

const GUITAR_SAMPLE_MAP = {
  'E2': 'E2.mp3', 'G2': 'G2.mp3', 'B2': 'B2.mp3',
  'D3': 'D3.mp3', 'F3': 'F3.mp3', 'A3': 'A3.mp3',
  'C4': 'C4.mp3', 'E4': 'E4.mp3', 'G4': 'G4.mp3',
  'B4': 'B4.mp3', 'D5': 'D5.mp3',
};

const SLAP_SAMPLE_URL = 'https://raw.githubusercontent.com/Tonejs/audio/master/drum-samples/Bongos/snare.mp3';
const SLAP_BODY_URL = 'https://raw.githubusercontent.com/Tonejs/audio/master/drum-samples/Bongos/kick.mp3';
const FRET_NOISE_URL = 'https://raw.githubusercontent.com/Tonejs/audio/master/drum-samples/breakbeat8/snare.mp3';

let guitarSampler = null;
let pannerLeft = null, pannerCenter = null, pannerRight = null;
let chuckLow = null, chuckLowFilter = null;
let chuckMid = null, chuckMidFilter = null;
let chuckHigh = null, chuckHighFilter = null;
let slapPlayer = null, slapBodyPlayer = null;
let fretNoisePlayer = null, fretNoiseFilter = null;

// ═══ NEW: Pick Noise — ultra-short high-freq "tick" of pick on string ═══
let pickNoiseSynth = null, pickNoiseFilter = null;

// ═══ NEW: Body Resonance — low rumble on chord transitions ═══
let bodyResSynth = null, bodyResFilter = null;

let isInitialized = false;
let samplesLoaded = false;
let lastChordIdx = -1;
let loadPromise = null;

// ═══ HUMANIZATION STATE ═══
let _isHumanized = true;
let _lastPlayedNotes = [];

// ═══ BAR VARIATION STATE — breaks clone loops ═══
let _barVariation = {
  barCount: 0,
  weakStrumBeat: -1,
  weakStrumBar: -1,
  spreadDrift: 0,
  skippedStringIdx: -1,
  nextWeakBar: 3 + Math.floor(Math.random() * 3),
};

export function setHumanized(val) { _isHumanized = !!val; }

export function resetBarVariation() {
  _barVariation = {
    barCount: 0, weakStrumBeat: -1, weakStrumBar: -1,
    spreadDrift: 0, skippedStringIdx: -1,
    nextWeakBar: 3 + Math.floor(Math.random() * 3),
  };
}

// Called by engine at the start of each new bar/chord
export function advanceBar(patternLength) {
  if (!_isHumanized) return;
  _barVariation.barCount++;
  // Drift the strum spread slightly each bar
  _barVariation.spreadDrift = (Math.random() - 0.5) * 0.006;

  // Every 3-5 bars, pick a random beat to be weaker
  if (_barVariation.barCount >= _barVariation.nextWeakBar) {
    _barVariation.weakStrumBeat = Math.floor(Math.random() * patternLength);
    _barVariation.weakStrumBar = _barVariation.barCount;
    _barVariation.nextWeakBar = _barVariation.barCount + 3 + Math.floor(Math.random() * 3);
    // 30% chance to also skip an edge string
    _barVariation.skippedStringIdx = Math.random() < 0.3
      ? (Math.random() < 0.5 ? 0 : 5) : -1;
  } else {
    _barVariation.weakStrumBeat = -1;
    _barVariation.skippedStringIdx = -1;
  }
}

// ═══ NOTE HELPERS ═══
const NOTE_ORDER = ['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B'];

function noteToMidi(note) {
  if (!note) return 0;
  const match = note.match(/^([A-Ga-g][#b]?)(\d)$/);
  if (!match) return 60;
  const name = match[1].charAt(0).toUpperCase() + match[1].slice(1);
  const octave = parseInt(match[2]);
  let semitone = NOTE_ORDER.indexOf(name);
  if (semitone === -1) semitone = 0;
  return (octave + 1) * 12 + semitone;
}

function midiToNote(midi) {
  const octave = Math.floor(midi / 12) - 1;
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  return `${names[midi % 12]}${octave}`;
}

function getStringZone(note) {
  const midi = noteToMidi(note);
  if (midi <= 50) return 'bass';
  if (midi <= 67) return 'mid';
  return 'treble';
}

// ═══ SYNTH INITIALIZATION ═══
function ensureSynth() {
  if (guitarSampler && isInitialized) return guitarSampler;

  const allDisposable = [
    guitarSampler, slapPlayer, slapBodyPlayer, fretNoisePlayer, fretNoiseFilter,
    chuckLow, chuckLowFilter, chuckMid, chuckMidFilter, chuckHigh, chuckHighFilter,
    pannerLeft, pannerCenter, pannerRight,
    pickNoiseSynth, pickNoiseFilter, bodyResSynth, bodyResFilter,
  ];
  allDisposable.forEach(n => { if (n) try { n.dispose(); } catch(e) {} });
  samplesLoaded = false;

  // Stereo panners — bass left, treble right
  pannerLeft = new Tone.Panner(-0.15).toDestination();
  pannerCenter = new Tone.Panner(0).toDestination();
  pannerRight = new Tone.Panner(0.15).toDestination();

  guitarSampler = new Tone.Sampler({
    urls: GUITAR_SAMPLE_MAP, baseUrl: SAMPLE_BASE_URL,
    attack: 0.008,   // 8ms fade-in prevents digital click on sample onset
    release: 1.4, volume: -2,
    onload: () => { samplesLoaded = true; console.log('🎸 Guitar samples loaded (Realism Engine v3)'); },
    onerror: (err) => console.error('Guitar sample error:', err),
  }).toDestination();

  slapPlayer = new Tone.Player({ url: SLAP_SAMPLE_URL, volume: 4 }).toDestination();
  slapBodyPlayer = new Tone.Player({ url: SLAP_BODY_URL, volume: 0 }).toDestination();

  fretNoiseFilter = new Tone.Filter({ frequency: 2200, type: 'highpass', rolloff: -24 }).toDestination();
  fretNoisePlayer = new Tone.Player({ url: FRET_NOISE_URL, volume: -28 }).connect(fretNoiseFilter);

  // ═══ Pick noise — very soft "brush" of the pick across the string ═══
  // Use pink noise + bandpass (not highpass) + slow attack to avoid any digital tick
  pickNoiseFilter = new Tone.Filter({ frequency: 2800, type: 'bandpass', Q: 0.5 }).toDestination();
  pickNoiseSynth = new Tone.NoiseSynth({
    volume: -36, noise: { type: 'pink' },
    envelope: { attack: 0.006, decay: 0.035, sustain: 0, release: 0.020 },
  }).connect(pickNoiseFilter);

  // ═══ NEW: Body resonance — low thump on chord transitions ═══
  bodyResFilter = new Tone.Filter({ frequency: 260, type: 'bandpass', Q: 0.6 }).toDestination();
  bodyResSynth = new Tone.NoiseSynth({
    volume: -24, noise: { type: 'brown' },
    envelope: { attack: 0.012, decay: 0.08, sustain: 0, release: 0.06 },
  }).connect(bodyResFilter);

  // Chuck — muted string noise bands
  chuckLowFilter = new Tone.Filter({ frequency: 350, type: 'bandpass', Q: 1.2 }).toDestination();
  chuckLow = new Tone.NoiseSynth({
    volume: -1, noise: { type: 'brown' },
    envelope: { attack: 0.002, decay: 0.05, sustain: 0, release: 0.02 },
  }).connect(chuckLowFilter);

  chuckMidFilter = new Tone.Filter({ frequency: 1800, type: 'bandpass', Q: 0.6 }).toDestination();
  chuckMid = new Tone.NoiseSynth({
    volume: 2, noise: { type: 'pink' },
    envelope: { attack: 0.001, decay: 0.045, sustain: 0, release: 0.015 },
  }).connect(chuckMidFilter);

  chuckHighFilter = new Tone.Filter({ frequency: 5000, type: 'highpass', rolloff: -12 }).toDestination();
  chuckHigh = new Tone.NoiseSynth({
    volume: -4, noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 },
  }).connect(chuckHighFilter);

  loadPromise = Tone.loaded();
  isInitialized = true;
  lastChordIdx = -1;
  _lastPlayedNotes = [];
  return guitarSampler;
}

export function initSynth() { ensureSynth(); }
export async function waitForLoad() { ensureSynth(); if (loadPromise) await loadPromise; }
export function areSamplesLoaded() { return samplesLoaded; }

// ═══ STAGGERED RELEASE — Natural chord decay ═══
// Instead of killing all strings at once, release with random stagger
// so some strings ring slightly longer — like real finger lift-off
export function staggeredRelease(time) {
  if (!guitarSampler || !_isHumanized) { fadeOutAll(time); return; }
  if (_lastPlayedNotes.length > 0) {
    _lastPlayedNotes.forEach((note) => {
      if (!note) return;
      // Tightened windows to prevent overlap clicks with next chord
      const releaseDelay = Math.random() * 0.045;
      // 20% chance a string rings slightly longer — "accidental ring"
      const accidentalRing = Math.random() < 0.2 ? 0.03 + Math.random() * 0.04 : 0;
      try { guitarSampler.triggerRelease(note, time + releaseDelay + accidentalRing); } catch(e) {}
    });
  }
}

export function fadeOutAll(time) {
  if (!guitarSampler) return;
  try { guitarSampler.releaseAll(time); } catch(e) {}
}

// ═══ FRET NOISE — Enhanced with variable intensity ═══
export function playFretNoise(time, intensity = 'normal') {
  if (!_isHumanized) return;
  ensureSynth();
  try {
    if (fretNoisePlayer && fretNoisePlayer.loaded) {
      const baseVol = intensity === 'heavy' ? -22 : -30;
      fretNoisePlayer.volume.value = baseVol + (Math.random() * 4);
      if (Math.random() < 0.35) {
        fretNoisePlayer.start(time + 0.004 + Math.random() * 0.012);
      }
    }
  } catch(e) {}
}

// ═══ PICK NOISE — Subtle "tick" on every strum ═══
function playPickNoise(time, direction) {
  if (!_isHumanized || !pickNoiseSynth) return;
  try {
    // Very subtle brush — felt not heard
    const volOffset = direction === 'down' ? 1 : 0;
    pickNoiseSynth.volume.value = -38 + volOffset + (Math.random() * 3);
    if (pickNoiseFilter) pickNoiseFilter.frequency.value = 2400 + Math.random() * 800;
    // Only 30% of strums — most real strums don't have audible pick noise
    if (Math.random() < 0.30) {
      pickNoiseSynth.triggerAttackRelease('32n', time + 0.002 + Math.random() * 0.004);
    }
  } catch(e) {}
}

// ═══ BODY RESONANCE — triggered on chord transitions ═══
function playBodyResonance(time) {
  if (!_isHumanized || !bodyResSynth) return;
  try {
    if (bodyResFilter) bodyResFilter.frequency.value = 220 + Math.random() * 60;
    bodyResSynth.volume.value = -26 + (Math.random() * 3);
    if (Math.random() < 0.30) bodyResSynth.triggerAttackRelease('16n', time + 0.004);
  } catch(e) {}
}

// ═══ SYMPATHETIC RING — ghost harmonics from resonating strings ═══
function playSympathetic(notes, time) {
  if (!_isHumanized || !guitarSampler || !samplesLoaded) return;
  if (Math.random() > 0.12) return; // ~12% chance per strum
  try {
    const validNotes = notes.filter(n => n);
    if (validNotes.length === 0) return;
    const sourceNote = validNotes[Math.floor(Math.random() * validNotes.length)];
    const sourceMidi = noteToMidi(sourceNote);
    // Octave harmonic (60%) or fifth (40%)
    const interval = Math.random() < 0.6 ? 12 : 7;
    const sympatheticMidi = sourceMidi + interval;
    if (sympatheticMidi > 96) return;
    const sympatheticNote = midiToNote(sympatheticMidi);
    const delay = 0.015 + Math.random() * 0.025;
    const vel = 0.04 + Math.random() * 0.04;
    guitarSampler.triggerAttackRelease(sympatheticNote, '8n', time + delay, vel);
  } catch(e) {}
}

/**
 * ═══════════════════════════════════════
 * CHORD STRUM — Deep realism v2
 *
 * 1. ASYMMETRIC STROKES — fundamentally different up vs down
 * 2. STEREO PANNING — per-string spatial placement
 * 3. STRUM ACCELERATION — pick speeds up across strings
 * 4. PICK NOISE — high-freq transient per strum
 * 5. SYMPATHETIC RING — occasional ghost harmonics
 * 6. BAR VARIATION — velocity/string mutations across bars
 * 7. STAGGERED RELEASE — natural chord decay on transitions
 * ═══════════════════════════════════════
 */
export function playChordStrum(notes, direction, velocity, time, ghost = false, chordIdx = -1) {
  const sampler = ensureSynth();
  if (!samplesLoaded || !notes || notes.length === 0) return;

  // Release any still-ringing notes to prevent overlap clicks
  if (_lastPlayedNotes.length > 0) {
    _lastPlayedNotes.forEach(note => {
      if (note) try { sampler.triggerRelease(note, time - 0.012); } catch(e) {}
    });
  }

  // Chord transition — staggered release + body resonance
  if (chordIdx !== -1 && chordIdx !== lastChordIdx) {
    if (_isHumanized) {
      playBodyResonance(time - 0.006);
    }
    lastChordIdx = chordIdx;
  }

  let orderedNotes = [...notes];
  if (direction === 'up') orderedNotes.reverse();

  if (_isHumanized) {
    const isDown = direction === 'down';
    const numStrings = orderedNotes.length;

    // ═══ ASYMMETRIC SPREAD ═══
    // Down: heavier, wider (0.022-0.028s) / Up: tight, flicked (0.010-0.014s)
    const baseSpread = ghost
      ? 0.005
      : (isDown ? 0.022 + Math.random() * 0.006 : 0.010 + Math.random() * 0.004);
    const dur = ghost ? '8n' : '4n';

    // Bar variation — weak strum + string skip
    let barVelMult = 1.0;
    let skipIdx = -1;
    if (_barVariation.weakStrumBar === _barVariation.barCount) {
      barVelMult = 0.82 + Math.random() * 0.05;
    }
    if (_barVariation.skippedStringIdx >= 0 && !ghost) {
      skipIdx = _barVariation.skippedStringIdx;
    }
    const spreadDrift = _barVariation.spreadDrift;

    // Pick noise before the strum
    playPickNoise(time - 0.002, direction);
    // Sympathetic ring chance
    playSympathetic(notes, time);

    _lastPlayedNotes = [];
    orderedNotes.forEach((note, i) => {
      if (!note) return;
      if (i === skipIdx) return;

      // Strum acceleration — pick speeds up crossing strings
      const accelFactor = 1.0 - (i / numStrings) * 0.35;
      const spread = Math.max(0.002, (baseSpread + spreadDrift) * accelFactor);

      // Jitter — down is tighter (±5ms), up is looser (±10ms)
      const jitterRange = isDown ? 0.005 : 0.010;
      const jitter = (Math.random() - 0.5) * jitterRange;
      const t = time + (i * spread) + Math.max(0, jitter);

      // ═══ VELOCITY CURVE — fundamentally different per direction ═══
      let pickCurve;
      if (isDown) {
        // Down: peaks on bass strings, tapers on treble
        pickCurve = 1.0 - (i / numStrings) * 0.3;
        if (i < 2) pickCurve += 0.08;
      } else {
        // Up: peaks on treble strings (first in reversed order)
        pickCurve = 0.85 + (i / numStrings) * 0.15;
        if (i < 2) pickCurve += 0.06;
      }

      const velMin = isDown ? 0.80 : 0.72;
      const velRange = isDown ? 0.20 : 0.28;
      const velVariation = velMin + Math.random() * velRange;
      const v = Math.min(0.88, Math.max(0.04, velocity * pickCurve * velVariation * barVelMult));

      _lastPlayedNotes.push(note);
      try { sampler.triggerAttackRelease(note, dur, t, v); } catch(e) {}
    });

    // Drift body resonance filter per strum
    if (chuckLowFilter) chuckLowFilter.frequency.value = 330 + Math.random() * 40;
  } else {
    // ─── PERFECT MODE ───
    const strumSpread = ghost ? 0.005 : 0.016;
    const dur = ghost ? '8n' : '4n';
    _lastPlayedNotes = [];
    orderedNotes.forEach((note, i) => {
      if (note) {
        const jitter = (Math.random() - 0.5) * 0.004;
        const t = time + (i * strumSpread) + Math.max(0, jitter);
        const v = Math.min(0.8, Math.max(0.05, velocity * (0.82 + Math.random() * 0.18)));
        _lastPlayedNotes.push(note);
        try { sampler.triggerAttackRelease(note, dur, t, v); } catch(e) {}
      }
    });
  }
}

/** Picked notes — tab mode with humanization */
export function playPickedNotes(notes, time, velocity = 0.7) {
  const sampler = ensureSynth();
  if (!samplesLoaded || !notes || notes.length === 0) return;

  if (_isHumanized && notes.filter(n => n).length > 0) playPickNoise(time, 'down');

  _lastPlayedNotes = [];
  notes.forEach((note, i) => {
    if (note) {
      const jitter = (Math.random() - 0.5) * (_isHumanized ? 0.008 : 0.003);
      const t = time + (i * 0.010) + Math.max(0, jitter);
      const velRange = _isHumanized ? 0.28 : 0.15;
      const v = Math.min(0.8, Math.max(0.05, velocity * ((1.0 - velRange) + Math.random() * velRange)));
      _lastPlayedNotes.push(note);
      try { sampler.triggerAttackRelease(note, '4n', t, v); } catch(e) {}
    }
  });
  if (_isHumanized && Math.random() < 0.06) playSympathetic(notes, time);
}

/** Chuck — muted string scrape with body resonance drift */
export function playChuck(time, velocity = 0.7) {
  ensureSynth();
  try {
    const numBursts = _isHumanized ? (4 + Math.floor(Math.random() * 3)) : 6;
    const burstSpacing = _isHumanized ? (0.003 + Math.random() * 0.002) : 0.004;
    if (_isHumanized && chuckLowFilter) chuckLowFilter.frequency.value = 320 + Math.random() * 60;
    if (_isHumanized && chuckMidFilter) chuckMidFilter.frequency.value = 1700 + Math.random() * 200;
    for (let i = 0; i < numBursts; i++) {
      const t = time + (i * burstSpacing);
      const v = velocity * (0.7 + Math.random() * 0.3);
      chuckLow.triggerAttackRelease('64n', t, v * 0.8);
      chuckMid.triggerAttackRelease('64n', t, v);
      chuckHigh.triggerAttackRelease('64n', t, v * 0.6);
    }
  } catch(e) {}
}

/** Slap — percussion with humanized velocity */
export function playSlap(time, velocity = 0.8) {
  ensureSynth();
  try {
    if (slapPlayer && slapPlayer.loaded) {
      const jit = _isHumanized ? (Math.random() - 0.5) * 3 : 0;
      slapPlayer.volume.value = -2 + (velocity * 8) + jit;
      slapPlayer.start(time);
    }
    if (slapBodyPlayer && slapBodyPlayer.loaded) {
      const jit = _isHumanized ? (Math.random() - 0.5) * 2 : 0;
      slapBodyPlayer.volume.value = -8 + (velocity * 5) + jit;
      slapBodyPlayer.start(time + (_isHumanized ? 0.002 + Math.random() * 0.004 : 0.003));
    }
  } catch(e) {}
}

export function setChuckChord() {}

export function resetState() {
  lastChordIdx = -1;
  _lastPlayedNotes = [];
  resetBarVariation();
}

export function disposeSynth() {
  const allDisposable = [
    guitarSampler, slapPlayer, slapBodyPlayer, fretNoisePlayer, fretNoiseFilter,
    chuckLow, chuckLowFilter, chuckMid, chuckMidFilter, chuckHigh, chuckHighFilter,
    pannerLeft, pannerCenter, pannerRight,
    pickNoiseSynth, pickNoiseFilter, bodyResSynth, bodyResFilter,
  ];
  allDisposable.forEach(n => { if (n) try { n.dispose(); } catch(e) {} });
  guitarSampler = slapPlayer = slapBodyPlayer = fretNoisePlayer = fretNoiseFilter = null;
  chuckLow = chuckLowFilter = chuckMid = chuckMidFilter = chuckHigh = chuckHighFilter = null;
  pannerLeft = pannerCenter = pannerRight = null;
  pickNoiseSynth = pickNoiseFilter = bodyResSynth = bodyResFilter = null;
  isInitialized = false;
  samplesLoaded = false;
  lastChordIdx = -1;
  _lastPlayedNotes = [];
  loadPromise = null;
}
