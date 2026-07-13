import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	estimateDurationSec,
	getStoredDurationSec,
	resolveDurationSec,
	setStoredDurationSec
} from './scrollDuration';

function createFakeStorage() {
	const store: Record<string, string> = {};
	return {
		getItem: (key: string) => (key in store ? store[key] : null),
		setItem: (key: string, value: string) => {
			store[key] = value;
		}
	};
}

describe('scrollDuration', () => {
	beforeEach(() => {
		vi.stubGlobal('localStorage', createFakeStorage());
	});

	it('estimateDurationSec scales with line count at the reference BPM', () => {
		// 50 lines * 2s/line at the 100bpm reference = 100s
		expect(estimateDurationSec(50, 100)).toBe(100);
	});

	it('estimateDurationSec scales inversely with a faster BPM', () => {
		// Twice as fast (200bpm) -> half the time per line
		expect(estimateDurationSec(50, 200)).toBe(50);
	});

	it('estimateDurationSec falls back to the reference tempo when bpm is unknown', () => {
		expect(estimateDurationSec(50, null)).toBe(100);
	});

	it('estimateDurationSec clamps to a sane minimum for tiny/empty songs', () => {
		expect(estimateDurationSec(0, 120)).toBe(30);
		expect(estimateDurationSec(1, 200)).toBe(30);
	});

	it('estimateDurationSec clamps to a sane maximum for absurdly long input', () => {
		expect(estimateDurationSec(10_000, 40)).toBe(900);
	});

	it('getStoredDurationSec returns null when nothing was saved for that song', () => {
		expect(getStoredDurationSec('song-1')).toBeNull();
	});

	it('setStoredDurationSec/getStoredDurationSec round-trip, scoped per song id', () => {
		setStoredDurationSec('song-1', 145);
		setStoredDurationSec('song-2', 90);

		expect(getStoredDurationSec('song-1')).toBe(145);
		expect(getStoredDurationSec('song-2')).toBe(90);
	});

	it('getStoredDurationSec ignores corrupted/non-numeric stored values', () => {
		localStorage.setItem('cifracore:scrollDurationSec:song-1', 'not-a-number');
		expect(getStoredDurationSec('song-1')).toBeNull();
	});

	it('resolveDurationSec prefers the stored override over the heuristic', () => {
		setStoredDurationSec('song-1', 200);
		expect(resolveDurationSec('song-1', 50, 100)).toBe(200);
	});

	it('resolveDurationSec falls back to the heuristic when nothing is stored', () => {
		expect(resolveDurationSec('song-1', 50, 100)).toBe(100);
	});
});
