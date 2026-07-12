/** PLAN.md §Contratos (004). */
export interface ParsedChord {
	root: string; // "C#"
	suffix: string; // "m7"
	bass?: string; // "G#" (inversion)
}

export interface RenderedSegment {
	text: string;
	isChord: boolean;
}

export interface RenderedLine {
	kind: 'chords' | 'lyrics' | 'mixed';
	segments: RenderedSegment[];
	role?: string;
}
