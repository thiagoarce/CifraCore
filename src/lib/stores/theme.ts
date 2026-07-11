import { writable } from 'svelte/store';

const STORAGE_KEY = 'cifracore:theme';

export type Theme = 'dark' | 'light';

function hasDocument(): boolean {
	return typeof document !== 'undefined' && typeof localStorage !== 'undefined';
}

function applyClass(theme: Theme): void {
	if (!hasDocument()) return;
	document.documentElement.classList.toggle('light', theme === 'light');
}

function readPersisted(): Theme | null {
	if (!hasDocument()) return null;
	const stored = localStorage.getItem(STORAGE_KEY);
	return stored === 'light' || stored === 'dark' ? stored : null;
}

function persist(theme: Theme): void {
	if (!hasDocument()) return;
	localStorage.setItem(STORAGE_KEY, theme);
}

function createThemeStore() {
	// Dark is the absolute default (spec 003 R1, stage environment) — a user
	// with no saved preference gets dark with zero flash, since the DOM
	// starts with no class and dark is what "no .light class" renders as.
	const { subscribe, set, update } = writable<Theme>(readPersisted() ?? 'dark');

	function apply(next: Theme): void {
		set(next);
		applyClass(next);
		persist(next);
	}

	return {
		subscribe,

		/** Restores the persisted choice (or the dark default) onto the DOM. */
		init(): void {
			const current = readPersisted() ?? 'dark';
			set(current);
			applyClass(current);
		},

		set: apply,

		toggle(): void {
			update((current) => {
				const next: Theme = current === 'light' ? 'dark' : 'light';
				applyClass(next);
				persist(next);
				return next;
			});
		}
	};
}

export const theme = createThemeStore();
