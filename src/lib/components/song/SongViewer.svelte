<script lang="ts">
	import { onDestroy } from 'svelte';
	import { preferredInstrument } from '$lib/stores/preferredInstrument';
	import { transposeKey } from '$lib/utils/tonalWrapper';
	import { computeRenderedAst } from '$lib/utils/renderedAst';
	import { createWakeLockController } from '$lib/utils/wakeLock';
	import { autoScroll } from '$lib/stores/autoScroll';
	import SongHeader from '$lib/components/song/SongHeader.svelte';
	import InstrumentTabs from '$lib/components/song/InstrumentTabs.svelte';
	import AstRenderer from '$lib/components/song/AstRenderer.svelte';
	import VoiceSelector from '$lib/components/song/VoiceSelector.svelte';
	import FloatingFooter from '$lib/components/song/FloatingFooter.svelte';
	import AutoScrollContainer from '$lib/components/stage/AutoScrollContainer.svelte';
	import StageControls from '$lib/components/stage/StageControls.svelte';
	import type { ASTBlock } from '$lib/types/ast';
	import type { Database } from '$lib/types/database';
	import type { SupabaseClient } from '@supabase/supabase-js';

	type Instrument = Database['public']['Enums']['instrument'];

	interface SongTab {
		id: string;
		instrument: Instrument;
		content_type: Database['public']['Enums']['tab_content_type'];
		content: unknown;
		content_url: string | null;
	}

	interface SongInfo {
		id: string;
		title: string;
		artist: string | null;
		original_key: string | null;
		preferred_key: string | null;
		capo: number;
		bpm: number | null;
	}

	interface SessionFooterInfo {
		isLeader: boolean;
		leaderName: string;
		onTakeLeadership: () => void;
		presentEmails: string[];
		onSuggest: () => void;
	}

	interface Props {
		song: SongInfo;
		tabs: SongTab[];
		isAdmin: boolean;
		memberInstrument: Instrument | null;
		supabase: SupabaseClient<Database>;
		onEdit?: () => void;
		session?: SessionFooterInfo | null;
		/** 006: session integration for the playback clock — leader-only controls, setlist nav via pedal. Undefined outside a session (solo practice, R8: purely local control). */
		playback?: {
			canControl: boolean;
			onPlay: () => void;
			onPause: () => void;
			onNavSong?: (direction: 1 | -1) => void;
		};
	}

	let {
		song,
		tabs,
		isAdmin,
		memberInstrument,
		supabase,
		onEdit,
		session = null,
		playback
	}: Props = $props();

	const tabInfos = $derived(
		tabs.map((tab) => ({
			instrument: tab.instrument,
			locked: tab.content_type === 'pdf_url'
		}))
	);

	// R4: instrumento preferido (localStorage) > instrumento do músico na
	// banda > primeira tab disponível. Nunca trava se nenhuma bater.
	const defaultInstrument = $derived.by((): Instrument | null => {
		if (tabs.length === 0) return null;

		const preferred = $preferredInstrument;
		if (preferred && tabs.some((tab) => tab.instrument === preferred)) {
			return preferred;
		}

		if (memberInstrument && tabs.some((tab) => tab.instrument === memberInstrument)) {
			return memberInstrument;
		}

		return tabs[0].instrument;
	});

	let activeInstrument = $state<Instrument | ''>('');

	$effect(() => {
		if (activeInstrument === '' && defaultInstrument) {
			activeInstrument = defaultInstrument;
		}
	});

	// Reset back to the computed default whenever the song itself changes
	// (e.g. the live session's leader switches to a different song) — the
	// previous song's tab choice shouldn't linger onto an unrelated song.
	$effect(() => {
		void song.id;
		activeInstrument = '';
		autoScroll.reset();
	});

	const activeTab = $derived(tabs.find((tab) => tab.instrument === activeInstrument) ?? null);

	// Defensive: content is jsonb and, in principle, could be malformed —
	// never crash the song screen over it (constitution Lei 4).
	const blocks = $derived.by((): ASTBlock[] => {
		if (!activeTab || activeTab.content_type !== 'ast') return [];
		return Array.isArray(activeTab.content) ? (activeTab.content as unknown as ASTBlock[]) : [];
	});

	const roles = $derived(
		Array.from(new Set(blocks.map((block) => block.role).filter((role): role is string => !!role)))
	);

	let activeVoice = $state<string | null>(null);

	// Whatever tab ends up showing (explicit click or computed default)
	// becomes the remembered preference for next time.
	$effect(() => {
		if (activeInstrument !== '') preferredInstrument.select(activeInstrument);
	});

	// --- Spec 004: transposição, capo, unroll+destaque de acordes --------

	// Live offset is local only (spec R4: "não persiste automaticamente").
	// Resetting it when the song's own persisted key changes (e.g. after
	// "Salvar como tom da banda") keeps it from drifting.
	let transposeOffset = $state(0);
	const baseKey = $derived(song.preferred_key ?? song.original_key);
	$effect(() => {
		void baseKey;
		transposeOffset = 0;
	});

	const soundingKey = $derived(baseKey ? transposeKey(baseKey, transposeOffset) : null);

	// Capo persists immediately (R5) — a writable $derived: it tracks
	// song.capo (so switching songs in a live session resets it), but
	// handleCapoChange can still reassign it directly for the optimistic
	// update without waiting for the round trip.
	let capo = $derived(song.capo);
	let capoError = $state<string | null>(null);

	const renderedBlocks = $derived(computeRenderedAst(blocks, transposeOffset, capo));

	// Feeds the duration heuristic (006 T6) — a rough proxy for "how long
	// this song visually is", not a precise measure.
	const lineCount = $derived(
		renderedBlocks.reduce((total, block) => total + block.lines.length, 0)
	);

	async function handleCapoChange(newCapo: number) {
		capoError = null;
		const previous = capo;
		capo = newCapo;

		const { error } = await supabase.from('songs').update({ capo: newCapo }).eq('id', song.id);

		if (error) {
			capo = previous;
			capoError = 'Não foi possível salvar o capotraste.';
		}
	}

	let savingBandKey = $state(false);
	let bandKeyError = $state<string | null>(null);

	async function handleSaveAsBandKey() {
		if (!soundingKey) return;
		bandKeyError = null;
		savingBandKey = true;

		const { error } = await supabase
			.from('songs')
			.update({ preferred_key: soundingKey })
			.eq('id', song.id);

		savingBandKey = false;

		if (error) {
			bandKeyError = 'Não foi possível salvar o tom da banda.';
		}
	}

	// --- Spec 006: Modo Extremo + Wake Lock ---------------------------------
	//
	// SongViewer is reused inside the AppShell's sidebar/header (songs/[id],
	// session) AND standalone (guest) — it has no control over an ancestor
	// layout's DOM, so "hiding header/sidebar/footer" (plan.md's literal
	// wording) is done by rendering itself as a fixed, full-viewport overlay
	// instead of a global CSS class reaching into unrelated components. The
	// visual result (tunnel vision, nothing else visible) is the same.
	let stageMode = $state(false);
	let wakeLockWarning = $state<string | null>(null);

	const wakeLock = createWakeLockController(() => {
		wakeLockWarning =
			'Seu navegador não consegue manter a tela ligada automaticamente — desative o bloqueio automático de tela nas configurações do aparelho.';
	});

	$effect(() => {
		if (stageMode) {
			wakeLock.acquire();
			document.documentElement.requestFullscreen?.().catch(() => {
				// iOS Safari and others don't support it in every context —
				// the fixed-overlay CSS is the guaranteed behavior, native
				// fullscreen is a bonus (plan.md).
			});
		} else {
			wakeLock.release();
			if (document.fullscreenElement) {
				document.exitFullscreen?.().catch(() => {});
			}
		}
	});

	onDestroy(() => {
		wakeLock.release();
	});
</script>

<div
	class={stageMode ? 'fixed inset-0 z-40 flex flex-col bg-surface' : 'flex min-h-screen flex-col'}
>
	{#if !stageMode}
		<SongHeader
			title={song.title}
			artist={song.artist}
			{soundingKey}
			offset={transposeOffset}
			onTranspose={(direction) => (transposeOffset += direction)}
			{capo}
			{isAdmin}
			{onEdit}
			onSaveAsBandKey={handleSaveAsBandKey}
			onCapoChange={handleCapoChange}
		/>

		{#if capoError || bandKeyError}
			<p class="px-6 pt-2 text-sm text-danger" role="alert">{capoError ?? bandKeyError}</p>
		{/if}
		{#if savingBandKey}
			<p class="px-6 pt-2 text-sm text-content-muted">Salvando...</p>
		{/if}
		{#if wakeLockWarning}
			<p class="px-6 pt-2 text-sm text-content-muted" role="alert">{wakeLockWarning}</p>
		{/if}

		{#if tabs.length === 0}
			<p class="p-6 text-sm text-content-muted">Essa música ainda não tem nenhuma tab.</p>
		{:else}
			<InstrumentTabs tabs={tabInfos} bind:active={activeInstrument} />
			<VoiceSelector {roles} active={activeVoice} onSelect={(voice) => (activeVoice = voice)} />
		{/if}
	{/if}

	{#if tabs.length > 0}
		<AutoScrollContainer class="flex-1" onNavSong={playback?.onNavSong}>
			<AstRenderer blocks={renderedBlocks} {activeVoice} />
		</AutoScrollContainer>

		<StageControls
			songId={song.id}
			{lineCount}
			bpm={song.bpm}
			canControl={playback?.canControl ?? true}
			onPlay={playback?.onPlay}
			onPause={playback?.onPause}
			compact={stageMode}
		/>
	{/if}

	{#if stageMode}
		<button
			type="button"
			onclick={() => (stageMode = false)}
			aria-label="Sair do Modo Extremo"
			class="fixed top-4 right-4 z-50 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-black/30 text-white/70 hover:text-white"
		>
			✕
		</button>
	{:else}
		<FloatingFooter {session} onEnterStageMode={() => (stageMode = true)} />
	{/if}
</div>
