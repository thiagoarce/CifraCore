<script lang="ts">
	import { untrack } from 'svelte';
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { preferredInstrument } from '$lib/stores/preferredInstrument';
	import { transposeKey } from '$lib/utils/tonalWrapper';
	import { computeRenderedAst } from '$lib/utils/renderedAst';
	import SongHeader from '$lib/components/song/SongHeader.svelte';
	import InstrumentTabs from '$lib/components/song/InstrumentTabs.svelte';
	import AstRenderer from '$lib/components/song/AstRenderer.svelte';
	import VoiceSelector from '$lib/components/song/VoiceSelector.svelte';
	import FloatingFooter from '$lib/components/song/FloatingFooter.svelte';
	import type { ASTBlock } from '$lib/types/ast';
	import type { Database } from '$lib/types/database';
	import type { PageData } from './$types';

	type Instrument = Database['public']['Enums']['instrument'];

	let { data }: { data: PageData } = $props();

	const tabInfos = $derived(
		data.tabs.map((tab) => ({
			instrument: tab.instrument,
			locked: tab.content_type === 'pdf_url'
		}))
	);

	// R4: instrumento preferido (localStorage) > instrumento do músico na
	// banda > primeira tab disponível. Nunca trava se nenhuma bater.
	const defaultInstrument = $derived.by((): Instrument | null => {
		if (data.tabs.length === 0) return null;

		const preferred = $preferredInstrument;
		if (preferred && data.tabs.some((tab) => tab.instrument === preferred)) {
			return preferred;
		}

		const memberInstrument = data.memberInstrument;
		if (memberInstrument && data.tabs.some((tab) => tab.instrument === memberInstrument)) {
			return memberInstrument;
		}

		return data.tabs[0].instrument;
	});

	let activeInstrument = $state<Instrument | ''>('');

	$effect(() => {
		if (activeInstrument === '' && defaultInstrument) {
			activeInstrument = defaultInstrument;
		}
	});

	const activeTab = $derived(data.tabs.find((tab) => tab.instrument === activeInstrument) ?? null);

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
	const baseKey = $derived(data.song.preferred_key ?? data.song.original_key);
	$effect(() => {
		void baseKey;
		transposeOffset = 0;
	});

	const soundingKey = $derived(baseKey ? transposeKey(baseKey, transposeOffset) : null);

	// Capo persists immediately (R5) — seeded once from the load, then it's
	// this component's own optimistic local copy.
	let capo = $state(untrack(() => data.song.capo));
	let capoError = $state<string | null>(null);

	const renderedBlocks = $derived(computeRenderedAst(blocks, transposeOffset, capo));

	async function handleCapoChange(newCapo: number) {
		capoError = null;
		const previous = capo;
		capo = newCapo;

		const { error } = await data.supabase
			.from('songs')
			.update({ capo: newCapo })
			.eq('id', data.song.id);

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

		const { error } = await data.supabase
			.from('songs')
			.update({ preferred_key: soundingKey })
			.eq('id', data.song.id);

		savingBandKey = false;

		if (error) {
			bandKeyError = 'Não foi possível salvar o tom da banda.';
			return;
		}

		await invalidate('app:song');
	}
</script>

<div class="flex min-h-screen flex-col">
	<SongHeader
		title={data.song.title}
		artist={data.song.artist}
		{soundingKey}
		offset={transposeOffset}
		onTranspose={(direction) => (transposeOffset += direction)}
		{capo}
		isAdmin={data.isAdmin}
		onEdit={() => goto(resolve(`/songs/${data.song.id}/edit`))}
		onSaveAsBandKey={handleSaveAsBandKey}
		onCapoChange={handleCapoChange}
	/>

	{#if capoError || bandKeyError}
		<p class="px-6 pt-2 text-sm text-danger" role="alert">{capoError ?? bandKeyError}</p>
	{/if}
	{#if savingBandKey}
		<p class="px-6 pt-2 text-sm text-content-muted">Salvando...</p>
	{/if}

	{#if data.tabs.length === 0}
		<p class="p-6 text-sm text-content-muted">Essa música ainda não tem nenhuma tab.</p>
	{:else}
		<InstrumentTabs tabs={tabInfos} bind:active={activeInstrument} />

		<VoiceSelector {roles} active={activeVoice} onSelect={(voice) => (activeVoice = voice)} />

		<div class="flex-1 overflow-y-auto">
			<AstRenderer blocks={renderedBlocks} {activeVoice} />
		</div>
	{/if}

	<FloatingFooter />
</div>
