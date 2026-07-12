import { describe, expect, it } from 'vitest';
import { sanitizeChordToken } from './chordSanitizer';

describe('sanitizeChordToken', () => {
	it('passes already-clean chords through unchanged', () => {
		expect(sanitizeChordToken('C')).toBe('C');
		expect(sanitizeChordToken('Am7')).toBe('Am7');
		expect(sanitizeChordToken('G#m7b5')).toBe('G#m7b5');
	});

	it('converts unicode accidentals to ASCII', () => {
		expect(sanitizeChordToken('C♯m')).toBe('C#m');
		expect(sanitizeChordToken('D♭')).toBe('Db');
	});

	it('strips internal whitespace', () => {
		expect(sanitizeChordToken('A m7')).toBe('Am7');
		expect(sanitizeChordToken('C # m')).toBe('C#m');
	});

	it('unwraps parenthesized extensions', () => {
		expect(sanitizeChordToken('A(add9)')).toBe('Aadd9');
		expect(sanitizeChordToken('F#m7(b5)')).toBe('F#m7b5');
	});

	it('normalizes the Brazilian "7M" major-seventh shorthand to "M7"', () => {
		// Real case: CifraClub's "Tempo Perdido" intro ("C7M  Am7  Bm7  Em"),
		// imported during spec 002 testing — Tonal doesn't understand "7M".
		expect(sanitizeChordToken('C7M')).toBe('CM7');
		expect(sanitizeChordToken('Db7M')).toBe('DbM7');
		expect(sanitizeChordToken('F#7M')).toBe('F#M7');
	});

	it('does not mangle "maj7" (already valid, must not double-convert)', () => {
		expect(sanitizeChordToken('Cmaj7')).toBe('Cmaj7');
	});

	it('handles combinations of the above in one token', () => {
		expect(sanitizeChordToken('  A ♯ (add9) ')).toBe('A#add9');
	});

	it('trims but otherwise leaves unrecognizable garbage alone (parseChord rejects it later)', () => {
		expect(sanitizeChordToken('  xyz123  ')).toBe('xyz123');
		expect(sanitizeChordToken('')).toBe('');
	});
});
