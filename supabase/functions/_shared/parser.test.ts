/**
 * Same test cases as src/lib/utils/chordSheetParser.spec.ts (Vitest), ported
 * to Deno.test — this is the "mesmo arquivo de casos de teste" the plan
 * requires to keep the two controlled copies honest. Run: deno test
 * supabase/functions/_shared/parser.test.ts
 */
import { strict as assert } from "node:assert";
import { parseChordSheet } from "./parser.ts";
import type { ASTBlock } from "./ast.ts";

function contentLines(blocks: ASTBlock[]): string[] {
  return blocks
    .flatMap((block) => block.content.split("\n"))
    .filter((line) => line.trim().length > 0);
}

Deno.test("returns [] for empty and whitespace-only input", () => {
  assert.deepEqual(parseChordSheet(""), []);
  assert.deepEqual(parseChordSheet("   \n \n\t"), []);
});

Deno.test("wraps unstructured text in a single fallback block (never throws)", () => {
  const text = "linha um sem estrutura\nlinha dois qualquer";
  const blocks = parseChordSheet(text);

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, "verse");
  assert.equal(blocks[0].label, "Parte 1");
  assert.equal(blocks[0].repeats, 1);
  assert.equal(blocks[0].content, text);
});

Deno.test("splits labeled sections (PT) and maps their types", () => {
  const text = [
    "Intro",
    "Am F C G",
    "",
    "Verso 1",
    "Todos os dias quando acordo",
    "",
    "Refrão",
    "Não tenho tempo perdido",
    "",
    "Ponte",
    "lalala",
    "",
    "Solo",
    "e|--5--7--",
    "",
    "Final",
    "último acorde",
  ].join("\n");

  const blocks = parseChordSheet(text);

  assert.deepEqual(
    blocks.map((b) => b.type),
    ["intro", "verse", "chorus", "bridge", "solo", "outro"],
  );
  assert.deepEqual(
    blocks.map((b) => b.label),
    ["Intro", "Verso 1", "Refrão", "Ponte", "Solo", "Final"],
  );
  assert.equal(blocks[1].content, "Todos os dias quando acordo");
});

Deno.test("recognizes EN labels, bracketed/colon decorations", () => {
  const text = [
    "[Chorus]",
    "line c",
    "",
    "Bridge:",
    "line b",
    "",
    "(Outro)",
    "line o",
  ].join("\n");

  const blocks = parseChordSheet(text);

  assert.deepEqual(
    blocks.map((b) => b.type),
    ["chorus", "bridge", "outro"],
  );
  assert.deepEqual(contentLines(blocks), ["line c", "line b", "line o"]);
});

Deno.test("parses repeat annotations in their many spellings", () => {
  const text = [
    "Refrão (2x)",
    "a",
    "",
    "Verso 2 3x",
    "b",
    "",
    "Ponte x4",
    "c",
    "",
    "Refrão (bis)",
    "d",
  ].join("\n");

  const blocks = parseChordSheet(text);

  assert.deepEqual(
    blocks.map((b) => b.repeats),
    [2, 3, 4, 2],
  );
  assert.equal(blocks[0].label, "Refrão");
  assert.equal(blocks[1].label, "Verso 2");
});

Deno.test('keeps inline content of CifraClub-style "[Intro] Am F" label lines', () => {
  const blocks = parseChordSheet("[Intro] Am F C G\nprimeira linha do verso");

  assert.equal(blocks[0].type, "intro");
  assert.equal(blocks[0].content.split("\n")[0], "Am F C G");
});

Deno.test("starts an unlabeled block for content before the first label", () => {
  const text = ["linha solta inicial", "", "Refrão", "refrão aqui"].join("\n");

  const blocks = parseChordSheet(text);

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].label, "Parte 1");
  assert.equal(blocks[0].type, "verse");
  assert.equal(blocks[1].type, "chorus");
});

Deno.test("splits on double blank lines when no labels exist", () => {
  const text = [
    "bloco um linha um",
    "bloco um linha dois",
    "",
    "",
    "bloco dois linha um",
  ].join(
    "\n",
  );

  const blocks = parseChordSheet(text);

  assert.equal(blocks.length, 2);
  assert.deepEqual(
    blocks.map((b) => b.label),
    ["Parte 1", "Parte 2"],
  );
  assert.equal(blocks[1].content, "bloco dois linha um");
});

Deno.test("does NOT treat lyrics starting with a keyword as labels", () => {
  const text = ["Verso a verso eu te conto tudo", "Solo na madrugada eu fico"]
    .join("\n");

  const blocks = parseChordSheet(text);

  assert.equal(blocks.length, 1);
  assert.deepEqual(contentLines(blocks), [
    "Verso a verso eu te conto tudo",
    "Solo na madrugada eu fico",
  ]);
});

Deno.test("preserves every non-structural line, in order (content integrity)", () => {
  const text = [
    "Intro 2x",
    "Am  F",
    "",
    "Verso 1",
    "linha com    espaços   internos",
    "  linha indentada",
    "",
    "texto solto sem rótulo",
    "",
    "Refrão:",
    "linha final",
  ].join("\n");

  const blocks = parseChordSheet(text);

  assert.deepEqual(contentLines(blocks), [
    "Am  F",
    "linha com    espaços   internos",
    "  linha indentada",
    "texto solto sem rótulo",
    "linha final",
  ]);
});

Deno.test("assigns unique UUID ids and repeats >= 1 on every block", () => {
  const text = ["Refrão", "a", "", "Refrão", "a", "", "Refrão", "a"].join("\n");

  const blocks = parseChordSheet(text);
  const ids = blocks.map((b) => b.id);

  assert.equal(new Set(ids).size, blocks.length);
  for (const block of blocks) {
    assert.match(
      block.id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    assert.ok(block.repeats >= 1);
  }
});

Deno.test('recognizes CifraClub-style ordinal "Primeira/Segunda Parte" labels', () => {
  const text = [
    "[Primeira Parte]",
    "verso um",
    "",
    "[Segunda Parte]",
    "verso dois",
    "",
    "[Décima Parte]",
    "verso dez",
  ].join("\n");

  const blocks = parseChordSheet(text);

  assert.deepEqual(
    blocks.map((b) => b.type),
    ["verse", "verse", "verse"],
  );
  assert.deepEqual(
    blocks.map((b) => b.label),
    ["Primeira Parte", "Segunda Parte", "Décima Parte"],
  );
});

Deno.test("handles Windows line endings and special characters without crashing", () => {
  const text =
    "Refrão (2x)\r\nCoração ♥ açúcar & <tags>\r\n\r\n\r\nParte 2\r\nlinha";

  const blocks = parseChordSheet(text);

  assert.equal(blocks[0].type, "chorus");
  assert.equal(blocks[0].repeats, 2);
  assert.equal(blocks[0].content, "Coração ♥ açúcar & <tags>");
});
