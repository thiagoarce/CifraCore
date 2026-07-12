import { describe, expect, it } from 'vitest';
import { unrollAst } from './unrollAst';
import type { ASTBlock } from '$lib/types/ast';

function block(overrides: Partial<ASTBlock> = {}): ASTBlock {
	return {
		id: 'b1',
		type: 'verse',
		label: 'Verso',
		content: 'la la',
		repeats: 1,
		...overrides
	};
}

describe('unrollAst', () => {
	it('leaves a repeats:1 block as a single entry with its original id', () => {
		const result = unrollAst([block()]);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('b1');
	});

	it('expands repeats:N into N entries with unique ids', () => {
		const result = unrollAst([block({ repeats: 3 })]);
		expect(result.map((b) => b.id)).toEqual(['b1', 'b1#2', 'b1#3']);
		expect(result.every((b) => b.content === 'la la')).toBe(true);
	});

	it('preserves block order across multiple blocks', () => {
		const result = unrollAst([
			block({ id: 'a', repeats: 2 }),
			block({ id: 'b', repeats: 1 }),
			block({ id: 'c', repeats: 2 })
		]);
		expect(result.map((b) => b.id)).toEqual(['a', 'a#2', 'b', 'c', 'c#2']);
	});

	it('does not mutate the input array or its block objects', () => {
		const original = [block({ id: 'x', repeats: 2 })];
		const originalRef = original[0];
		const snapshot = JSON.parse(JSON.stringify(original));

		unrollAst(original);

		expect(original).toEqual(snapshot);
		expect(original[0]).toBe(originalRef);
	});

	it('never throws on malformed repeats (0, negative, NaN) — clamps to 1', () => {
		expect(unrollAst([block({ repeats: 0 })])).toHaveLength(1);
		expect(unrollAst([block({ repeats: -5 })])).toHaveLength(1);
		expect(unrollAst([block({ repeats: NaN })])).toHaveLength(1);
	});

	it('returns an empty array for an empty input', () => {
		expect(unrollAst([])).toEqual([]);
	});
});
