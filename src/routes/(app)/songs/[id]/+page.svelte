<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { preferredInstrument } from '$lib/stores/preferredInstrument';
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
</script>

<div class="flex min-h-screen flex-col">
	<SongHeader
		title={data.song.title}
		artist={data.song.artist}
		originalKey={data.song.original_key}
		isAdmin={data.isAdmin}
		onEdit={() => goto(resolve(`/songs/${data.song.id}/edit`))}
	/>

	{#if data.tabs.length === 0}
		<p class="p-6 text-sm text-content-muted">Essa música ainda não tem nenhuma tab.</p>
	{:else}
		<InstrumentTabs tabs={tabInfos} bind:active={activeInstrument} />

		<VoiceSelector {roles} active={activeVoice} onSelect={(voice) => (activeVoice = voice)} />

		<div class="flex-1 overflow-y-auto">
			<AstRenderer {blocks} {activeVoice} />
		</div>
	{/if}

	<FloatingFooter />
</div>
