import { writable } from 'svelte/store';
import type { LiveEvent } from '$lib/types/realtime';
import type { Database } from '$lib/types/database';

type SessionStatus = Database['public']['Enums']['session_status'];

export interface LiveSessionState {
	sessionId: string;
	bandId: string;
	setlistId: string | null;
	leaderId: string;
	leaderName: string;
	currentSongId: string | null;
	status: SessionStatus;
	lastEventTimestamp: number;
}

export interface LiveSessionRow {
	id: string;
	band_id: string;
	setlist_id: string | null;
	leader_id: string;
	leader_name: string;
	current_song_id: string | null;
	status: SessionStatus;
}

function isValidTimestamp(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function createLiveSessionStore() {
	const { subscribe, set, update } = writable<LiveSessionState | null>(null);

	return {
		subscribe,

		/**
		 * Full reconciliation from a `live_sessions` row — the database is the
		 * source of truth (plan.md: "o broadcast é notificação, o banco é
		 * verdade"). Used on initial load and on reconnection (R9); always
		 * wins over any prior broadcast state, since it can only be called
		 * with fresher data than what a lost event could have carried.
		 */
		reconcile(row: LiveSessionRow, timestamp: number = Date.now()): void {
			set({
				sessionId: row.id,
				bandId: row.band_id,
				setlistId: row.setlist_id,
				leaderId: row.leader_id,
				leaderName: row.leader_name,
				currentSongId: row.current_song_id,
				status: row.status,
				lastEventTimestamp: timestamp
			});
		},

		/**
		 * Applies a broadcast `LiveEvent`. Discards it (no-op) when there is no
		 * session loaded yet, when `leader_timestamp` is missing/invalid, or
		 * when it is not newer than the last applied event — the anti-jitter
		 * guard against network reordering (plan.md risco R4).
		 */
		applyEvent(event: LiveEvent): void {
			update((current) => {
				if (!current) return current;
				if (!isValidTimestamp(event.leader_timestamp)) return current;
				if (event.leader_timestamp <= current.lastEventTimestamp) return current;

				switch (event.type) {
					case 'CHANGE_SONG':
						return {
							...current,
							currentSongId: event.song_id,
							lastEventTimestamp: event.leader_timestamp
						};
					case 'PLAY':
						return { ...current, status: 'playing', lastEventTimestamp: event.leader_timestamp };
					case 'PAUSE':
						return { ...current, status: 'paused', lastEventTimestamp: event.leader_timestamp };
					case 'LEADER_CHANGE':
						return {
							...current,
							leaderId: event.leader_id,
							leaderName: event.leader_name,
							lastEventTimestamp: event.leader_timestamp
						};
					case 'RESYNC':
					case 'SUGGESTION':
						// Consumed elsewhere (006's clock, 005-T5's suggestion queue) —
						// this store only advances the clock so a later real event
						// isn't wrongly rejected as stale.
						return { ...current, lastEventTimestamp: event.leader_timestamp };
					default:
						return current;
				}
			});
		},

		/** Leaving the session (navigating away, session ended). */
		clear(): void {
			set(null);
		}
	};
}

export const liveSession = createLiveSessionStore();
