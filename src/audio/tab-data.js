// Standard guitar tuning — string names and base notes
const STANDARD_TUNING = [
  { name: 'e', note: 'E', octave: 4 },  // 1st string (highest)
  { name: 'B', note: 'B', octave: 3 },
  { name: 'G', note: 'G', octave: 3 },
  { name: 'D', note: 'D', octave: 3 },
  { name: 'A', note: 'A', octave: 2 },
  { name: 'E', note: 'E', octave: 2 },  // 6th string (lowest)
];

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Convert a fret number on a given string to a note name.
 * @param {number} stringIndex — 0 = high e, 5 = low E
 * @param {number} fret — fret number 0-24
 * @param {number} capo — capo position
 * @returns {string} note name like "C#4"
 */
export function fretToNote(stringIndex, fret, capo = 0) {
  const string = STANDARD_TUNING[stringIndex];
  if (!string) return null;

  const baseNoteIdx = CHROMATIC.indexOf(string.note);
  const semitones = fret + capo;
  const newIdx = baseNoteIdx + semitones;
  const octaveShift = Math.floor(newIdx / 12);
  const noteIdx = ((newIdx % 12) + 12) % 12;

  return `${CHROMATIC[noteIdx]}${string.octave + octaveShift}`;
}

/**
 * Convert a tab column (array of 6 fret values, null for unplayed) to notes.
 */
export function tabColumnToNotes(column, capo = 0) {
  if (!column) return [];
  return column
    .map((fret, stringIdx) => {
      if (fret === null || fret === undefined || fret === '') return null;
      return fretToNote(stringIdx, parseInt(fret), capo);
    })
    .filter(n => n !== null);
}

export { STANDARD_TUNING };
