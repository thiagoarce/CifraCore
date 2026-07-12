import { describe, expect, it } from 'vitest';
import { parseChord, transposeChord, transposeKey } from './tonalWrapper';

describe('parseChord', () => {
	it('returns null for empty input', () => {
		expect(parseChord('')).toBeNull();
		expect(parseChord('   ')).toBeNull();
	});

	it('parses a bare major chord', () => {
		expect(parseChord('C')).toEqual({ root: 'C', suffix: '', bass: undefined });
	});

	it('parses minor, seventh, sus and add chords', () => {
		expect(parseChord('Am')).toEqual({ root: 'A', suffix: 'm', bass: undefined });
		expect(parseChord('G7')).toEqual({ root: 'G', suffix: '7', bass: undefined });
		expect(parseChord('Csus4')).toEqual({ root: 'C', suffix: 'sus4', bass: undefined });
		expect(parseChord('Dadd9')).toEqual({ root: 'D', suffix: 'add9', bass: undefined });
	});

	it('parses an inversion (slash bass)', () => {
		expect(parseChord('C#m7/G#')).toEqual({ root: 'C#', suffix: 'm7', bass: 'G#' });
	});

	it('rejects a slash chord with an invalid bass note', () => {
		expect(parseChord('C/H')).toBeNull();
	});

	it('parses through sanitization (unicode, parens, Brazilian 7M)', () => {
		expect(parseChord('C♯m')).toEqual({ root: 'C#', suffix: 'm', bass: undefined });
		expect(parseChord('A(add9)')).toEqual({ root: 'A', suffix: 'add9', bass: undefined });
		expect(parseChord('C7M')).toEqual({ root: 'C', suffix: 'M7', bass: undefined });
	});

	it('rejects a lowercase root even though Tonal itself is case-insensitive', () => {
		// Tonal happily parses "a" -> A major and "e" -> E major, but those
		// are two of the most common words in Portuguese lyrics. Cifra
		// notation always capitalizes the root, so lowercase is never a
		// legitimate chord here — found via a real Portuguese-lyrics test.
		expect(parseChord('a')).toBeNull();
		expect(parseChord('e')).toBeNull();
		expect(parseChord('am7')).toBeNull();
	});

	it('returns null for malformed/unrecognizable input', () => {
		expect(parseChord('A(add9')).toBeNull(); // real case: unclosed paren
		expect(parseChord('xyz')).toBeNull();
		expect(parseChord('123')).toBeNull();
	});
});

describe('transposeChord', () => {
	it('never throws and returns the original text for anything unparseable', () => {
		expect(transposeChord('xyz', 2)).toBe('xyz');
		expect(transposeChord('A(add9', -3)).toBe('A(add9');
		expect(transposeChord('', 5)).toBe('');
	});

	it('returns the input unchanged for a zero offset', () => {
		expect(transposeChord('Am7', 0)).toBe('Am7');
	});

	// Spec 004 Gherkin "Transposição básica": Am, C, G up one semitone.
	it('transposing up prefers sharp spellings (Gherkin: transposição básica)', () => {
		expect(transposeChord('Am', 1)).toBe('A#m');
		expect(transposeChord('C', 1)).toBe('C#');
		expect(transposeChord('G', 1)).toBe('G#');
	});

	it('transposing down prefers flat spellings', () => {
		expect(transposeChord('C', -1)).toBe('B');
		expect(transposeChord('A', -1)).toBe('Ab');
		expect(transposeChord('D', -2)).toBe('C');
	});

	it('never produces a double-accidental (simplified by direction, not Tonal default)', () => {
		// Tonal's own Interval-based transpose gives "Db"+1 -> "Ebb"; the
		// directional pitch-class approach here gives "D" instead.
		expect(transposeChord('Db', 1)).toBe('D');
		expect(transposeChord('A#', -1)).toBe('A');
	});

	it('preserves the chord quality/extension while transposing the root', () => {
		expect(transposeChord('Cmaj7', 2)).toBe('Dmaj7');
		expect(transposeChord('G#m7b5', 1)).toBe('Am7b5');
	});

	it('transposes both root and bass of an inversion, independently', () => {
		expect(transposeChord('C/E', 2)).toBe('D/F#');
	});

	it('wraps around the octave in both directions', () => {
		expect(transposeChord('B', 1)).toBe('C');
		expect(transposeChord('C', -1)).toBe('B');
	});
});

describe('transposeKey', () => {
	it('transposes a song key the same way a bare chord transposes', () => {
		expect(transposeKey('C', 2)).toBe('D');
		expect(transposeKey('Em', 3)).toBe('Gm');
	});

	it('never throws for unparseable keys', () => {
		expect(transposeKey('???', 2)).toBe('???');
	});
});
