<script lang="ts">
	import { onDestroy } from 'svelte';
	import { resolve } from '$app/paths';
	import { currentBand } from '$lib/stores/currentBand';
	import { liveSession } from '$lib/stores/liveSession';
	import { presentUserIds } from '$lib/stores/presence';
	import { autoScroll } from '$lib/stores/autoScroll';
	import { subscribeLiveSession, type LiveChannelHandle } from '$lib/realtime/liveChannel';
	import type { LiveEvent } from '$lib/types/realtime';
	import { fetchMemberEmails } from '$lib/utils/memberNames';
	import SongViewer from '$lib/components/song/SongViewer.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
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
		bpm: number | null;
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
				handle = subscribeLiveSession(
					data.supabase,
					band.id,
					memberEmails,
					data.user.id,
					handlePlaybackEvent
				);
			}
			loadingSession = false;
		})();
	});

	// 006 R6: PLAY/PAUSE/RESYNC drive the local auto-scroll clock. R7: a
	// device in Individual mode ignores them entirely — it's reviewing its
	// own song, not following the leader's playback state.
	function handlePlaybackEvent(event: LiveEvent) {
		if (followMode !== 'leader') return;

		if (event.type === 'PLAY') autoScroll.play();
		else if (event.type === 'PAUSE') autoScroll.pauseByLeader();
		else if (event.type === 'RESYNC') autoScroll.resync(event.elapsed_ms);
	}

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

	// --- 006: leader-driven playback (write-then-broadcast, same pattern as
	// handleTakeLeadership/handleChangeSongAsLeader above) --------------------

	async function handleLeaderPlay() {
		const session = $liveSession;
		if (!session) return;

		const timestamp = Date.now();
		const { error } = await data.supabase
			.from('live_sessions')
			.update({ status: 'playing' })
			.eq('id', session.sessionId);
		if (error) return;

		autoScroll.play();
		handle?.broadcast({ type: 'PLAY', leader_timestamp: timestamp });
	}

	async function handleLeaderPause() {
		const session = $liveSession;
		if (!session) return;

		const timestamp = Date.now();
		const { error } = await data.supabase
			.from('live_sessions')
			.update({ status: 'paused' })
			.eq('id', session.sessionId);
		if (error) return;

		autoScroll.pauseByLeader();
		handle?.broadcast({ type: 'PAUSE', leader_timestamp: timestamp });
	}

	// --- R8: Modo Convidado (link assinado, gerado pelo líder) --------------

	let guestModalOpen = $state(false);
	let guestLink = $state<string | null>(null);
	let guestError = $state<string | null>(null);
	let generatingGuestLink = $state(false);

	async function handleGenerateGuestLink() {
		const session = $liveSession;
		if (!session) return;

		guestModalOpen = true;
		guestError = null;
		guestLink = null;
		generatingGuestLink = true;

		const { data: fnData, error } = await data.supabase.functions.invoke('guest-access/generate', {
			body: { session_id: session.sessionId }
		});

		generatingGuestLink = false;

		if (error || !fnData?.data?.token) {
			guestError = 'Não foi possível gerar o link de convidado.';
			return;
		}

		guestLink = `${window.location.origin}${resolve(`/guest/${fnData.data.token}`)}`;
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
				.select('id, band_id, title, artist, original_key, preferred_key, capo, bpm')
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

	// 006 R7: pedal in 'nav-song' mode moves through the setlist — only
	// wired for the leader (only they drive the session's current song).
	const canControlPlayback = $derived(isLeader || followMode === 'individual');

	function handleNavSongByPedal(direction: 1 | -1) {
		if (!isLeader) return;

		const currentIndex = setlistItems.findIndex((item) => item.song_id === effectiveSongId);
		const nextIndex = currentIndex + direction;
		const nextItem = setlistItems[nextIndex];
		if (nextItem) handleChangeSongAsLeader(nextItem.song_id);
	}

	// --- R5: fila de sugestões ----------------------------------------------

	interface PendingSuggestion {
		id: string;
		songId: string;
		songTitle: string;
		suggestedByName: string;
	}

	let pendingSuggestions = $state<PendingSuggestion[]>([]);

	// Refetched on load and whenever any live event bumps the session's
	// clock (a SUGGESTION broadcast among them) — simpler than a dedicated
	// suggestions store, and the queue is only shown to the leader anyway.
	$effect(() => {
		const sessionId = $liveSession?.sessionId ?? null;
		void $liveSession?.lastEventTimestamp;

		if (!sessionId || !isLeader) {
			pendingSuggestions = [];
			return;
		}

		data.supabase
			.from('session_suggestions')
			.select('id, song_id, suggested_by, songs (title)')
			.eq('session_id', sessionId)
			.eq('status', 'pending')
			.order('created_at')
			.then(({ data: rows }) => {
				pendingSuggestions = (rows ?? []).map((row) => ({
					id: row.id,
					songId: row.song_id,
					songTitle: row.songs?.title ?? '(sem título)',
					suggestedByName: memberEmails.get(row.suggested_by) ?? row.suggested_by
				}));
			});
	});

	async function acceptSuggestion(suggestion: PendingSuggestion) {
		const session = $liveSession;
		if (!session) return;

		const { error: statusError } = await data.supabase
			.from('session_suggestions')
			.update({ status: 'accepted' })
			.eq('id', suggestion.id);

		if (statusError) return;

		handleChangeSongAsLeader(suggestion.songId);
		pendingSuggestions = pendingSuggestions.filter((item) => item.id !== suggestion.id);
	}

	async function dismissSuggestion(suggestion: PendingSuggestion) {
		await data.supabase
			.from('session_suggestions')
			.update({ status: 'dismissed' })
			.eq('id', suggestion.id);

		pendingSuggestions = pendingSuggestions.filter((item) => item.id !== suggestion.id);
	}

	// --- "Sugerir Música" modal (any member) --------------------------------

	interface CatalogSong {
		id: string;
		title: string;
		artist: string | null;
	}

	let suggestModalOpen = $state(false);
	let suggestCatalog = $state<CatalogSong[]>([]);
	let suggestQuery = $state('');
	let suggestError = $state<string | null>(null);

	function openSuggestModal() {
		suggestModalOpen = true;
		suggestError = null;

		const band = $currentBand;
		if (!band) return;

		data.supabase
			.from('songs')
			.select('id, title, artist')
			.eq('band_id', band.id)
			.order('title')
			.then(({ data: rows }) => {
				suggestCatalog = rows ?? [];
			});
	}

	const availableSuggestions = $derived(
		suggestCatalog.filter((catalogSong) => {
			const q = suggestQuery.trim().toLowerCase();
			if (!q) return true;
			return `${catalogSong.title} ${catalogSong.artist ?? ''}`.toLowerCase().includes(q);
		})
	);

	async function handleSuggest(catalogSong: CatalogSong) {
		const session = $liveSession;
		if (!session || !data.user) return;

		suggestError = null;

		const { data: row, error } = await data.supabase
			.from('session_suggestions')
			.insert({
				session_id: session.sessionId,
				song_id: catalogSong.id,
				suggested_by: data.user.id
			})
			.select('id')
			.single();

		if (error || !row) {
			suggestError = 'Não foi possível sugerir essa música.';
			return;
		}

		suggestModalOpen = false;

		const event = {
			type: 'SUGGESTION' as const,
			suggestion_id: row.id,
			song_title: catalogSong.title,
			suggested_by_name: memberEmails.get(data.user.id) ?? data.user.id,
			leader_timestamp: Date.now()
		};

		// Same self-broadcast gap as elsewhere: bump our own clock too, since
		// the leader's queue effect above re-fetches on lastEventTimestamp.
		liveSession.applyEvent(event);
		handle?.broadcast(event);
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
			<div class="flex gap-2">
				<Button variant="secondary" size="sm" onclick={handleGenerateGuestLink}>
					Convidar substituto
				</Button>
				<Button variant="danger" size="sm" onclick={handleEndSession}>Encerrar sessão</Button>
			</div>
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

	{#if isLeader && pendingSuggestions.length > 0}
		<div class="border-b border-border bg-surface-raised px-6 py-3">
			<p class="text-xs font-medium tracking-wide text-content-muted uppercase">Sugestões</p>
			<ul class="mt-2 flex flex-col gap-2">
				{#each pendingSuggestions as suggestion (suggestion.id)}
					<li class="flex items-center justify-between gap-3 rounded-md bg-surface px-3 py-2">
						<span class="min-w-0 truncate text-sm text-content">
							{suggestion.songTitle}
							<span class="text-content-muted">— sugerido por {suggestion.suggestedByName}</span>
						</span>
						<div class="flex shrink-0 gap-2">
							<button
								type="button"
								onclick={() => acceptSuggestion(suggestion)}
								class="h-9 cursor-pointer rounded-md border border-accent px-3 text-sm text-accent hover:opacity-80"
							>
								Aceitar
							</button>
							<button
								type="button"
								onclick={() => dismissSuggestion(suggestion)}
								class="h-9 cursor-pointer rounded-md border border-border px-3 text-sm text-content-muted hover:text-content"
							>
								Dispensar
							</button>
						</div>
					</li>
				{/each}
			</ul>
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
			session={{
				isLeader,
				leaderName,
				onTakeLeadership: handleTakeLeadership,
				presentEmails,
				onSuggest: openSuggestModal
			}}
			playback={{
				canControl: canControlPlayback,
				onPlay: isLeader ? handleLeaderPlay : () => autoScroll.play(),
				onPause: isLeader ? handleLeaderPause : () => autoScroll.pauseByUser(),
				onNavSong: isLeader ? handleNavSongByPedal : undefined
			}}
		/>
	{/if}

	<Modal open={suggestModalOpen} title="Sugerir música" onClose={() => (suggestModalOpen = false)}>
		<input
			type="search"
			placeholder="Buscar no repertório..."
			bind:value={suggestQuery}
			class="h-11 w-full rounded-md border border-border bg-surface px-3 text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
		/>
		{#if suggestError}
			<p class="mt-2 text-sm text-danger" role="alert">{suggestError}</p>
		{/if}
		<ul class="mt-3 flex max-h-64 flex-col gap-1 overflow-y-auto">
			{#each availableSuggestions as catalogSong (catalogSong.id)}
				<li>
					<button
						type="button"
						onclick={() => handleSuggest(catalogSong)}
						class="flex h-11 w-full cursor-pointer items-center justify-between rounded px-3 text-left text-sm text-content hover:bg-surface"
					>
						<span class="truncate"
							>{catalogSong.title}{#if catalogSong.artist}
								· {catalogSong.artist}{/if}</span
						>
					</button>
				</li>
			{:else}
				<li class="px-3 py-2 text-sm text-content-muted">Nenhuma música encontrada.</li>
			{/each}
		</ul>
	</Modal>

	<Modal open={guestModalOpen} title="Convidar substituto" onClose={() => (guestModalOpen = false)}>
		{#if generatingGuestLink}
			<p class="text-sm text-content-muted">Gerando link...</p>
		{:else if guestError}
			<p class="text-sm text-danger" role="alert">{guestError}</p>
		{:else if guestLink}
			<p class="text-sm text-content-muted">
				Link válido por 24h, somente leitura, sem precisar de conta:
			</p>
			<input
				type="text"
				readonly
				value={guestLink}
				onclick={(event) => event.currentTarget.select()}
				class="mt-3 h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
			/>
		{/if}
	</Modal>
{/if}
