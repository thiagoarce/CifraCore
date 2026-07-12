import type { ASTBlock } from '$lib/types/ast';

/**
 * Expands `repeats` into that many copies of the block, in sequence — the
 * data-layer unroll constitution Lei 6 requires (never re-loop the same
 * block N times at render time). Pure and non-mutating: the caller's array
 * and block objects are never touched, only new ones are returned. Runs
 * once per music load, not per render (spec 004 R7/plan.md "Performance").
 *
 * The first occurrence of a repeated block keeps its original id; the Nth
 * repeat's id gets a `#N` suffix so every entry has a unique {#each} key
 * even though the content is identical.
 */
export function unrollAst(blocks: ASTBlock[]): ASTBlock[] {
	const result: ASTBlock[] = [];

	for (const block of blocks) {
		const repeats = Number.isFinite(block.repeats) && block.repeats >= 1 ? block.repeats : 1;

		for (let i = 0; i < repeats; i++) {
			result.push(i === 0 ? { ...block } : { ...block, id: `${block.id}#${i + 1}` });
		}
	}

	return result;
}
