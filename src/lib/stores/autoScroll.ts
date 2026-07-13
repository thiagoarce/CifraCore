import { tweened } from 'svelte/motion';
import { writable, get, type Readable } from 'svelte/store';
import {
	setInterval as workerSetInterval,
	clearInterval as workerClearInterval
} from 'worker-timers';

/**
 * Auto-scroll state machine (spec 006-modo-palco, plan.md):
 *
 *   idle ──PLAY──▶ playing ──touch──▶ pausedByUser ──resume──▶ playing
 *                    │  ▲
 *                 PAUSE │RESYNC (realigns clock, keeps playing)
 *                    ▼  │
 *                  pausedByLeader
 *
 * The clock is a low-frequency `worker-timers` tick (never a native
 * `setInterval` — constitution Lei 5) that feeds the *target* of a
 * `tweened` store; the tween itself smooths the visual motion between
 * ticks, so a dropped/delayed tick never causes a visible jump.
 */
export type AutoScrollState = 'idle' | 'playing' | 'pausedByUser' | 'pausedByLeader';

const TICK_MS = 250;
const RESYNC_ANIMATION_MS = 500;

function clampProgress(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(1, value));
}

function createAutoScrollController() {
	const state = writable<AutoScrollState>('idle');
	const progress = tweened(0, { duration: 0 });

	let durationMs = 0;
	// Wall-clock timestamp (Date.now()) marking when the current "playing"
	// stretch started, offset so that `elapsedAtPause` already accounts for
	// whatever progress had accumulated before it. Recomputing elapsed as
	// `elapsedAtPause + (Date.now() - startedAt)` on every tick (rather than
	// counting ticks) is what makes the wall-clock recalculation after a
	// suspended tab correct — a delayed/dropped tick never causes drift.
	let startedAt = 0;
	let elapsedAtPause = 0;
	let tickHandle: number | null = null;

	function clearTick(): void {
		if (tickHandle !== null) {
			workerClearInterval(tickHandle);
			tickHandle = null;
		}
	}

	function elapsedNow(): number {
		if (get(state) !== 'playing') return elapsedAtPause;
		return elapsedAtPause + (Date.now() - startedAt);
	}

	function targetFor(elapsedMs: number): number {
		return durationMs > 0 ? clampProgress(elapsedMs / durationMs) : 0;
	}

	function scheduleTick(): void {
		clearTick();
		tickHandle = workerSetInterval(() => {
			if (get(state) !== 'playing') return;

			const elapsed = elapsedNow();
			progress.set(targetFor(elapsed), { duration: TICK_MS });

			if (durationMs > 0 && elapsed >= durationMs) {
				// Reached the end naturally: stop ticking, but the spec's state
				// machine has no dedicated "finished" state, so `playing` just
				// parks at progress 1 instead of inventing a new one.
				clearTick();
			}
		}, TICK_MS);
	}

	return {
		state: { subscribe: state.subscribe } satisfies Readable<AutoScrollState>,
		progress: { subscribe: progress.subscribe } satisfies Readable<number>,

		/** Sets the total scroll duration for the current song, in ms. */
		configure(newDurationMs: number): void {
			durationMs = Math.max(0, newDurationMs);
		},

		/** PLAY (own action or the leader's, via the 005 session). */
		play(): void {
			if (get(state) === 'playing') return;
			startedAt = Date.now();
			state.set('playing');
			scheduleTick();
		},

		/** PAUSE from the leader (005) — distinct from pauseByUser so a touch pause isn't silently overridden by a stale leader event. */
		pauseByLeader(): void {
			if (get(state) === 'playing') {
				elapsedAtPause = elapsedNow();
				progress.set(targetFor(elapsedAtPause), { duration: 0 });
			}
			clearTick();
			state.set('pausedByLeader');
		},

		/**
		 * Synchronous pause triggered by touchstart/wheel/mousedown on the
		 * chord area (R5) — must kill the interpolation in the same frame, no
		 * "tug of war" with the finger. `actualProgress`, when given, is the
		 * real scrollTop-derived progress (0-1) at the moment of the touch;
		 * without it, falls back to the theoretical elapsed-time position.
		 */
		pauseByUser(actualProgress?: number): void {
			elapsedAtPause =
				actualProgress !== undefined ? clampProgress(actualProgress) * durationMs : elapsedNow();
			clearTick();
			state.set('pausedByUser');
			progress.set(targetFor(elapsedAtPause), { duration: 0 });
		},

		/**
		 * "Retomar Sincronia": resumes from the REAL current position (e.g.
		 * read from `scrollTop` by the caller), not the theoretical one the
		 * clock would have reached — the musician may have scrolled manually
		 * while paused.
		 */
		resumeFrom(actualProgress: number): void {
			const clamped = clampProgress(actualProgress);
			elapsedAtPause = clamped * durationMs;
			startedAt = Date.now();
			progress.set(clamped, { duration: 0 });
			state.set('playing');
			scheduleTick();
		},

		/**
		 * RESYNC { elapsed_ms } from the leader (005/006 R6): realigns the
		 * clock to the leader's position with a smooth ~500ms animation,
		 * never an instant jump — matches R6's "salto suave, nunca
		 * teleporte brusco".
		 */
		resync(elapsedMs: number): void {
			elapsedAtPause = Math.max(0, elapsedMs);
			startedAt = Date.now();
			progress.set(targetFor(elapsedAtPause), { duration: RESYNC_ANIMATION_MS });
		},

		/**
		 * Call on `visibilitychange` (tab foregrounded again) while playing:
		 * recomputes the position from the wall clock instead of trusting
		 * whatever ticks did or didn't fire while suspended (plan.md risco:
		 * "suspensão de Web Worker com tela apagada").
		 */
		recalcFromWallClock(): void {
			if (get(state) !== 'playing') return;
			progress.set(targetFor(elapsedNow()), { duration: 0 });
			scheduleTick();
		},

		/** Back to the start, e.g. when the session changes song. */
		reset(): void {
			clearTick();
			state.set('idle');
			startedAt = 0;
			elapsedAtPause = 0;
			progress.set(0, { duration: 0 });
		}
	};
}

export const autoScroll = createAutoScrollController();
