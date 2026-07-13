/**
 * Wake Lock wrapper (spec 006-modo-palco R3): keeps the screen on while
 * Modo Palco is active. The OS releases the lock whenever the tab loses
 * visibility (backgrounded, screen locked) — re-acquiring on
 * `visibilitychange` is not an edge case, it is the normal way this API
 * is meant to be used.
 *
 * Browsers without `navigator.wakeLock` (older Safari) get a single,
 * one-time warning via `onUnsupported` instead of silently failing —
 * the musician needs to know to disable auto-lock manually.
 */

type WakeLockSentinelLike = {
	release: () => Promise<void>;
	addEventListener?: (event: 'release', handler: () => void) => void;
};

function isSupported(): boolean {
	return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

export interface WakeLockController {
	/** Requests the lock; safe to call even when unsupported (becomes a no-op). */
	acquire(): Promise<void>;
	/** Releases the lock and stops re-acquiring on visibilitychange. */
	release(): Promise<void>;
}

export function createWakeLockController(onUnsupported?: () => void): WakeLockController {
	let sentinel: WakeLockSentinelLike | null = null;
	let active = false;
	let warned = false;

	async function requestLock(): Promise<void> {
		if (!isSupported()) {
			if (!warned) {
				warned = true;
				onUnsupported?.();
			}
			return;
		}

		try {
			// `navigator.wakeLock.request` isn't in every TS lib.dom version yet.
			sentinel = await (
				navigator as unknown as {
					wakeLock: { request(type: 'screen'): Promise<WakeLockSentinelLike> };
				}
			).wakeLock.request('screen');
			// The real WakeLockSentinel fires its own 'release' event when the
			// OS silently invalidates the lock (tab backgrounded, etc.) — that,
			// not visibilitychange itself, is what tells us to null it out so
			// the next visibilitychange re-acquires instead of thinking the
			// (now-stale) sentinel is still valid.
			sentinel.addEventListener?.('release', () => {
				sentinel = null;
			});
		} catch {
			// Denied (e.g. low battery) or the tab isn't visible right now —
			// visibilitychange will retry; never crash the stage screen (Lei 4).
			sentinel = null;
		}
	}

	function handleVisibilityChange(): void {
		if (active && document.visibilityState === 'visible' && !sentinel) {
			requestLock();
		}
	}

	return {
		async acquire() {
			if (active) return;
			active = true;
			if (typeof document !== 'undefined') {
				document.addEventListener('visibilitychange', handleVisibilityChange);
			}
			await requestLock();
		},

		async release() {
			active = false;
			if (typeof document !== 'undefined') {
				document.removeEventListener('visibilitychange', handleVisibilityChange);
			}
			if (sentinel) {
				await sentinel.release();
				sentinel = null;
			}
		}
	};
}
