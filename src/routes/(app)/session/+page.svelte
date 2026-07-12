<script lang="ts">
	import { onDestroy } from 'svelte';
	import { resolve } from '$app/paths';
	import { currentBand } from '$lib/stores/currentBand';
	import { liveSession } from '$lib/stores/liveSession';
	import { presentUserIds } from '$lib/stores/presence';
	import { subscribeLiveSession, type LiveChannelHandle } from '$lib/realtime/liveChannel';
	import { fetchMemberEmails } from '$lib/utils/memberNames';
	import SongViewer from '$lib/components/song/SongViewer.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { Database } from '$lib/types/database';

	let { data } = $props();

	type Instrument = Database['public']['Enums']['instrument'];
	type TabRow = {
		id: string;
		instrument: Instrument;
		content_type: Database['public']['Enums']['tab_content_type'];
		content: unknown;
		content_url: string | null;
	};
	type SongRow = {
		id: string;
		band_id: string;
		title: string;
		artist: string | null;
		original_key: string | null;
		preferred_key: string | null;
		capo: number;
	};

	let handle: LiveChannelHandle | null = null;
	let memberEmails = $state<Map<string, string>>(new Map());
	let loadingSession = $state(false);
	let subscribedBandId: string | null = null;

	// One realtime subscription per active band; torn down and rebuilt
	// whenever the user switches $currentBand.
	$effect(() => {
		const band = $currentBand;

		if (!band) {
			liveSession.clear();
			handle?.unsubscribe();
			handle = null;
			subscribedBandId = null;
			followMode = 'leader';
			individualSongId = null;
			return;
		}

		if (subscribedBandId === band.id) return;

		handle?.unsubscribe();
		handle = null;
		subscribedBandId = band.id;
		liveSession.clear();
		followMode = 'leader';
		individualSongId = null;
		loadingSession = true;

		(async () => {
			memberEmails = await fetchMemberEmails(data.supabase, band.id);
			if (data.user) {
				handle = subscribeLiveSession(data.supabase, band.id, memberEmails, data.user.id);
			}
			loadingSession = false;
		})();
	});

	const presentEmails = $derived($presentUserIds.map((id) => memberEmails.get(id) ?? id));

	onDestroy(() => {
		handle?.unsubscribe();
	});

	const isLeader = $derived($liveSession !== null && $liveSession.leaderId === data.user?.id);
	const leaderName = $derived(
		$liveSession ? (memberEmails.get($liveSession.leaderId) ?? $liveSession.leaderId) : ''
	);

	function handleTakeLeadership() {
		const session = $liveSession;
		if (!session || !data.user) return;

		const timestamp = Date.now();
		const newLeaderId = data.user.id;
		const newLeaderName = memberEmails.get(newLeaderId) ?? newLeaderId;

		data.supabase
			.from('live_sessions')
			.update({ leader_id: newLeaderId })
			.eq('id', session.sessionId)
			.then(({ error }) => {
				if (error) return;

				const event = {
					type: 'LEADER_CHANGE' as const,
					leader_id: newLeaderId,
					leader_name: newLeaderName,
					leader_timestamp: timestamp
				};

				// Supabase Realtime does NOT deliver a broadcast back to its own
				// sender by default, so the actor's own store must be updated
				// directly — otherwise the member who just took leadership would
				// never see their own UI reflect it (found live with 2 browsers:
				// the OTHER browser updated instantly, this one didn't move at
				// all until a manual reload). Write-then-broadcast still holds
				// (plan.md): the DB row above is the truth, this is just applying
				// the same event to ourselves that everyone else receives.
				liveSession.applyEvent(event);
				handle?.broadcast(event);
			});
	}

	async function handleEndSession() {
		const session = $liveSession;
		if (!session) return;

		await data.supabase.from('live_sessions').delete().eq('id', session.sessionId);
		liveSession.clear();
	}

	// --- Modo Seguir Líder / Individual (R7) --------------------------------
	//
	// "Seguir Líder" (default): the displayed song tracks $liveSession's
	// current song directly. "Individual": the member locked onto a song of
	// their own choosing (or the leader changed songs while they were
	// browsing); their screen stops reacting to the leader's changes until
	// they explicitly click "Voltar a seguir".
	let followMode = $state<'leader' | 'individual'>('leader');
	let individualSongId = $state<string | null>(null);

	const effectiveSongId = $derived(
		followMode === 'individual' ? individualSongId : ($liveSession?.currentSongId ?? null)
	);

	const isBehindTheBand = $derived(
		followMode === 'individual' &&
			$liveSession !== null &&
			individualSongId !== $liveSession.currentSongId
	);

	function handleReturnToLeader() {
		followMode = 'leader';
		individualSongId = null;
	}

	// --- Current song, reactive to effectiveSongId --------------------------

	let song = $state<SongRow | null>(null);
	let tabs = $state<TabRow[]>([]);
	let loadingSong = $state(false);

	$effect(() => {
		const songId = effectiveSongId;

		if (!songId) {
			song = null;
			tabs = [];
			return;
		}

		loadingSong = true;

		Promise.all([
			data.supabase
				.from('songs')
				.select('id, band_id, title, artist, original_key, preferred_key, capo')
				.eq('id', songId)
				.maybeSingle(),
			data.supabase
				.from('song_tabs')
				.select('id, instrument, content_type, content, content_url')
				.eq('song_id', songId)
		]).then(([songResult, tabsResult]) => {
			song = songResult.data ?? null;
			tabs = tabsResult.data ?? [];
			loadingSong = false;
		});
	});

	const membership = $derived(data.bands.find((band) => band.id === $currentBand?.id));
	const isAdmin = $derived(membership?.role === 'admin');
	const memberInstrument = $derived(membership?.instrument ?? null);

	// --- Leader's song picker (from the session's own setlist) -------------

	interface SetlistItem {
		song_id: string;
		title: string;
	}

	let setlistItems = $state<SetlistItem[]>([]);

	$effect(() => {
		const setlistId = $liveSession?.setlistId ?? null;

		if (!setlistId) {
			setlistItems = [];
			return;
		}

		data.supabase
			.from('setlist_songs')
			.select('song_id, position, songs (title)')
			.eq('setlist_id', setlistId)
			.order('position')
			.then(({ data: rows }) => {
				setlistItems = (rows ?? []).map((row) => ({
					song_id: row.song_id,
					title: row.songs?.title ?? '(sem título)'
				}));
			});
	});

	// Anyone can browse the setlist — the leader's click changes the song
	// for everyone; a follower's click only enters Individual mode locally
	// (R7), it never writes to live_sessions.
	function handlePickSong(songId: string) {
		if (isLeader) {
			handleChangeSongAsLeader(songId);
			return;
		}

		followMode = 'individual';
		individualSongId = songId;
	}

	function handleChangeSongAsLeader(songId: string) {
		const session = $liveSession;
		if (!session || songId === session.currentSongId) return;

		const timestamp = Date.now();

		data.supabase
			.from('live_sessions')
			.update({ current_song_id: songId })
			.eq('id', session.sessionId)
			.then(({ error }) => {
				if (error) return;

				// Same self-broadcast gap as handleTakeLeadership above: apply
				// locally too, don't rely on receiving our own broadcast back.
				const event = {
					type: 'CHANGE_SONG' as const,
					song_id: songId,
					leader_timestamp: timestamp
				};
				liveSession.applyEvent(event);
				handle?.broadcast(event);
			});
	}
</script>

{#if !$currentBand}
	<div class="mx-auto max-w-2xl p-6">
		<p class="text-sm text-content-muted">
			Você ainda não tem uma banda ativa.
			<a href={resolve('/bands')} class="text-accent hover:opacity-80"
				>Criar ou escolher uma banda</a
			>
		</p>
	</div>
{:else if loadingSession}
	<div class="mx-auto max-w-2xl p-6">
		<p class="text-sm text-content-muted">Carregando sessão...</p>
	</div>
{:else if !$liveSession}
	<div class="mx-auto max-w-2xl p-6">
		<p class="text-sm text-content-muted">
			Nenhuma sessão ao vivo ativa para {$currentBand.name}.
			<a href={resolve('/setlists')} class="text-accent hover:opacity-80">
				Escolha um setlist e inicie uma sessão
			</a>.
		</p>
	</div>
{:else}
	<div
		class="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-raised px-6 py-3"
	>
		<div class="flex flex-wrap gap-2">
			{#each setlistItems as item (item.song_id)}
				<button
					type="button"
					onclick={() => handlePickSong(item.song_id)}
					class="h-9 cursor-pointer rounded-md border px-3 text-sm {item.song_id === effectiveSongId
						? 'border-accent text-accent'
						: 'border-border text-content-muted hover:text-content'}"
				>
					{item.title}
				</button>
			{/each}
		</div>
		{#if isLeader}
			<Button variant="danger" size="sm" onclick={handleEndSession}>Encerrar sessão</Button>
		{/if}
	</div>

	{#if isBehindTheBand}
		<div
			class="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-accent/10 px-6 py-2"
		>
			<p class="text-sm text-content">A banda está tocando outra música.</p>
			<button
				type="button"
				onclick={handleReturnToLeader}
				class="h-9 cursor-pointer rounded-md border border-accent px-3 text-sm text-accent hover:opacity-80"
			>
				Voltar a seguir
			</button>
		</div>
	{/if}

	{#if loadingSong}
		<p class="p-6 text-sm text-content-muted">Carregando música...</p>
	{:else if !song}
		<p class="p-6 text-sm text-content-muted">A sessão ainda não tem uma música corrente.</p>
	{:else}
		<SongViewer
			{song}
			{tabs}
			{isAdmin}
			{memberInstrument}
			supabase={data.supabase}
			session={{ isLeader, leaderName, onTakeLeadership: handleTakeLeadership, presentEmails }}
		/>
	{/if}
{/if}
