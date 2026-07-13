/**
 * Bluetooth page-turner pedal support (spec 006-modo-palco R7). Pedals like
 * the AirTurn just emit ordinary keydown events — `PageDown`/`ArrowDown`/
 * `ArrowRight` for "forward", `PageUp`/`ArrowUp`/`ArrowLeft` for "back".
 * The action those keys trigger (scroll a step, or navigate the setlist)
 * is a per-user preference persisted in localStorage.
 */

export type PedalAction = 'scroll-step' | 'nav-song';

export interface PedalConfig {
	action: PedalAction;
}

const STORAGE_KEY = 'cifracore:pedalConfig';
const DEFAULT_CONFIG: PedalConfig = { action: 'scroll-step' };

const FORWARD_KEYS = new Set(['PageDown', 'ArrowDown', 'ArrowRight']);
const BACKWARD_KEYS = new Set(['PageUp', 'ArrowUp', 'ArrowLeft']);

function hasLocalStorage(): boolean {
	return typeof localStorage !== 'undefined';
}

export function getPedalConfig(): PedalConfig {
	if (!hasLocalStorage()) return DEFAULT_CONFIG;

	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return DEFAULT_CONFIG;

	try {
		const parsed = JSON.parse(raw);
		return parsed?.action === 'nav-song' ? { action: 'nav-song' } : DEFAULT_CONFIG;
	} catch {
		return DEFAULT_CONFIG;
	}
}

export function setPedalConfig(config: PedalConfig): void {
	if (!hasLocalStorage()) return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function isEditableTarget(target: EventTarget | null): boolean {
	// Duck-typed rather than `instanceof HTMLElement` — this module is unit
	// tested in a plain Node environment with no DOM globals available.
	if (!target || typeof target !== 'object' || !('tagName' in target)) return false;
	const element = target as { tagName?: string; isContentEditable?: boolean };
	return (
		element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || !!element.isContentEditable
	);
}

export interface PedalHandlers {
	onStepForward: () => void;
	onStepBackward: () => void;
	/** Only called when the configured action is 'nav-song' — falls back to the step handlers when absent (R8: works outside a session too). */
	onNextSong?: () => void;
	onPreviousSong?: () => void;
}

export interface PedalListenerTarget {
	addEventListener(type: 'keydown', listener: (event: KeyboardEvent) => void): void;
	removeEventListener(type: 'keydown', listener: (event: KeyboardEvent) => void): void;
}

/** Attaches the global keydown listener; returns the cleanup function. */
export function attachPedalListener(
	handlers: PedalHandlers,
	target: PedalListenerTarget = window
): () => void {
	function onKeyDown(event: KeyboardEvent) {
		if (isEditableTarget(event.target)) return;

		const isForward = FORWARD_KEYS.has(event.key);
		const isBackward = BACKWARD_KEYS.has(event.key);
		if (!isForward && !isBackward) return;

		event.preventDefault();

		const config = getPedalConfig();
		if (config.action === 'nav-song' && (handlers.onNextSong || handlers.onPreviousSong)) {
			if (isForward) handlers.onNextSong?.();
			else handlers.onPreviousSong?.();
			return;
		}

		if (isForward) handlers.onStepForward();
		else handlers.onStepBackward();
	}

	target.addEventListener('keydown', onKeyDown);
	return () => target.removeEventListener('keydown', onKeyDown);
}
