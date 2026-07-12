import { describe, expect, it } from 'vitest';
import { computeRenderedAst } from './renderedAst';
import type { ASTBlock } from '$lib/types/ast';

const blocks: ASTBlock[] = [
	{
		id: 'b1',
		type: 'intro',
		label: 'Intro',
		content: 'C7M  Am7  Bm7  Em',
		repeats: 1
	},
	{
		id: 'b2',
		type: 'chorus',
		label: 'Refrão',
		content: '    C\nMas tenho muito tempo',
		repeats: 2
	}
];

describe('computeRenderedAst', () => {
	it('does not mutate the original AST', () => {
		const snapshot = JSON.parse(JSON.stringify(blocks));
		computeRenderedAst(blocks, 2, 0);
		expect(blocks).toEqual(snapshot);
	});

	it('unrolls repeats before rendering (spec R7)', () => {
		const result = computeRenderedAst(blocks, 0, 0);
		expect(result.map((b) => b.id)).toEqual(['b1', 'b2', 'b2#2']);
	});

	it('leaves chords untouched at offset 0 and capo 0', () => {
		const result = computeRenderedAst(blocks, 0, 0);
		const chordLine = result[0].lines[0];
		expect(chordLine.segments.filter((s) => s.isChord).map((s) => s.text)).toEqual([
			'C7M',
			'Am7',
			'Bm7',
			'Em'
		]);
	});

	it('transposes chord tokens by the sounding-key offset', () => {
		const result = computeRenderedAst(blocks, 2, 0);
		const chordLine = result[0].lines[0];
		// C7M (sanitized to CM7) up 2 semitones -> DM7; Am7 -> Bm7; Bm7 -> C#m7; Em -> F#m.
		expect(chordLine.segments.filter((s) => s.isChord).map((s) => s.text)).toEqual([
			'DM7',
			'Bm7',
			'C#m7',
			'F#m'
		]);
	});

	it('never highlights lyric text, so it is never transposed either', () => {
		const result = computeRenderedAst(blocks, 5, 0);
		const lyricLine = result[1].lines[1];
		expect(lyricLine.kind).toBe('lyrics');
		expect(lyricLine.segments.map((s) => s.text).join('')).toBe('Mas tenho muito tempo');
	});

	it('capo shifts written chords down relative to the sounding key', () => {
		// Sounding key offset +2, capo 2 -> written chords shift by 0 (unchanged).
		const withCapo = computeRenderedAst(blocks, 2, 2);
		const withoutCapo = computeRenderedAst(blocks, 0, 0);
		expect(withCapo[0].lines[0].segments).toEqual(withoutCapo[0].lines[0].segments);
	});

	it('reacts to a changed offset/capo without needing new input objects', () => {
		const a = computeRenderedAst(blocks, 0, 0);
		const b = computeRenderedAst(blocks, 1, 0);
		expect(a[0].lines[0].segments).not.toEqual(b[0].lines[0].segments);
	});

	it('degrades gracefully for a block with no content (Lei 4)', () => {
		const empty: ASTBlock[] = [
			{ id: 'e1', type: 'verse', label: 'Vazio', content: '', repeats: 1 }
		];
		expect(() => computeRenderedAst(empty, 3, 1)).not.toThrow();
		expect(computeRenderedAst(empty, 3, 1)[0].lines).toEqual([
			{ kind: 'lyrics', segments: [{ text: '', isChord: false }] }
		]);
	});
});
