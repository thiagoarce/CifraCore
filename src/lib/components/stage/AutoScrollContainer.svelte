<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { autoScroll } from '$lib/stores/autoScroll';
	import { attachPedalListener } from '$lib/utils/pedalInput';

	interface Props {
		children: Snippet;
		class?: string;
		/** Leader-in-session only (R7): pedal in 'nav-song' mode changes the setlist's current song instead of stepping the scroll. Absent elsewhere, where a step-scroll fallback applies (R8). */
		onNavSong?: (direction: 1 | -1) => void;
	}

	let { children, class: className = '', onNavSong }: Props = $props();

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

	// R7: pedal step = 60% of the visible height, smooth. A step (like a
	// touch) always interrupts an active auto-scroll first — otherwise the
	// pedal and the clock would fight over scrollTop.
	function stepScroll(direction: 1 | -1) {
		if ($scrollState === 'playing') {
			autoScroll.pauseByUser(currentProgress());
		}
		containerEl?.scrollBy({ top: direction * containerEl.clientHeight * 0.6, behavior: 'smooth' });
	}

	onMount(() =>
		attachPedalListener({
			onStepForward: () => stepScroll(1),
			onStepBackward: () => stepScroll(-1),
			onNextSong: onNavSong ? () => onNavSong(1) : undefined,
			onPreviousSong: onNavSong ? () => onNavSong(-1) : undefined
		})
	);
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
