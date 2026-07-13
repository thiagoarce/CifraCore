import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWakeLockController } from './wakeLock';

function createFakeDocument() {
	let visibilityState: 'visible' | 'hidden' = 'visible';
	const listeners: Record<string, Array<() => void>> = {};

	return {
		get visibilityState() {
			return visibilityState;
		},
		setVisibility(next: 'visible' | 'hidden') {
			visibilityState = next;
		},
		addEventListener(event: string, handler: () => void) {
			(listeners[event] ??= []).push(handler);
		},
		removeEventListener(event: string, handler: () => void) {
			listeners[event] = (listeners[event] ?? []).filter((h) => h !== handler);
		},
		fire(event: string) {
			for (const handler of listeners[event] ?? []) handler();
		},
		listenerCount(event: string) {
			return (listeners[event] ?? []).length;
		}
	};
}

describe('wakeLock controller', () => {
	let fakeDocument: ReturnType<typeof createFakeDocument>;

	beforeEach(() => {
		fakeDocument = createFakeDocument();
		vi.stubGlobal('document', fakeDocument);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('calls onUnsupported exactly once when navigator.wakeLock does not exist', async () => {
		vi.stubGlobal('navigator', {});
		const onUnsupported = vi.fn();
		const controller = createWakeLockController(onUnsupported);

		await controller.acquire();
		await controller.release();
		await controller.acquire();

		expect(onUnsupported).toHaveBeenCalledTimes(1);
	});

	it('requests the screen wake lock when supported', async () => {
		const release = vi.fn().mockResolvedValue(undefined);
		const request = vi.fn().mockResolvedValue({ release });
		vi.stubGlobal('navigator', { wakeLock: { request } });

		const controller = createWakeLockController();
		await controller.acquire();

		expect(request).toHaveBeenCalledWith('screen');
	});

	it('releasing calls the sentinel release and stops listening', async () => {
		const release = vi.fn().mockResolvedValue(undefined);
		const request = vi.fn().mockResolvedValue({ release });
		vi.stubGlobal('navigator', { wakeLock: { request } });

		const controller = createWakeLockController();
		await controller.acquire();
		expect(fakeDocument.listenerCount('visibilitychange')).toBe(1);

		await controller.release();

		expect(release).toHaveBeenCalledOnce();
		expect(fakeDocument.listenerCount('visibilitychange')).toBe(0);
	});

	it('re-acquires the lock on visibilitychange after the sentinel fires its own "release" event (OS-invalidated lock)', async () => {
		const box: { handler: (() => void) | null } = { handler: null };
		const release = vi.fn().mockResolvedValue(undefined);
		const request = vi.fn().mockResolvedValue({
			release,
			addEventListener: (_event: 'release', handler: () => void) => {
				box.handler = handler;
			}
		});
		vi.stubGlobal('navigator', { wakeLock: { request } });

		const controller = createWakeLockController();
		await controller.acquire();
		expect(request).toHaveBeenCalledTimes(1);

		// The real WakeLockSentinel fires 'release' when the OS silently
		// invalidates the lock (tab backgrounded, etc.) — simulate that,
		// then the tab becoming visible again, which should re-request.
		box.handler?.();
		fakeDocument.setVisibility('visible');
		fakeDocument.fire('visibilitychange');
		await Promise.resolve();

		expect(request).toHaveBeenCalledTimes(2);

		await controller.release();
	});

	it('does not try to re-acquire after release() was called', async () => {
		const release = vi.fn().mockResolvedValue(undefined);
		const request = vi.fn().mockResolvedValue({ release });
		vi.stubGlobal('navigator', { wakeLock: { request } });

		const controller = createWakeLockController();
		await controller.acquire();
		await controller.release();

		fakeDocument.fire('visibilitychange');
		await Promise.resolve();

		expect(request).toHaveBeenCalledTimes(1);
	});

	it('a denied/failed request never throws (Lei 4) and can be retried later', async () => {
		const request = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
		vi.stubGlobal('navigator', { wakeLock: { request } });

		const controller = createWakeLockController();
		await expect(controller.acquire()).resolves.toBeUndefined();
	});
});
