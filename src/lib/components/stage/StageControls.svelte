<script lang="ts">
	import { autoScroll } from '$lib/stores/autoScroll';
	import { resolveDurationSec, setStoredDurationSec } from '$lib/utils/scrollDuration';

	interface Props {
		songId: string;
		lineCount: number;
		bpm: number | null;
		/** False for a follower in "Seguir Líder" mode — they only receive PLAY/PAUSE/RESYNC, they don't drive it (R6/R7). */
		canControl?: boolean;
		/** Leader-in-session: writes live_sessions + broadcasts. Defaults to purely local control (solo practice, R8). */
		onPlay?: () => void;
		onPause?: () => void;
		compact?: boolean;
	}

	let {
		songId,
		lineCount,
		bpm,
		canControl = true,
		onPlay = () => autoScroll.play(),
		onPause = () => autoScroll.pauseByUser(),
		compact = false
	}: Props = $props();

	// Writable $derived: tracks songId/lineCount/bpm (a different song
	// re-resolves the duration), but handleDurationInput can still reassign
	// it directly for the slider without waiting on a round trip.
	let durationSec = $derived(resolveDurationSec(songId, lineCount, bpm));

	$effect(() => {
		autoScroll.configure(durationSec * 1000);
	});

	function handleDurationInput(value: number) {
		durationSec = value;
		setStoredDurationSec(songId, value);
	}

	const scrollState = autoScroll.state;

	function togglePlay() {
		if ($scrollState === 'playing') onPause();
		else onPlay();
	}
</script>

{#if canControl}
	<div
		class="flex flex-wrap items-center gap-3 {compact
			? 'bg-black/30 px-4 py-2 text-white/80'
			: 'border-t border-border bg-surface-raised px-6 py-2 text-content-muted'} text-sm"
	>
		<button
			type="button"
			onclick={togglePlay}
			class="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full {compact
				? 'bg-white/20 text-white hover:bg-white/30'
				: 'bg-accent text-accent-content hover:opacity-90'}"
			aria-label={$scrollState === 'playing'
				? 'Pausar rolagem automática'
				: 'Iniciar rolagem automática'}
		>
			{$scrollState === 'playing' ? '❚❚' : '▶'}
		</button>

		<label class="flex flex-1 items-center gap-2">
			<span class="shrink-0">Duração</span>
			<input
				type="range"
				min="30"
				max="600"
				step="5"
				value={durationSec}
				oninput={(event) => handleDurationInput(Number(event.currentTarget.value))}
				class="flex-1 accent-accent"
			/>
			<span class="w-12 shrink-0 text-right tabular-nums">{durationSec}s</span>
		</label>
	</div>
{/if}
