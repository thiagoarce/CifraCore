import { parseChord } from './tonalWrapper';
import type { RenderedLine, RenderedSegment } from '$lib/types/music';

const CHORD_LINE_RATIO_THRESHOLD = 0.6;

/**
 * Splits one line of a block's content into segments, preserving exact
 * original spacing (so chord-over-syllable alignment in a monospace render
 * never shifts), and classifies the line as chords/lyrics/mixed.
 *
 * Tokens are only actually flagged `isChord` when the *line* reads as a
 * chord line (>= 60% of its tokens parse as chords — same threshold the
 * phase-002 text→AST parser uses for block-boundary detection). A
 * predominantly-lyrics line is never token-highlighted even if a stray word
 * happens to parse as a bare chord — "a"/"e" are ordinary Portuguese words
 * (and valid chord names, A major / E major), so without this a huge
 * fraction of everyday lyrics would light up as chords.
 */
export function classifyLine(line: string, role?: string): RenderedLine {
	const words: Array<{ text: string; start: number }> = [];
	for (const match of line.matchAll(/\S+/g)) {
		words.push({ text: match[0], start: match.index ?? 0 });
	}

	if (words.length === 0) {
		return { kind: 'lyrics', segments: [{ text: line, isChord: false }], role };
	}

	const chordFlags = words.map((word) => parseChord(word.text) !== null);
	const chordCount = chordFlags.filter(Boolean).length;
	const ratio = chordCount / words.length;

	let kind: RenderedLine['kind'];
	if (ratio >= CHORD_LINE_RATIO_THRESHOLD) kind = 'chords';
	else if (chordCount > 0) kind = 'mixed';
	else kind = 'lyrics';

	const highlightTokens = kind === 'chords';

	const segments: RenderedSegment[] = [];
	let cursor = 0;
	for (let i = 0; i < words.length; i++) {
		const { text, start } = words[i];
		if (start > cursor) {
			segments.push({ text: line.slice(cursor, start), isChord: false });
		}
		segments.push({ text, isChord: highlightTokens && chordFlags[i] });
		cursor = start + text.length;
	}
	if (cursor < line.length) {
		segments.push({ text: line.slice(cursor), isChord: false });
	}

	return { kind, segments, role };
}
