<script lang="ts">
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { INSTRUMENT_TAB_LABELS } from '$lib/constants/instruments';
	import type { Database } from '$lib/types/database';

	type Instrument = Database['public']['Enums']['instrument'];

	export interface InstrumentTabInfo {
		instrument: Instrument;
		/** True for content_type 'pdf_url' tabs — real rendering is spec 008. */
		locked?: boolean;
	}

	interface Props {
		tabs: InstrumentTabInfo[];
		active: string;
	}

	let { tabs, active = $bindable() }: Props = $props();

	const tabItems = $derived(
		tabs.map((tab) => ({
			value: tab.instrument,
			label: tab.locked
				? `${INSTRUMENT_TAB_LABELS[tab.instrument]} (PDF)`
				: INSTRUMENT_TAB_LABELS[tab.instrument],
			disabled: tab.locked
		}))
	);
</script>

<Tabs tabs={tabItems} bind:active />
