/**
 * Controlled copy of $lib/types/ast.ts (Deno cannot import from $lib).
 * Keep this file's shape in sync with the frontend type — both are the
 * same PLAN.md §4 contract. See _shared/parser.ts for the matching note.
 */
export type BlockType =
  | "verse"
  | "chorus"
  | "solo"
  | "bridge"
  | "intro"
  | "outro";

export interface ASTBlock {
  id: string;
  type: BlockType;
  label: string;
  content: string;
  repeats: number;
  role?: string;
}
