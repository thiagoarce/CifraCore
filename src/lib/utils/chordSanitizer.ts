/**
 * Regex-layer normalization that runs BEFORE any chord token reaches Tonal
 * (constitution risk R1 / PLAN.md: raw web cifra text never hits Tonal
 * unsanitized). Each rule below exists because of a real-world case —
 * documented inline and covered by a matching test.
 */
export function sanitizeChordToken(raw: string): string {
	let token = raw.trim();

	// Unicode accidentals some sites use instead of plain ASCII (♯/♭).
	token = token.replace(/♯/g, '#').replace(/♭/g, 'b');

	// Internal whitespace, e.g. copy-paste artifacts ("A m7").
	token = token.replace(/\s+/g, '');

	// Extension in parens, e.g. "A(add9)" or "F#m7(b5)" — Tonal doesn't
	// parse parens; the extension itself is otherwise valid notation.
	token = token.replace(/\(([^)]*)\)/g, '$1');

	// Brazilian "7M" major-seventh shorthand (very common on CifraClub, e.g.
	// the real "C7M  Am7  Bm7  Em" intro this project imported during spec
	// 002 testing) — Tonal only understands "M7"/"maj7", not "7M".
	token = token.replace(/^([A-Ga-g][#b]?)7M(?!aj)/, '$1M7');

	return token;
}
