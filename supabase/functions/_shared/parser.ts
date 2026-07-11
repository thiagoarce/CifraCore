/**
 * Controlled copy of $lib/utils/chordSheetParser.ts (Deno cannot import
 * from $lib; plan.md 002-importacao documents this duplication and makes
 * keeping the two in sync — logic and test cases alike — this task's
 * responsibility). Any behavioral change here must be mirrored there,
 * and vice versa.
 */
import type { ASTBlock, BlockType } from "./ast.ts";

const KEYWORD_TYPE: Record<string, BlockType> = {
  intro: "intro",
  verso: "verse",
  verse: "verse",
  refrão: "chorus",
  refrao: "chorus",
  chorus: "chorus",
  ponte: "bridge",
  bridge: "bridge",
  solo: "solo",
  final: "outro",
  outro: "outro",
  parte: "verse",
  // CifraClub's most common section label for plain verses (verified
  // against a live page while building this Edge Function, spec
  // 002-importacao/002-T3): "Primeira Parte", "Segunda Parte", etc.
  "primeira parte": "verse",
  "segunda parte": "verse",
  "terceira parte": "verse",
  "quarta parte": "verse",
  "quinta parte": "verse",
  "sexta parte": "verse",
  "sétima parte": "verse",
  "setima parte": "verse",
  "oitava parte": "verse",
  "nona parte": "verse",
  "décima parte": "verse",
  "decima parte": "verse",
};

const LABEL_PATTERN =
  /^(?<keyword>intro|verso|verse|refr[ãa]o|chorus|ponte|bridge|solo|final|outro|(?:primeira|segunda|terceira|quarta|quinta|sexta|s[ée]tima|oitava|nona|d[ée]cima)\s+parte|parte)\s*(?<section>\d+)?\s*(?:\(\s*(?<repeatParen>\d+)\s*x\s*\)|\(\s*(?<bis>bis)\s*\)|(?<repeatBare>\d+)\s*x|x\s*(?<repeatX>\d+))?\s*$/i;

interface LabelGroups {
  keyword: string;
  section?: string;
  repeatParen?: string;
  bis?: string;
  repeatBare?: string;
  repeatX?: string;
}

interface LabelMatch {
  type: BlockType;
  label: string;
  repeats: number;
  trailingContent: string;
}

function matchLabel(rawLine: string): LabelMatch | null {
  const trimmed = rawLine.trim();
  if (trimmed === "") return null;

  let candidate: string;
  let trailingContent = "";

  const bracketMatch = trimmed.match(/^\[([^\]]+)]\s*(.*)$/);
  const parenMatch = !bracketMatch && trimmed.match(/^\(([^)]+)\)\s*(.*)$/);
  const colonMatch = !bracketMatch && !parenMatch &&
    trimmed.match(/^(.+):\s*$/);

  if (bracketMatch) {
    candidate = bracketMatch[1].trim();
    trailingContent = (bracketMatch[2] ?? "").trim();
  } else if (parenMatch) {
    candidate = parenMatch[1].trim();
    trailingContent = (parenMatch[2] ?? "").trim();
  } else if (colonMatch) {
    candidate = colonMatch[1].trim();
  } else {
    candidate = trimmed;
  }

  const match = candidate.match(LABEL_PATTERN);
  const groups = match?.groups as LabelGroups | undefined;
  if (!groups) return null;

  const type = KEYWORD_TYPE[groups.keyword.toLowerCase()];
  if (!type) return null;

  const repeats = groups.repeatParen
    ? parseInt(groups.repeatParen, 10)
    : groups.bis
    ? 2
    : groups.repeatBare
    ? parseInt(groups.repeatBare, 10)
    : groups.repeatX
    ? parseInt(groups.repeatX, 10)
    : 1;

  return {
    type,
    label: groups.section
      ? `${groups.keyword} ${groups.section}`
      : groups.keyword,
    repeats,
    trailingContent,
  };
}

function trimBlankEdges(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === "") start++;
  while (end > start && lines[end - 1].trim() === "") end--;
  return lines.slice(start, end);
}

function makeBlock(
  type: BlockType,
  label: string,
  repeats: number,
  lines: string[],
): ASTBlock {
  return {
    id: crypto.randomUUID(),
    type,
    label,
    content: trimBlankEdges(lines).join("\n"),
    repeats,
  };
}

function buildLabeledBlocks(
  lines: string[],
  labels: Array<LabelMatch | null>,
): ASTBlock[] {
  const blocks: ASTBlock[] = [];
  let currentMeta: { type: BlockType; label: string; repeats: number } | null =
    null;
  let currentLines: string[] | null = null;
  let leadingPartNumber = 0;

  const closeCurrent = () => {
    if (currentMeta && currentLines) {
      blocks.push(
        makeBlock(
          currentMeta.type,
          currentMeta.label,
          currentMeta.repeats,
          currentLines,
        ),
      );
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const label = labels[i];

    if (label) {
      closeCurrent();
      currentMeta = {
        type: label.type,
        label: label.label,
        repeats: label.repeats,
      };
      currentLines = label.trailingContent ? [label.trailingContent] : [];
      continue;
    }

    if (!currentMeta) {
      if (lines[i].trim() === "") continue;
      leadingPartNumber++;
      currentMeta = {
        type: "verse",
        label: `Parte ${leadingPartNumber}`,
        repeats: 1,
      };
      currentLines = [];
    }

    currentLines!.push(lines[i]);
  }

  closeCurrent();
  return blocks;
}

function buildParagraphBlocks(lines: string[]): ASTBlock[] {
  const paragraphs: string[][] = [];
  let current: string[] = [];
  let blankRun = 0;

  for (const line of lines) {
    if (line.trim() === "") {
      blankRun++;
      if (blankRun >= 2) {
        const trimmed = trimBlankEdges(current);
        if (trimmed.length > 0) paragraphs.push(trimmed);
        current = [];
        continue;
      }
      current.push(line);
      continue;
    }
    blankRun = 0;
    current.push(line);
  }

  const tail = trimBlankEdges(current);
  if (tail.length > 0) paragraphs.push(tail);

  return paragraphs.map((paragraphLines, index) =>
    makeBlock("verse", `Parte ${index + 1}`, 1, paragraphLines)
  );
}

export function parseChordSheet(text: string): ASTBlock[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (normalized.trim() === "") return [];

  const lines = normalized.split("\n");
  const labels = lines.map(matchLabel);
  const hasAnyLabel = labels.some((label) => label !== null);

  return hasAnyLabel
    ? buildLabeledBlocks(lines, labels)
    : buildParagraphBlocks(lines);
}
