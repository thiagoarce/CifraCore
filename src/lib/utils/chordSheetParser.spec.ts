import { describe, expect, it } from 'vitest';

import { parseChordSheet } from './chordSheetParser';

/**
 * Content-integrity helper: every non-structural line of the input must
 * survive, in order, inside exactly one block. Section-label lines are
 * structural (they become label/type/repeats) and blank delimiter lines
 * are layout, so both are excluded from the comparison.
 */
function contentLines(blocks: ReturnType<typeof parseChordSheet>): string[] {
	return blocks
		.flatMap((block) => block.content.split('\n'))
		.filter((line) => line.trim().length > 0);
}

describe('parseChordSheet', () => {
	it('returns [] for empty and whitespace-only input', () => {
		expect(parseChordSheet('')).toEqual([]);
		expect(parseChordSheet('   \n \n\t')).toEqual([]);
	});

	it('wraps unstructured text in a single fallback block (never throws)', () => {
		const text = 'linha um sem estrutura\nlinha dois qualquer';
		const blocks = parseChordSheet(text);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].type).toBe('verse');
		expect(blocks[0].label).toBe('Parte 1');
		expect(blocks[0].repeats).toBe(1);
		expect(blocks[0].content).toBe(text);
	});

	it('splits labeled sections (PT) and maps their types', () => {
		const text = [
			'Intro',
			'Am F C G',
			'',
			'Verso 1',
			'Todos os dias quando acordo',
			'',
			'Refrão',
			'Não tenho tempo perdido',
			'',
			'Ponte',
			'lalala',
			'',
			'Solo',
			'e|--5--7--',
			'',
			'Final',
			'último acorde'
		].join('\n');

		const blocks = parseChordSheet(text);

		expect(blocks.map((b) => b.type)).toEqual([
			'intro',
			'verse',
			'chorus',
			'bridge',
			'solo',
			'outro'
		]);
		expect(blocks.map((b) => b.label)).toEqual([
			'Intro',
			'Verso 1',
			'Refrão',
			'Ponte',
			'Solo',
			'Final'
		]);
		expect(blocks[1].content).toBe('Todos os dias quando acordo');
	});

	it('recognizes EN labels, bracketed/colon decorations', () => {
		const text = ['[Chorus]', 'line c', '', 'Bridge:', 'line b', '', '(Outro)', 'line o'].join(
			'\n'
		);

		const blocks = parseChordSheet(text);

		expect(blocks.map((b) => b.type)).toEqual(['chorus', 'bridge', 'outro']);
		expect(contentLines(blocks)).toEqual(['line c', 'line b', 'line o']);
	});

	it('parses repeat annotations in their many spellings', () => {
		const text = [
			'Refrão (2x)',
			'a',
			'',
			'Verso 2 3x',
			'b',
			'',
			'Ponte x4',
			'c',
			'',
			'Refrão (bis)',
			'd'
		].join('\n');

		const blocks = parseChordSheet(text);

		expect(blocks.map((b) => b.repeats)).toEqual([2, 3, 4, 2]);
		// the repeat marker must not leak into the label
		expect(blocks[0].label).toBe('Refrão');
		expect(blocks[1].label).toBe('Verso 2');
	});

	it('keeps inline content of CifraClub-style "[Intro] Am F" label lines', () => {
		const blocks = parseChordSheet('[Intro] Am F C G\nprimeira linha do verso');

		expect(blocks[0].type).toBe('intro');
		expect(blocks[0].content.split('\n')[0]).toBe('Am F C G');
	});

	it('starts an unlabeled block for content before the first label', () => {
		const text = ['linha solta inicial', '', 'Refrão', 'refrão aqui'].join('\n');

		const blocks = parseChordSheet(text);

		expect(blocks).toHaveLength(2);
		expect(blocks[0].label).toBe('Parte 1');
		expect(blocks[0].type).toBe('verse');
		expect(blocks[1].type).toBe('chorus');
	});

	it('splits on double blank lines when no labels exist', () => {
		const text = ['bloco um linha um', 'bloco um linha dois', '', '', 'bloco dois linha um'].join(
			'\n'
		);

		const blocks = parseChordSheet(text);

		expect(blocks).toHaveLength(2);
		expect(blocks.map((b) => b.label)).toEqual(['Parte 1', 'Parte 2']);
		expect(blocks[1].content).toBe('bloco dois linha um');
	});

	it('does NOT treat lyrics starting with a keyword as labels', () => {
		const text = ['Verso a verso eu te conto tudo', 'Solo na madrugada eu fico'].join('\n');

		const blocks = parseChordSheet(text);

		expect(blocks).toHaveLength(1);
		expect(contentLines(blocks)).toEqual([
			'Verso a verso eu te conto tudo',
			'Solo na madrugada eu fico'
		]);
	});

	it('preserves every non-structural line, in order (content integrity)', () => {
		const text = [
			'Intro 2x',
			'Am  F',
			'',
			'Verso 1',
			'linha com    espaços   internos',
			'  linha indentada',
			'',
			'texto solto sem rótulo',
			'',
			'Refrão:',
			'linha final'
		].join('\n');

		const blocks = parseChordSheet(text);

		expect(contentLines(blocks)).toEqual([
			'Am  F',
			'linha com    espaços   internos',
			'  linha indentada',
			'texto solto sem rótulo',
			'linha final'
		]);
	});

	it('assigns unique UUID ids and repeats >= 1 on every block', () => {
		const text = ['Refrão', 'a', '', 'Refrão', 'a', '', 'Refrão', 'a'].join('\n');

		const blocks = parseChordSheet(text);
		const ids = blocks.map((b) => b.id);

		expect(new Set(ids).size).toBe(blocks.length);
		for (const block of blocks) {
			expect(block.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
			expect(block.repeats).toBeGreaterThanOrEqual(1);
		}
	});

	it('handles Windows line endings and special characters without crashing', () => {
		const text = 'Refrão (2x)\r\nCoração ♥ açúcar & <tags>\r\n\r\n\r\nParte 2\r\nlinha';

		const blocks = parseChordSheet(text);

		expect(blocks[0].type).toBe('chorus');
		expect(blocks[0].repeats).toBe(2);
		expect(blocks[0].content).toBe('Coração ♥ açúcar & <tags>');
	});
});
