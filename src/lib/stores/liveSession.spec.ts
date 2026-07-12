import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';

import { liveSession, type LiveSessionRow } from './liveSession';
import type { LiveEvent } from '$lib/types/realtime';

const baseRow: LiveSessionRow = {
	id: 'session-1',
	band_id: 'band-1',
	leader_id: 'user-thiago',
	leader_name: 'Thiago',
	current_song_id: 'song-1',
	status: 'idle'
};

describe('liveSession store', () => {
	it('reconcile() sets the full state from a live_sessions row', () => {
		liveSession.reconcile(baseRow, 1000);

		expect(get(liveSession)).toEqual({
			sessionId: 'session-1',
			bandId: 'band-1',
			leaderId: 'user-thiago',
			leaderName: 'Thiago',
			currentSongId: 'song-1',
			status: 'idle',
			lastEventTimestamp: 1000
		});
	});

	it('applyEvent() is a no-op when there is no session loaded yet', () => {
		liveSession.clear();

		liveSession.applyEvent({ type: 'PLAY', leader_timestamp: 1 });

		expect(get(liveSession)).toBeNull();
	});

	it('rejects a payload without a valid leader_timestamp', () => {
		liveSession.reconcile(baseRow, 1000);

		liveSession.applyEvent({
			type: 'CHANGE_SONG',
			song_id: 'song-2'
		} as unknown as LiveEvent);

		expect(get(liveSession)?.currentSongId).toBe('song-1');
	});

	it('rejects NaN/non-finite leader_timestamp the same way', () => {
		liveSession.reconcile(baseRow, 1000);

		liveSession.applyEvent({
			type: 'CHANGE_SONG',
			song_id: 'song-2',
			leader_timestamp: Number.NaN
		});

		expect(get(liveSession)?.currentSongId).toBe('song-1');
	});

	it('applies CHANGE_SONG in order and advances the clock', () => {
		liveSession.reconcile(baseRow, 1000);

		liveSession.applyEvent({ type: 'CHANGE_SONG', song_id: 'song-2', leader_timestamp: 1001 });

		const state = get(liveSession);
		expect(state?.currentSongId).toBe('song-2');
		expect(state?.lastEventTimestamp).toBe(1001);
	});

	it('ignores an obsolete event (timestamp not newer than the last applied)', () => {
		liveSession.reconcile(baseRow, 1000);
		liveSession.applyEvent({ type: 'CHANGE_SONG', song_id: 'song-2', leader_timestamp: 1001 });

		// A reordered PAUSE that was actually emitted before the CHANGE_SONG above.
		liveSession.applyEvent({ type: 'PAUSE', leader_timestamp: 999 });

		const state = get(liveSession);
		expect(state?.currentSongId).toBe('song-2');
		expect(state?.status).toBe('idle');
		expect(state?.lastEventTimestamp).toBe(1001);
	});

	it('ignores a duplicate event with the exact same timestamp as the last applied', () => {
		liveSession.reconcile(baseRow, 1000);
		liveSession.applyEvent({ type: 'PLAY', leader_timestamp: 1001 });

		liveSession.applyEvent({ type: 'PAUSE', leader_timestamp: 1001 });

		expect(get(liveSession)?.status).toBe('playing');
	});

	it('applies PLAY/PAUSE by updating status', () => {
		liveSession.reconcile(baseRow, 1000);

		liveSession.applyEvent({ type: 'PLAY', leader_timestamp: 1001 });
		expect(get(liveSession)?.status).toBe('playing');

		liveSession.applyEvent({ type: 'PAUSE', leader_timestamp: 1002 });
		expect(get(liveSession)?.status).toBe('paused');
	});

	it('applies LEADER_CHANGE by updating leaderId/leaderName', () => {
		liveSession.reconcile(baseRow, 1000);

		liveSession.applyEvent({
			type: 'LEADER_CHANGE',
			leader_id: 'user-membro-x',
			leader_name: 'Membro X',
			leader_timestamp: 1001
		});

		const state = get(liveSession);
		expect(state?.leaderId).toBe('user-membro-x');
		expect(state?.leaderName).toBe('Membro X');
	});

	it('RESYNC and SUGGESTION advance the clock without changing other fields', () => {
		liveSession.reconcile(baseRow, 1000);

		liveSession.applyEvent({ type: 'RESYNC', elapsed_ms: 5000, leader_timestamp: 1001 });
		let state = get(liveSession);
		expect(state?.currentSongId).toBe('song-1');
		expect(state?.status).toBe('idle');
		expect(state?.lastEventTimestamp).toBe(1001);

		liveSession.applyEvent({
			type: 'SUGGESTION',
			suggestion_id: 'sugg-1',
			song_title: 'Tempo Perdido',
			suggested_by_name: 'Membro X',
			leader_timestamp: 1002
		});
		state = get(liveSession);
		expect(state?.currentSongId).toBe('song-1');
		expect(state?.lastEventTimestamp).toBe(1002);
	});

	it('reconcile() (e.g. after a simulated reconnection) always wins, resetting the clock too', () => {
		liveSession.reconcile(baseRow, 1000);
		liveSession.applyEvent({ type: 'CHANGE_SONG', song_id: 'song-2', leader_timestamp: 1001 });

		liveSession.reconcile(
			{ ...baseRow, current_song_id: 'song-3', status: 'playing' },
			500 // older wall-clock time than the last broadcast is irrelevant: the DB is truth
		);

		const state = get(liveSession);
		expect(state?.currentSongId).toBe('song-3');
		expect(state?.status).toBe('playing');
		expect(state?.lastEventTimestamp).toBe(500);
	});

	it('clear() resets the store to null', () => {
		liveSession.reconcile(baseRow, 1000);
		liveSession.clear();

		expect(get(liveSession)).toBeNull();
	});
});
