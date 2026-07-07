import { writable } from 'svelte/store';

const STORAGE_KEY = 'cifracore:currentBandId';

export interface CurrentBand {
	id: string;
	name: string;
}

function hasLocalStorage(): boolean {
	return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function readPersistedId(): string | null {
	if (!hasLocalStorage()) return null;
	return localStorage.getItem(STORAGE_KEY);
}

function persistId(id: string): void {
	if (!hasLocalStorage()) return;
	localStorage.setItem(STORAGE_KEY, id);
}

function clearPersistedId(): void {
	if (!hasLocalStorage()) return;
	localStorage.removeItem(STORAGE_KEY);
}

function createCurrentBandStore() {
	const { subscribe, set } = writable<CurrentBand | null>(null);

	return {
		subscribe,

		/** User-driven switch: sets the active band and persists the choice. */
		select(band: CurrentBand): void {
			set(band);
			persistId(band.id);
		},

		/**
		 * Initializes (or reconciles) the active band from a freshly loaded band
		 * list: uses the persisted id if it is still present in the list,
		 * otherwise falls back to the first band. Sets null when the list is empty.
		 */
		init(bands: CurrentBand[]): void {
			if (bands.length === 0) {
				set(null);
				return;
			}

			const persistedId = readPersistedId();
			const match = persistedId ? bands.find((band) => band.id === persistedId) : undefined;
			const chosen = match ?? bands[0];

			set(chosen);
			persistId(chosen.id);
		},

		/** Clears the active band, e.g. on logout. */
		clear(): void {
			set(null);
			clearPersistedId();
		}
	};
}

export const currentBand = createCurrentBandStore();
