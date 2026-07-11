import { writable } from 'svelte/store';

import type { Database } from '$lib/types/database';

const STORAGE_KEY = 'cifracore:instrument';

export type Instrument = Database['public']['Enums']['instrument'];

const VALID_INSTRUMENTS: readonly Instrument[] = [
	'vocal',
	'guitar',
	'bass',
	'drums',
	'keys',
	'cifra'
];

function hasLocalStorage(): boolean {
	return typeof localStorage !== 'undefined';
}

function readPersisted(): Instrument | null {
	if (!hasLocalStorage()) return null;
	const stored = localStorage.getItem(STORAGE_KEY);
	return VALID_INSTRUMENTS.includes(stored as Instrument) ? (stored as Instrument) : null;
}

function persist(instrument: Instrument): void {
	if (!hasLocalStorage()) return;
	localStorage.setItem(STORAGE_KEY, instrument);
}

function createPreferredInstrumentStore() {
	const { subscribe, set } = writable<Instrument | null>(readPersisted());

	return {
		subscribe,

		/** User-driven switch: sets the preferred instrument and persists it. */
		select(instrument: Instrument): void {
			set(instrument);
			persist(instrument);
		}
	};
}

export const preferredInstrument = createPreferredInstrumentStore();
