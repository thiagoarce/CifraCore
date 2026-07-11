/**
 * CifraClub extraction strategy: pulls title, artist, key and the raw
 * chord-sheet text out of a song page's HTML. Deliberately dependency-free
 * (no DOM parser) — CifraClub's markup for the pieces we need is simple and
 * stable enough for targeted regexes, and avoiding a parser library keeps
 * this fast in the Edge Function's constrained runtime.
 *
 * Structural assumptions (verified against a live page, see the fixture's
 * doc comment for details) — if CifraClub changes these, extraction fails
 * closed (returns null) rather than producing garbage (constitution law 4):
 *   - <h1 class="t1">Song Title</h1>
 *   - <a href="/{artist-slug}/">Artist Name</a>  (slug taken from the URL)
 *   - <span id="cifra_tom">tom: <a ...>Key</a></span>
 *   - <pre>...</pre> containing the chord sheet, with chords wrapped in
 *     <b> and inline tab diagrams wrapped in <span class="tablatura">.
 */

export interface CifraClubExtraction {
  title: string;
  artist: string;
  originalKey: string | null;
  rawText: string;
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function decodeEntities(text: string): string {
  return text.replace(
    /&[a-zA-Z#0-9]+;/g,
    (entity) => HTML_ENTITIES[entity] ?? entity,
  );
}

/** Strips all HTML tags, keeping their text content, then decodes entities. */
function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ""));
}

/**
 * Removes HTML comments before any tag-matching regex runs. Without this,
 * a comment that happens to contain tag-like text (e.g. documentation
 * mentioning "<pre>") would be mistaken for real markup — defensive
 * parsing per constitution law 4, not just a theoretical concern (it's
 * exactly what tripped up this strategy's own test fixture during
 * development).
 */
function stripComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

function extractArtistSlug(sourceUrl: string): string | null {
  try {
    const path = new URL(sourceUrl).pathname;
    const segments = path.split("/").filter(Boolean);
    return segments[0] ?? null;
  } catch {
    return null;
  }
}

export function extractCifraClub(
  rawHtml: string,
  sourceUrl: string,
): CifraClubExtraction | null {
  const html = stripComments(rawHtml);
  const titleMatch = html.match(
    /<h1[^>]*\bclass="[^"]*\bt1\b[^"]*"[^>]*>([^<]+)<\/h1>/,
  );
  const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);

  if (!titleMatch || !preMatch) return null;

  const title = stripTags(titleMatch[1]).trim();
  const rawText = stripTags(preMatch[1]).trim();
  if (!title || !rawText) return null;

  let artist = "";
  const artistSlug = extractArtistSlug(sourceUrl);
  if (artistSlug) {
    const artistPattern = new RegExp(
      `<a[^>]*href="\\/${artistSlug}\\/"[^>]*>([^<]+)</a>`,
    );
    const artistMatch = html.match(artistPattern);
    if (artistMatch) artist = stripTags(artistMatch[1]).trim();
  }
  if (!artist) {
    // fallback: <title>Song - Artist - Cifra Club</title>
    const pageTitleMatch = html.match(/<title>([^<]+)<\/title>/);
    const parts = pageTitleMatch?.[1].split(" - ").map((part) => part.trim());
    artist = parts && parts.length >= 2 ? parts[1] : "";
  }

  const keyMatch = html.match(/id="cifra_tom"[^>]*>[^<]*<a[^>]*>([^<]+)<\/a>/);
  const originalKey = keyMatch ? stripTags(keyMatch[1]).trim() || null : null;

  return { title, artist, originalKey, rawText };
}
