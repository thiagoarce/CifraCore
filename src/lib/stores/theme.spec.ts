import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

const STORAGE_KEY = 'cifracore:theme';

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

function createFakeDocumentElement() {
	const classes = new Set<string>();
	return {
		classList: {
			toggle: (name: string, force?: boolean) => {
				const shouldHave = force ?? !classes.has(name);
				if (shouldHave) classes.add(name);
				else classes.delete(name);
			},
			contains: (name: string) => classes.has(name)
		}
	};
}

describe('theme store', () => {
	let documentElement: ReturnType<typeof createFakeDocumentElement>;

	beforeEach(() => {
		vi.resetModules();
		documentElement = createFakeDocumentElement();
		vi.stubGlobal('document', { documentElement });
		vi.stubGlobal('localStorage', createFakeLocalStorage());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('defaults to dark with no .light class when nothing is persisted', async () => {
		const { theme } = await import('./theme');

		expect(get(theme)).toBe('dark');
		expect(documentElement.classList.contains('light')).toBe(false);
	});

	it('init() restores a persisted light preference and applies the class', async () => {
		localStorage.setItem(STORAGE_KEY, 'light');

		const { theme } = await import('./theme');
		theme.init();

		expect(get(theme)).toBe('light');
		expect(documentElement.classList.contains('light')).toBe(true);
	});

	it('set() persists the choice and toggles the DOM class', async () => {
		const { theme } = await import('./theme');

		theme.set('light');

		expect(get(theme)).toBe('light');
		expect(documentElement.classList.contains('light')).toBe(true);
		expect(localStorage.getItem(STORAGE_KEY)).toBe('light');

		theme.set('dark');

		expect(get(theme)).toBe('dark');
		expect(documentElement.classList.contains('light')).toBe(false);
		expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
	});

	it('toggle() flips from the dark default to light and back', async () => {
		const { theme } = await import('./theme');

		theme.toggle();
		expect(get(theme)).toBe('light');

		theme.toggle();
		expect(get(theme)).toBe('dark');
	});

	it('a reload with a persisted choice survives (localStorage round-trip)', async () => {
		const { theme: firstLoad } = await import('./theme');
		firstLoad.set('light');

		vi.resetModules();
		const { theme: afterReload } = await import('./theme');

		expect(get(afterReload)).toBe('light');
	});
});
