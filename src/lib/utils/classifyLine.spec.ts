import { describe, expect, it } from 'vitest';
import { classifyLine } from './classifyLine';

function joinText(line: ReturnType<typeof classifyLine>): string {
	return line.segments.map((s) => s.text).join('');
}

describe('classifyLine', () => {
	it('classifies an all-chord line and highlights every chord token', () => {
		const line = classifyLine('C7M  Am7  Bm7  Em');
		expect(line.kind).toBe('chords');
		expect(line.segments.filter((s) => s.isChord).map((s) => s.text)).toEqual([
			'C7M',
			'Am7',
			'Bm7',
			'Em'
		]);
		expect(joinText(line)).toBe('C7M  Am7  Bm7  Em');
	});

	it('classifies a lyrics-only line and highlights nothing', () => {
		const line = classifyLine('Todos os dias quando acordo');
		expect(line.kind).toBe('lyrics');
		expect(line.segments.every((s) => !s.isChord)).toBe(true);
		expect(joinText(line)).toBe('Todos os dias quando acordo');
	});

	it('does not classify an ordinary Portuguese lyric line as chords', () => {
		// "a"/"e" would parse as A/E major if parseChord were case-insensitive
		// (Tonal itself is) — tonalWrapper's uppercase-root rule handles that;
		// this just confirms the line-level classification stays clean.
		const line = classifyLine('vida e arte, sempre a mesma coisa');
		expect(line.kind).toBe('lyrics');
		expect(line.segments.every((s) => !s.isChord)).toBe(true);
	});

	it('a sentence-initial capital that happens to be a valid chord letter ("A vida...") still never gets highlighted', () => {
		// Real ambiguity a rule-based classifier can't fully resolve: "A" here
		// is the article, capitalized only because it starts the sentence —
		// indistinguishable from a genuine "A" chord by capitalization alone.
		// The line-level ratio keeps it out of 'chords' territory regardless,
		// so nothing gets colored even though `kind` ends up 'mixed'.
		const line = classifyLine('A vida e a arte');
		expect(line.kind).not.toBe('chords');
		expect(line.segments.every((s) => !s.isChord)).toBe(true);
	});

	it('preserves exact whitespace/alignment between chord tokens', () => {
		const raw = '   C7M\nignored'.split('\n')[0]; // just the spaced line
		const line = classifyLine(raw);
		expect(joinText(line)).toBe(raw);
	});

	it('classifies a mostly-empty/whitespace-only line as lyrics without crashing', () => {
		const line = classifyLine('   ');
		expect(line.kind).toBe('lyrics');
		expect(joinText(line)).toBe('   ');
	});

	it('classifies an empty line without crashing', () => {
		const line = classifyLine('');
		expect(line.kind).toBe('lyrics');
		expect(line.segments).toEqual([{ text: '', isChord: false }]);
	});

	it('carries the block role through unchanged', () => {
		const line = classifyLine('Am', 'João');
		expect(line.role).toBe('João');
	});

	it('classifies a line with some but not most chord-like tokens as mixed, still unhighlighted', () => {
		const line = classifyLine('Am correndo pela cidade grande');
		expect(line.kind).toBe('mixed');
		expect(line.segments.every((s) => !s.isChord)).toBe(true);
	});
});
