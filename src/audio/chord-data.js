// Chord definitions for guitar
// Each chord maps to an array of notes (strings 6→1, low E to high E)
// null means the string is muted/not played

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Standard guitar chord voicings (notes from low to high string)
const CHORD_VOICINGS = {
  'G':  ['G2', 'B2', 'D3', 'G3', 'B3', 'G4'],
  'C':  [null, 'C3', 'E3', 'G3', 'C4', 'E4'],
  'D':  [null, null, 'D3', 'A3', 'D4', 'F#4'],
  'Am': [null, 'A2', 'E3', 'A3', 'C4', 'E4'],
  'Em': ['E2', 'B2', 'E3', 'G3', 'B3', 'E4'],
  'F':  [null, null, 'F3', 'A3', 'C4', 'F4'],
  'Dm': [null, null, 'D3', 'A3', 'D4', 'F4'],
  'E':  ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4'],
  'A':  [null, 'A2', 'E3', 'A3', 'C#4', 'E4'],
  'Bm': [null, null, 'B2', 'F#3', 'B3', 'D4'],
};

// All available chords
export const AVAILABLE_CHORDS = Object.keys(CHORD_VOICINGS);

// Parse a note string like "C#4" into { note: "C#", octave: 4 }
function parseNote(noteStr) {
  if (!noteStr) return null;
  const match = noteStr.match(/^([A-G]#?)(\d)$/);
  if (!match) return null;
  return { note: match[1], octave: parseInt(match[2]) };
}

// Transpose a single note string by N semitones
function transposeNote(noteStr, semitones) {
  if (!noteStr || semitones === 0) return noteStr;
  const parsed = parseNote(noteStr);
  if (!parsed) return noteStr;

  const currentIndex = CHROMATIC.indexOf(parsed.note);
  const newIndex = currentIndex + semitones;
  const octaveShift = Math.floor(newIndex / 12);
  const wrappedIndex = ((newIndex % 12) + 12) % 12;

  return `${CHROMATIC[wrappedIndex]}${parsed.octave + octaveShift}`;
}

// Get the notes for a chord with capo applied
export function getChordNotes(chordName, capoPosition = 0) {
  const voicing = CHORD_VOICINGS[chordName];
  if (!voicing) return [];

  return voicing.map(note => {
    if (note === null) return null;
    return transposeNote(note, capoPosition);
  }).filter(n => n !== null);
}

// Get the display name of a chord when a capo is applied
export function getTransposedChordName(chordName, capoPosition = 0) {
  if (capoPosition === 0) return chordName;

  const isMinor = chordName.endsWith('m');
  const rootNote = isMinor ? chordName.slice(0, -1) : chordName;

  // Handle sharps in chord name
  const rootIndex = CHROMATIC.indexOf(rootNote);
  if (rootIndex === -1) return chordName;

  const newIndex = (rootIndex + capoPosition) % 12;
  const newRoot = CHROMATIC[newIndex];

  return isMinor ? `${newRoot}m` : newRoot;
}

// Default chord progression
export const DEFAULT_PROGRESSION = ['G', 'C', 'D', 'Em'];

// Default strum pattern
export const DEFAULT_PATTERN = ['D', 'd', 'U', 'u', 'D', 'U'];

// Strum types with metadata
export const STRUM_TYPES = {
  'D': { label: 'D', name: 'Down', velocity: 0.85, direction: 'down', ghost: false, skip: false, percussive: null },
  'U': { label: 'U', name: 'Up', velocity: 0.75, direction: 'up', ghost: false, skip: false, percussive: null },
  'd': { label: 'd', name: 'Ghost Down', velocity: 0.35, direction: 'down', ghost: true, skip: false, percussive: null },
  'u': { label: 'u', name: 'Ghost Up', velocity: 0.30, direction: 'up', ghost: true, skip: false, percussive: null },
  'x': { label: '×', name: 'Mute', velocity: 0, direction: null, ghost: false, skip: true, percussive: null },
  'c': { label: 'C', name: 'Chuck', velocity: 0.7, direction: 'down', ghost: false, skip: false, percussive: 'chuck' },
  's': { label: 'S', name: 'Slap', velocity: 0.8, direction: null, ghost: false, skip: false, percussive: 'slap' },
};
