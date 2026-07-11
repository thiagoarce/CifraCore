<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		title: string;
		onClose: () => void;
		children: Snippet;
	}

	let { open, title, onClose, children }: Props = $props();
	let dialogEl: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) dialogEl.showModal();
		if (!open && dialogEl.open) dialogEl.close();
	});

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === dialogEl) onClose();
	}
</script>

<dialog
	bind:this={dialogEl}
	onclose={onClose}
	oncancel={onClose}
	onclick={handleBackdropClick}
	class="m-auto w-full max-w-md rounded-lg border border-border bg-surface-raised p-0 text-content backdrop:bg-black/50"
>
	<div class="flex items-center justify-between border-b border-border p-4">
		<h2 class="text-base font-semibold">{title}</h2>
		<button
			type="button"
			onclick={onClose}
			aria-label="Fechar"
			class="cursor-pointer rounded-md p-2 text-content-muted hover:bg-surface hover:text-content focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="h-5 w-5"
				aria-hidden="true"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
			</svg>
		</button>
	</div>
	<div class="max-h-[70vh] overflow-y-auto p-4">
		{@render children()}
	</div>
</dialog>
