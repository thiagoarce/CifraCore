/**
 * Canonical musical-content contract (PLAN.md §4). The AST is the single
 * shape all import paths (paste, scraper, batch) converge to, and what
 * song_tabs.content stores for content_type 'ast'.
 */
export type BlockType = 'verse' | 'chorus' | 'solo' | 'bridge' | 'intro' | 'outro';

export interface ASTBlock {
	/** UUID, required — used as the {#each} key (constitution law 6). */
	id: string;
	type: BlockType;
	/** Human label, e.g. "Parte 1", "Refrão". */
	label: string;
	/** Raw lines of the section (chords and lyrics), '\n'-joined. */
	content: string;
	/** >= 1. Unrolling happens in the data layer (spec 004), never here. */
	repeats: number;
	/** Duet voice, e.g. "João", "Maria", "Todos". */
	role?: string;
}
