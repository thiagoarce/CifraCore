import { Chord, Note } from '@tonaljs/tonal';

import { sanitizeChordToken } from './chordSanitizer';
import type { ParsedChord } from '$lib/types/music';

// Tonal's own Interval-based transpose always picks a fixed interval
// spelling (e.g. +1 semitone is always a minor 2nd), which produces
// double-accidentals when the starting note already has one ("A# +1" ->
// "B" is fine, but "Db +1" -> "Ebb"). Musicians expect a simpler rule:
// climbing uses sharps, descending uses flats. Doing the pitch-class
// arithmetic directly and picking the spelling by direction sidesteps
// Tonal's convention entirely (documented + tested — this is exactly the
// kind of detail that generates a "wrong chord" bug report otherwise).
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Returns null for anything that isn't a valid note name after sanitizing. */
function transposeNote(note: string, semitones: number): string | null {
	const parsed = Note.get(note);
	if (parsed.empty || parsed.chroma === undefined) return null;
	if (semitones === 0) return parsed.name || note;

	const targetChroma = (((parsed.chroma + semitones) % 12) + 12) % 12;
	return semitones > 0 ? SHARP_NAMES[targetChroma] : FLAT_NAMES[targetChroma];
}

/**
 * Splits a sanitized chord token into root/suffix/optional bass, validating
 * each part against Tonal. Returns null for anything Tonal can't parse —
 * callers fall back to the original, untouched text (Lei 4: content
 * rendering never crashes, and a chord we can't understand degrades to
 * plain text rather than being mangled).
 */
export function parseChord(raw: string): ParsedChord | null {
	const sanitized = sanitizeChordToken(raw);
	if (!sanitized) return null;

	// Cifra notation always capitalizes the root ("Am", never "am"). Tonal
	// itself is case-insensitive and happily parses "a" or "e" as A/E major
	// — but those are two of the most common words in Portuguese lyrics, so
	// without this a huge fraction of ordinary lines would misparse as
	// chords (found via a Portuguese-lyrics test, not a hypothetical).
	if (!/^[A-G]/.test(sanitized)) return null;

	// Bass note (slash chord), e.g. "C#m7/G#" — Tonal's own parser doesn't
	// separate this, so it's split off here before the main chord lookup.
	const bassMatch = sanitized.match(/^(.+)\/([A-G][#b]?)$/);
	const mainPart = bassMatch ? bassMatch[1] : sanitized;
	const bassPart = bassMatch ? bassMatch[2] : undefined;

	if (bassPart && Note.get(bassPart).empty) return null;

	const chord = Chord.get(mainPart);
	if (chord.empty || !chord.tonic) return null;

	return {
		root: chord.tonic,
		suffix: mainPart.slice(chord.tonic.length),
		bass: bassPart
	};
}

/** Never throws; unparseable input (after sanitizing) returns `raw` as-is. */
export function transposeChord(raw: string, semitones: number): string {
	const parsed = parseChord(raw);
	if (!parsed) return raw;

	const newRoot = transposeNote(parsed.root, semitones);
	if (!newRoot) return raw;

	if (!parsed.bass) return `${newRoot}${parsed.suffix}`;

	const newBass = transposeNote(parsed.bass, semitones);
	return `${newRoot}${parsed.suffix}/${newBass ?? parsed.bass}`;
}

/** Same rules as transposeChord — a "key" (e.g. "Em", "G#") parses the same
 * way a bare chord does. */
export function transposeKey(key: string, semitones: number): string {
	return transposeChord(key, semitones);
}
