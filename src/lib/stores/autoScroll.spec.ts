import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

// worker-timers wraps a real Web Worker, unavailable in the Vitest `node`
// environment (and the whole point of Lei 5 is that production code never
// touches native setInterval directly) — mocked here with a controllable
// fake so tests can fire ticks deterministically instead of depending on
// real timing. `svelte/motion`'s `tweened` also needs `requestAnimationFrame`
// to animate non-zero-duration transitions, which the `node` environment
// doesn't provide either — verified empirically (a standalone script showed
// a `{ duration: 50 }` tween never advances past its initial value here).
// `{ duration: 0 }` sets the tweened's value synchronously with no RAF
// needed (also verified empirically), which is exactly what every pause/
// resume path below uses — so state-machine correctness and the
// elapsed/duration math are fully covered; only the *animated* look of
// ticks/RESYNC over real time is left to manual/device verification (T2).
let tickCallback: (() => void) | null = null;

vi.mock('worker-timers', () => ({
	setInterval: (fn: () => void) => {
		tickCallback = fn;
		return 1;
	},
	clearInterval: () => {
		tickCallback = null;
	}
}));

function fireTick() {
	tickCallback?.();
}

describe('autoScroll store', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(0);
	});

	afterEach(async () => {
		const { autoScroll } = await import('./autoScroll');
		autoScroll.reset();
		vi.useRealTimers();
		tickCallback = null;
	});

	it('starts idle', async () => {
		const { autoScroll } = await import('./autoScroll');
		expect(get(autoScroll.state)).toBe('idle');
		expect(get(autoScroll.progress)).toBe(0);
	});

	it('play() transitions idle -> playing and schedules a tick', async () => {
		const { autoScroll } = await import('./autoScroll');
		autoScroll.configure(10_000);

		autoScroll.play();

		expect(get(autoScroll.state)).toBe('playing');
		expect(tickCallback).not.toBeNull();
	});

	it('a tick advances progress proportionally to elapsed/duration', async () => {
		const { autoScroll } = await import('./autoScroll');
		autoScroll.configure(10_000);
		autoScroll.play();

		vi.setSystemTime(4000);
		fireTick();

		// The tick's own tween has a non-zero duration (needs RAF to animate,
		// unavailable here) — but pauseByUser below uses duration:0 and lets
		// us read back the synchronously-applied value to confirm the elapsed
		// math the tick computed was correct.
		autoScroll.pauseByUser();
		expect(get(autoScroll.progress)).toBeCloseTo(0.4, 5);
	});

	it('touch (pauseByUser) kills the interpolation synchronously and stops ticking', async () => {
		const { autoScroll } = await import('./autoScroll');
		autoScroll.configure(10_000);
		autoScroll.play();
		vi.setSystemTime(3000);

		autoScroll.pauseByUser();

		expect(get(autoScroll.state)).toBe('pausedByUser');
		expect(get(autoScroll.progress)).toBeCloseTo(0.3, 5);
		expect(tickCallback).toBeNull();
	});

	it('pauseByUser can take the REAL scroll-derived progress instead of the theoretical one', async () => {
		const { autoScroll } = await import('./autoScroll');
		autoScroll.configure(10_000);
		autoScroll.play();
		vi.setSystemTime(3000); // theoretical would be 0.3

		// Musician had scrolled ahead manually to 0.7 before touching.
		autoScroll.pauseByUser(0.7);

		expect(get(autoScroll.progress)).toBeCloseTo(0.7, 5);
	});

	it('resumeFrom() resumes from an arbitrary position with the correct proportional remaining duration', async () => {
		const { autoScroll } = await import('./autoScroll');
		autoScroll.configure(10_000);
		autoScroll.play();
		vi.setSystemTime(3000);
		autoScroll.pauseByUser(0.6); // paused at 60% -> 6000ms elapsed

		vi.setSystemTime(3500); // half a second passes while paused
		autoScroll.resumeFrom(0.6);

		expect(get(autoScroll.state)).toBe('playing');
		expect(get(autoScroll.progress)).toBeCloseTo(0.6, 5);

		// 2s later, elapsed should be 6000 + 2000 = 8000ms -> 0.8, not
		// re-based from the wall-clock moment resumeFrom() was called plus
		// the *original* 3000ms (which would overshoot to 0.9).
		vi.setSystemTime(5500);
		fireTick();
		autoScroll.pauseByUser();
		expect(get(autoScroll.progress)).toBeCloseTo(0.8, 5);
	});

	it('pauseByLeader (PAUSE from the session) freezes progress and stops ticking', async () => {
		const { autoScroll } = await import('./autoScroll');
		autoScroll.configure(10_000);
		autoScroll.play();
		vi.setSystemTime(2000);

		autoScroll.pauseByLeader();

		expect(get(autoScroll.state)).toBe('pausedByLeader');
		expect(get(autoScroll.progress)).toBeCloseTo(0.2, 5);
		expect(tickCallback).toBeNull();
	});

	it('resync() realigns the clock to the leader elapsed_ms and keeps the state (no forced un-pause)', async () => {
		const { autoScroll } = await import('./autoScroll');
		autoScroll.configure(10_000);
		autoScroll.play();
		vi.setSystemTime(1000);
		autoScroll.pauseByLeader(); // paused at 1000ms

		autoScroll.resync(5000); // leader is actually at 5000ms

		// resync's own tween uses a 500ms duration (animated, needs RAF) so
		// the visible progress value isn't asserted here — but the internal
		// clock realignment is: playing again from this point should measure
		// elapsed relative to the resynced 5000ms, not the stale 1000ms.
		expect(get(autoScroll.state)).toBe('pausedByLeader');

		vi.setSystemTime(1500);
		autoScroll.play(); // e.g. a PLAY arrives right after the RESYNC
		vi.setSystemTime(3500); // 2s of real playback later
		autoScroll.pauseByUser();
		expect(get(autoScroll.progress)).toBeCloseTo(0.7, 5); // (5000+2000)/10000
	});

	it('recalcFromWallClock() (tab foregrounded again) recomputes from elapsed wall-clock time, not accumulated ticks', async () => {
		const { autoScroll } = await import('./autoScroll');
		autoScroll.configure(10_000);
		autoScroll.play();

		// Tab is backgrounded for a long stretch — no ticks fire at all
		// (simulating a suspended worker), then it's foregrounded again.
		vi.setSystemTime(7000);

		autoScroll.recalcFromWallClock();

		expect(get(autoScroll.progress)).toBeCloseTo(0.7, 5);
		expect(get(autoScroll.state)).toBe('playing');
		expect(tickCallback).not.toBeNull(); // ticking resumes
	});

	it('recalcFromWallClock() is a no-op when not playing', async () => {
		const { autoScroll } = await import('./autoScroll');
		autoScroll.configure(10_000);
		autoScroll.play();
		vi.setSystemTime(2000);
		autoScroll.pauseByUser();

		autoScroll.recalcFromWallClock();

		expect(get(autoScroll.state)).toBe('pausedByUser');
		expect(get(autoScroll.progress)).toBeCloseTo(0.2, 5);
	});

	it('a tick reaching the configured duration stops ticking without inventing a new state', async () => {
		const { autoScroll } = await import('./autoScroll');
		autoScroll.configure(4000);
		autoScroll.play();

		vi.setSystemTime(4000);
		fireTick();

		expect(tickCallback).toBeNull();
		expect(get(autoScroll.state)).toBe('playing');
	});

	it('reset() returns to idle with progress 0', async () => {
		const { autoScroll } = await import('./autoScroll');
		autoScroll.configure(10_000);
		autoScroll.play();
		vi.setSystemTime(3000);

		autoScroll.reset();

		expect(get(autoScroll.state)).toBe('idle');
		expect(get(autoScroll.progress)).toBe(0);
		expect(tickCallback).toBeNull();
	});

	it('never calls the native setInterval/clearInterval (Lei 5) — only the mocked worker-timers ones', async () => {
		const nativeSetInterval = vi.spyOn(globalThis, 'setInterval');
		const { autoScroll } = await import('./autoScroll');

		autoScroll.configure(10_000);
		autoScroll.play();
		autoScroll.pauseByUser();
		autoScroll.resumeFrom(0.1);
		autoScroll.resync(2000);
		autoScroll.recalcFromWallClock();

		expect(nativeSetInterval).not.toHaveBeenCalled();
		nativeSetInterval.mockRestore();
	});
});
