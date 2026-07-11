<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let { data } = $props();

	onMount(async () => {
		// getSession() awaits the client's init promise, which is what parses
		// any #access_token=... left in the URL by a Supabase email link
		// (signup confirmation, magic link, invite) before resolving — so this
		// reliably picks up a just-arrived session before deciding where to go.
		const {
			data: { session }
		} = await data.supabase.auth.getSession();

		goto(resolve(session ? '/dashboard' : '/login'), { replaceState: true });
	});
</script>
