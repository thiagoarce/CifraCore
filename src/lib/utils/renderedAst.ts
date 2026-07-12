import { unrollAst } from './unrollAst';
import { classifyLine } from './classifyLine';
import { transposeChord } from './tonalWrapper';
import type { ASTBlock, BlockType } from '$lib/types/ast';
import type { RenderedLine } from '$lib/types/music';

export interface RenderedBlock {
	id: string;
	type: BlockType;
	label: string;
	repeats: number;
	role?: string;
	lines: RenderedLine[];
}

function renderBlock(block: ASTBlock, chordShift: number): RenderedBlock {
	const lines = block.content.split('\n').map((line) => {
		const classified = classifyLine(line, block.role);
		if (chordShift === 0) return classified;

		return {
			...classified,
			segments: classified.segments.map((segment) =>
				segment.isChord ? { ...segment, text: transposeChord(segment.text, chordShift) } : segment
			)
		};
	});

	return {
		id: block.id,
		type: block.type,
		label: block.label,
		repeats: block.repeats,
		role: block.role,
		lines
	};
}

/**
 * Pipeline for spec 004 R6/R7: unroll -> classify+transpose lines, never
 * mutating the original AST. A pure function rather than a Svelte
 * `derived()` store (plan.md's original sketch) — this codebase computes
 * everything else reactive-from-props with `$derived`/`$derived.by` inside
 * components (Svelte 5 runes), not the classic store combinators; callers
 * wrap this in their own `$derived.by(() => computeRenderedAst(...))`.
 *
 * `capo` shifts the *written* chords down relative to the sounding key
 * (plan.md "Capo é só exibição"): playing a capo'd instrument at the
 * written shape sounds `capo` semitones higher, so the shape written must
 * be `capo` semitones lower than the sounding key. `transposeOffset` is the
 * sounding-key shift (what "Salvar como tom da banda" would persist).
 */
export function computeRenderedAst(
	blocks: ASTBlock[],
	transposeOffset: number,
	capo: number
): RenderedBlock[] {
	const chordShift = transposeOffset - capo;
	return unrollAst(blocks).map((block) => renderBlock(block, chordShift));
}
