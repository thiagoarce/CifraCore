import { writable } from 'svelte/store';

/** user_ids currently present on the live session channel (Supabase Presence). */
function createPresenceStore() {
	const { subscribe, set } = writable<string[]>([]);

	return {
		subscribe,
		set,
		clear(): void {
			set([]);
		}
	};
}

export const presentUserIds = createPresenceStore();
