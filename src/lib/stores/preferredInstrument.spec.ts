import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

const STORAGE_KEY = 'cifracore:instrument';

function createFakeLocalStorage() {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => (key in store ? store[key] : null),
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		}
	};
}

describe('preferredInstrument store', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.stubGlobal('localStorage', createFakeLocalStorage());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('starts null when nothing is persisted', async () => {
		const { preferredInstrument } = await import('./preferredInstrument');
		expect(get(preferredInstrument)).toBeNull();
	});

	it('restores a valid persisted value on load', async () => {
		localStorage.setItem(STORAGE_KEY, 'bass');
		const { preferredInstrument } = await import('./preferredInstrument');
		expect(get(preferredInstrument)).toBe('bass');
	});

	it('ignores a corrupted/invalid persisted value', async () => {
		localStorage.setItem(STORAGE_KEY, 'kazoo');
		const { preferredInstrument } = await import('./preferredInstrument');
		expect(get(preferredInstrument)).toBeNull();
	});

	it('select() persists the choice and survives a reload', async () => {
		const { preferredInstrument: firstLoad } = await import('./preferredInstrument');
		firstLoad.select('drums');
		expect(get(firstLoad)).toBe('drums');
		expect(localStorage.getItem(STORAGE_KEY)).toBe('drums');

		vi.resetModules();
		const { preferredInstrument: afterReload } = await import('./preferredInstrument');
		expect(get(afterReload)).toBe('drums');
	});
});
