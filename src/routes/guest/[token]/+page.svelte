<script lang="ts">
	import { untrack } from 'svelte';
	import SongViewer from '$lib/components/song/SongViewer.svelte';
	import { BROADCAST_EVENT } from '$lib/realtime/liveChannel';
	import { fetchGuestState, type GuestState } from '$lib/utils/guestState';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// One-time snapshot: the token is static for this page's lifetime, later
	// updates come from the realtime effect below, not from re-running load.
	let guestState = $state<GuestState>(untrack(() => data.state));

	// Read-only realtime: no auth/RLS at all for a guest (R8), so this
	// listens on the exact same public broadcast channel the real session
	// uses, and on any event just re-fetches /state — simplest thing that's
	// still correct for an infrequent, read-only view (no local event
	// reconciliation logic to get wrong).
	$effect(() => {
		if (guestState.status !== 'ok') return;

		const channel = data.supabase
			.channel(`live:${guestState.bandId}`)
			.on('broadcast', { event: BROADCAST_EVENT }, () => {
				fetchGuestState(data.token, fetch).then((next) => {
					guestState = next;
				});
			})
			.subscribe();

		return () => {
			data.supabase.removeChannel(channel);
		};
	});
</script>

{#if guestState.status === 'invalid'}
	<div class="flex min-h-screen items-center justify-center bg-surface p-6">
		<p class="text-content-muted">Convite expirado ou inválido.</p>
	</div>
{:else if !guestState.song}
	<div class="flex min-h-screen items-center justify-center bg-surface p-6">
		<p class="text-content-muted">A sessão ainda não tem uma música corrente.</p>
	</div>
{:else}
	<SongViewer
		song={guestState.song}
		tabs={guestState.tabs}
		isAdmin={false}
		memberInstrument={null}
		supabase={data.supabase}
	/>
{/if}
