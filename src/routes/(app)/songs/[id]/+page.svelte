<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SongViewer from '$lib/components/song/SongViewer.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<SongViewer
	song={data.song}
	tabs={data.tabs}
	isAdmin={data.isAdmin}
	memberInstrument={data.memberInstrument}
	supabase={data.supabase}
	onEdit={() => goto(resolve(`/songs/${data.song.id}/edit`))}
/>
