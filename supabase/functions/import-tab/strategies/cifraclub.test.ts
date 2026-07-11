import { strict as assert } from "node:assert";
import { extractCifraClub } from "./cifraclub.ts";
import { parseChordSheet } from "../../_shared/parser.ts";

const FIXTURE_PATH =
  `${import.meta.dirname}/__fixtures__/cifraclub-sample.html`;

function readFixture(): string {
  return Deno.readTextFileSync(FIXTURE_PATH);
}

Deno.test("extracts title, artist and key from the fixture page", () => {
  const html = readFixture();
  const result = extractCifraClub(
    html,
    "https://www.cifraclub.com.br/banda-ficticia/estrada-de-poeira/",
  );

  assert.ok(result);
  assert.equal(result!.title, "Estrada de Poeira");
  assert.equal(result!.artist, "Banda Fictícia");
  assert.equal(result!.originalKey, "Em");
});

Deno.test("strips chord <b> tags and tab-diagram spans from the raw text", () => {
  const html = readFixture();
  const result = extractCifraClub(
    html,
    "https://www.cifraclub.com.br/banda-ficticia/estrada-de-poeira/",
  );

  assert.ok(result);
  assert.ok(!result!.rawText.includes("<b>"));
  assert.ok(!result!.rawText.includes("<span"));
  assert.ok(result!.rawText.includes("[Intro]"));
  assert.ok(result!.rawText.includes("Eu caminho pela estrada de poeira"));
});

Deno.test("full pipeline: fixture HTML -> extraction -> shared parser -> valid AST", () => {
  const html = readFixture();
  const result = extractCifraClub(
    html,
    "https://www.cifraclub.com.br/banda-ficticia/estrada-de-poeira/",
  );
  assert.ok(result);

  const blocks = parseChordSheet(result!.rawText);

  // [Intro], [Primeira Parte], [Refrão] and [Segunda Parte] are all
  // recognized labels (the last three via the "Nth Parte" CifraClub
  // convention), so each becomes its own block; only the unrecognized
  // [Tab - Intro] label degrades gracefully into surrounding content
  // instead of crashing (constitution law 4).
  assert.deepEqual(
    blocks.map((block) => block.type),
    ["intro", "verse", "chorus", "verse"],
  );
  assert.deepEqual(
    blocks.map((block) => block.label),
    ["Intro", "Primeira Parte", "Refrão", "Segunda Parte"],
  );

  const chorus = blocks.find((block) => block.type === "chorus");
  assert.ok(chorus);
  assert.ok(chorus!.content.includes("Vou seguindo em frente"));

  const primeiraParte = blocks.find((block) =>
    block.label === "Primeira Parte"
  );
  assert.ok(primeiraParte);
  assert.ok(
    primeiraParte!.content.includes("Eu caminho pela estrada de poeira"),
  );

  const intro = blocks[0];
  assert.ok(
    intro.content.includes("E|-----------------------------------------|"),
  );
});

Deno.test("returns null (not a throw) when the page structure is unrecognized", () => {
  const result = extractCifraClub(
    "<html><body>not a cifraclub page</body></html>",
    "https://example.com/x/y/",
  );
  assert.equal(result, null);
});

Deno.test("does not mistake tag-like text inside an HTML comment for real markup", () => {
  const html = `<!-- a stray comment mentioning <pre> and <b>chord</b> tags -->
    <h1 class="t1">Real Title</h1>
    <a href="/artist-slug/">Real Artist</a>
    <span id="cifra_tom">tom: <a>D</a></span>
    <pre>[Intro] <b>D</b>
real content</pre>`;

  const result = extractCifraClub(
    html,
    "https://www.cifraclub.com.br/artist-slug/real-title/",
  );

  assert.ok(result);
  assert.equal(result!.title, "Real Title");
  assert.equal(result!.rawText, "[Intro] D\nreal content");
});
