<script lang="ts">
	import type { Snippet } from 'svelte';
	import { autoScroll } from '$lib/stores/autoScroll';

	interface Props {
		children: Snippet;
		class?: string;
	}

	let { children, class: className = '' }: Props = $props();

	const scrollState = autoScroll.state;
	const scrollProgress = autoScroll.progress;

	let containerEl: HTMLDivElement | undefined = $state();

	function currentProgress(): number {
		if (!containerEl) return 0;
		const max = containerEl.scrollHeight - containerEl.clientHeight;
		return max > 0 ? containerEl.scrollTop / max : 0;
	}

	// R5: touchstart/wheel/mousedown on the chord area pauses instantly, no
	// "tug of war" with the finger — only intercepts while actually playing,
	// a touch while already paused/idle is just normal manual scrolling.
	function handleInterrupt() {
		if ($scrollState !== 'playing') return;
		autoScroll.pauseByUser(currentProgress());
	}

	// "Retomar Sincronia" resumes from wherever the musician actually
	// scrolled to while paused, not the theoretical clock position.
	function handleResume() {
		autoScroll.resumeFrom(currentProgress());
	}

	$effect(() => {
		const target = $scrollProgress;
		if (!containerEl || $scrollState !== 'playing') return;
		const max = containerEl.scrollHeight - containerEl.clientHeight;
		containerEl.scrollTop = target * max;
	});
</script>

<!-- The touch/wheel/mousedown listeners only detect incidental interaction
     to pause an ambient auto-scroll (R5) — they gate nothing a keyboard-only
     user needs, so this isn't a real a11y interactive-element violation. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	bind:this={containerEl}
	class="relative overflow-y-auto {className}"
	role="region"
	aria-label="Conteúdo da cifra"
	ontouchstart={handleInterrupt}
	onwheel={handleInterrupt}
	onmousedown={handleInterrupt}
>
	{@render children()}

	{#if $scrollState === 'pausedByUser'}
		<button
			type="button"
			onclick={handleResume}
			class="fixed bottom-24 left-1/2 z-20 h-11 -translate-x-1/2 cursor-pointer rounded-full bg-accent px-5 text-sm font-medium text-accent-content shadow-lg hover:opacity-90"
		>
			Retomar Sincronia
		</button>
	{/if}
</div>
