import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { LiveEvent } from '$lib/types/realtime';
import { liveSession } from '$lib/stores/liveSession';

const BROADCAST_EVENT = 'live_event';

export interface LiveChannelHandle {
	channel: RealtimeChannel;
	/** Broadcasts a state event to every other device on the session (Lei 3: never scroll/position). */
	broadcast(event: LiveEvent): ReturnType<RealtimeChannel['send']>;
	/** Leaves the channel; call on component teardown. */
	unsubscribe(): void;
}

/**
 * Subscribes to the band's live session channel (`live:{band_id}`) and
 * keeps the `$liveSession` store reconciled with it.
 *
 * Per plan.md: the broadcast is a notification, `live_sessions` is truth.
 * On every (re)subscription — including the Realtime client's own silent
 * reconnection after CHANNEL_ERROR/TIMED_OUT, which re-fires 'SUBSCRIBED'
 * once it recovers — this refetches the row and reconciles the store
 * instead of trusting whatever broadcasts may have been lost (spec R9).
 *
 * Not unit-tested: there is no local Realtime websocket to exercise in
 * vitest. The reconnection behavior itself is verified manually against
 * the local stack in 005-T7's network-throttling test notes; the store's
 * own ordering/staleness logic (what this module delegates to on every
 * event) is unit-tested in `stores/liveSession.spec.ts`.
 */
export function subscribeLiveSession(
	supabase: SupabaseClient<Database>,
	bandId: string,
	memberEmails: Map<string, string>
): LiveChannelHandle {
	async function refetchAndReconcile() {
		const { data } = await supabase
			.from('live_sessions')
			.select('id, band_id, setlist_id, leader_id, current_song_id, status')
			.eq('band_id', bandId)
			.maybeSingle();

		if (!data) {
			liveSession.clear();
			return;
		}

		liveSession.reconcile({
			id: data.id,
			band_id: data.band_id,
			setlist_id: data.setlist_id,
			leader_id: data.leader_id,
			leader_name: memberEmails.get(data.leader_id) ?? data.leader_id,
			current_song_id: data.current_song_id,
			status: data.status
		});
	}

	const channel = supabase
		.channel(`live:${bandId}`)
		.on('broadcast', { event: BROADCAST_EVENT }, ({ payload }) => {
			liveSession.applyEvent(payload as LiveEvent);
		})
		.subscribe((status) => {
			if (status === 'SUBSCRIBED') {
				refetchAndReconcile();
			}
		});

	return {
		channel,
		broadcast(event: LiveEvent) {
			return channel.send({ type: 'broadcast', event: BROADCAST_EVENT, payload: event });
		},
		unsubscribe() {
			supabase.removeChannel(channel);
		}
	};
}
