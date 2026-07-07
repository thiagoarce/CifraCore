import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

const STORAGE_KEY = 'cifracore:currentBandId';

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

const tarjaPreta = { id: 'band-1', name: 'Tarja Preta' };
const baiaoDeDois = { id: 'band-2', name: 'Baião de Dois' };

describe('currentBand store', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.stubGlobal('window', {});
		vi.stubGlobal('localStorage', createFakeLocalStorage());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('persists the selection to localStorage', async () => {
		const { currentBand } = await import('./currentBand');

		currentBand.select(tarjaPreta);

		expect(get(currentBand)).toEqual(tarjaPreta);
		expect(localStorage.getItem(STORAGE_KEY)).toBe('band-1');
	});

	it('initializes using the persisted id when it is present in the list', async () => {
		localStorage.setItem(STORAGE_KEY, 'band-2');

		const { currentBand } = await import('./currentBand');
		currentBand.init([tarjaPreta, baiaoDeDois]);

		expect(get(currentBand)).toEqual(baiaoDeDois);
	});

	it('falls back to the first band when the persisted id is not in the list', async () => {
		localStorage.setItem(STORAGE_KEY, 'band-does-not-exist');

		const { currentBand } = await import('./currentBand');
		currentBand.init([tarjaPreta, baiaoDeDois]);

		expect(get(currentBand)).toEqual(tarjaPreta);
		expect(localStorage.getItem(STORAGE_KEY)).toBe('band-1');
	});

	it('sets null when initializing from an empty list', async () => {
		const { currentBand } = await import('./currentBand');
		currentBand.init([]);

		expect(get(currentBand)).toBeNull();
	});

	it('clear() resets the store and removes the persisted id', async () => {
		const { currentBand } = await import('./currentBand');
		currentBand.select(tarjaPreta);

		currentBand.clear();

		expect(get(currentBand)).toBeNull();
		expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
	});
});
