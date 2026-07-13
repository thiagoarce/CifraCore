/**
 * Auto-scroll duration estimate + per-song persistence (spec 006-modo-palco,
 * plan.md "Duração do scroll"). MVP default: localStorage keyed by song id
 * — not a DB column, so no migration is needed; promote it to the schema
 * later if a band ever asks to share the adjusted duration across devices.
 */

const STORAGE_PREFIX = 'cifracore:scrollDurationSec:';
const MIN_DURATION_SEC = 30;
const MAX_DURATION_SEC = 900;

const SECONDS_PER_LINE_AT_REFERENCE_BPM = 2;
const REFERENCE_BPM = 100;

/**
 * Heuristic default: ~2s/line at a reference tempo of 100bpm, scaled
 * inversely by the song's actual BPM when known (a faster song needs less
 * time per line). Documented as a heuristic, not a precise estimate — the
 * UI slider exists specifically because this will often need adjusting.
 */
export function estimateDurationSec(lineCount: number, bpm: number | null): number {
	if (lineCount <= 0) return MIN_DURATION_SEC;

	const bpmFactor = bpm && bpm > 0 ? REFERENCE_BPM / bpm : 1;
	const estimate = Math.round(lineCount * SECONDS_PER_LINE_AT_REFERENCE_BPM * bpmFactor);

	return Math.max(MIN_DURATION_SEC, Math.min(MAX_DURATION_SEC, estimate));
}

function hasLocalStorage(): boolean {
	return typeof localStorage !== 'undefined';
}

export function getStoredDurationSec(songId: string): number | null {
	if (!hasLocalStorage()) return null;

	const raw = localStorage.getItem(STORAGE_PREFIX + songId);
	if (!raw) return null;

	const parsed = Number(raw);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function setStoredDurationSec(songId: string, seconds: number): void {
	if (!hasLocalStorage()) return;
	localStorage.setItem(STORAGE_PREFIX + songId, String(Math.round(seconds)));
}

/** Stored override if present, otherwise the BPM/line-count heuristic. */
export function resolveDurationSec(songId: string, lineCount: number, bpm: number | null): number {
	return getStoredDurationSec(songId) ?? estimateDurationSec(lineCount, bpm);
}
