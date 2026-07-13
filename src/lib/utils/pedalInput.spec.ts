import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachPedalListener, getPedalConfig, setPedalConfig } from './pedalInput';

function createFakeTarget() {
	const listeners: Array<(event: KeyboardEvent) => void> = [];
	return {
		addEventListener: (_event: string, handler: (event: KeyboardEvent) => void) => {
			listeners.push(handler);
		},
		removeEventListener: (_event: string, handler: (event: KeyboardEvent) => void) => {
			const index = listeners.indexOf(handler);
			if (index >= 0) listeners.splice(index, 1);
		},
		fire(key: string, target: EventTarget | null = null) {
			const event = {
				key,
				target,
				preventDefault: vi.fn()
			} as unknown as KeyboardEvent;
			for (const handler of listeners) handler(event);
			return event;
		},
		listenerCount: () => listeners.length
	};
}

function createFakeStorage() {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => (key in store ? store[key] : null),
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		clear: () => {
			store = {};
		}
	};
}

describe('pedalInput', () => {
	beforeEach(() => {
		vi.stubGlobal('localStorage', createFakeStorage());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('getPedalConfig() defaults to scroll-step when nothing is stored', () => {
		expect(getPedalConfig()).toEqual({ action: 'scroll-step' });
	});

	it('setPedalConfig()/getPedalConfig() round-trip', () => {
		setPedalConfig({ action: 'nav-song' });
		expect(getPedalConfig()).toEqual({ action: 'nav-song' });
	});

	it('falls back to scroll-step on corrupted localStorage content', () => {
		localStorage.setItem('cifracore:pedalConfig', '{not json');
		expect(getPedalConfig()).toEqual({ action: 'scroll-step' });
	});

	it('PageDown/ArrowDown/ArrowRight trigger the forward handler (scroll-step mode)', () => {
		const target = createFakeTarget();
		const onStepForward = vi.fn();
		const onStepBackward = vi.fn();
		attachPedalListener({ onStepForward, onStepBackward }, target);

		target.fire('PageDown');
		target.fire('ArrowDown');
		target.fire('ArrowRight');

		expect(onStepForward).toHaveBeenCalledTimes(3);
		expect(onStepBackward).not.toHaveBeenCalled();
	});

	it('PageUp/ArrowUp/ArrowLeft trigger the backward handler', () => {
		const target = createFakeTarget();
		const onStepForward = vi.fn();
		const onStepBackward = vi.fn();
		attachPedalListener({ onStepForward, onStepBackward }, target);

		target.fire('PageUp');
		target.fire('ArrowUp');
		target.fire('ArrowLeft');

		expect(onStepBackward).toHaveBeenCalledTimes(3);
		expect(onStepForward).not.toHaveBeenCalled();
	});

	it('ignores unrelated keys', () => {
		const target = createFakeTarget();
		const onStepForward = vi.fn();
		const onStepBackward = vi.fn();
		attachPedalListener({ onStepForward, onStepBackward }, target);

		target.fire('a');
		target.fire('Enter');

		expect(onStepForward).not.toHaveBeenCalled();
		expect(onStepBackward).not.toHaveBeenCalled();
	});

	it('ignores keydown when the focused target is an input/textarea/contenteditable', () => {
		const target = createFakeTarget();
		const onStepForward = vi.fn();
		attachPedalListener({ onStepForward, onStepBackward: vi.fn() }, target);

		const input = { tagName: 'INPUT', isContentEditable: false } as unknown as HTMLElement;
		target.fire('PageDown', input);

		expect(onStepForward).not.toHaveBeenCalled();
	});

	it('calls preventDefault on a recognized pedal key (so the page itself does not also scroll natively)', () => {
		const target = createFakeTarget();
		attachPedalListener({ onStepForward: vi.fn(), onStepBackward: vi.fn() }, target);

		const event = target.fire('PageDown');
		expect(event.preventDefault).toHaveBeenCalled();
	});

	it('routes to onNextSong/onPreviousSong instead of the step handlers when configured for nav-song', () => {
		setPedalConfig({ action: 'nav-song' });
		const target = createFakeTarget();
		const onStepForward = vi.fn();
		const onNextSong = vi.fn();
		const onPreviousSong = vi.fn();
		attachPedalListener(
			{ onStepForward, onStepBackward: vi.fn(), onNextSong, onPreviousSong },
			target
		);

		target.fire('PageDown');
		target.fire('PageUp');

		expect(onNextSong).toHaveBeenCalledOnce();
		expect(onPreviousSong).toHaveBeenCalledOnce();
		expect(onStepForward).not.toHaveBeenCalled();
	});

	it('falls back to scroll-step when nav-song is configured but no nav handlers were provided (works outside a session, R8)', () => {
		setPedalConfig({ action: 'nav-song' });
		const target = createFakeTarget();
		const onStepForward = vi.fn();
		attachPedalListener({ onStepForward, onStepBackward: vi.fn() }, target);

		target.fire('PageDown');

		expect(onStepForward).toHaveBeenCalledOnce();
	});

	it('the returned cleanup function detaches the listener', () => {
		const target = createFakeTarget();
		const onStepForward = vi.fn();
		const detach = attachPedalListener({ onStepForward, onStepBackward: vi.fn() }, target);

		detach();
		target.fire('PageDown');

		expect(onStepForward).not.toHaveBeenCalled();
		expect(target.listenerCount()).toBe(0);
	});
});
