<script lang="ts">
	// Visual QA page for the design system (spec 003 T1 DoD). Not linked from
	// any nav — reachable only by URL, for reviewing both themes side by side.
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte';

	let inputValue = $state('');
	let errorValue = $state('valor inválido');
	let activeTab = $state('cifra');
	let modalOpen = $state(false);
</script>

<div class="min-h-screen bg-surface p-6 text-content">
	<div class="mx-auto flex max-w-2xl flex-col gap-8">
		<div class="flex items-center justify-between">
			<h1 class="text-xl font-semibold">UI Kit — amostra dos dois temas</h1>
			<ThemeToggle />
		</div>

		<Card>
			<h2 class="mb-3 text-sm font-medium text-content-muted">Button</h2>
			<div class="flex flex-wrap items-center gap-3">
				<Button variant="primary">Primário</Button>
				<Button variant="secondary">Secundário</Button>
				<Button variant="danger">Destrutivo</Button>
				<Button variant="ghost">Ghost</Button>
				<Button variant="primary" loading>Carregando</Button>
				<Button variant="primary" disabled>Desabilitado</Button>
			</div>
		</Card>

		<Card>
			<h2 class="mb-3 text-sm font-medium text-content-muted">Badge</h2>
			<div class="flex flex-wrap items-center gap-3">
				<Badge>Padrão</Badge>
				<Badge variant="accent">Admin</Badge>
				<Badge variant="danger">Erro</Badge>
			</div>
		</Card>

		<Card>
			<h2 class="mb-3 text-sm font-medium text-content-muted">Input</h2>
			<div class="flex flex-col gap-4">
				<Input id="sample-input" label="Título da música" bind:value={inputValue} required />
				<Input
					id="sample-input-error"
					label="Com erro"
					bind:value={errorValue}
					error="Este campo é obrigatório."
				/>
				<Input
					id="sample-input-helper"
					label="Com ajuda"
					value=""
					helperText="Texto de apoio abaixo do campo."
				/>
			</div>
		</Card>

		<Card>
			<h2 class="mb-3 text-sm font-medium text-content-muted">Tabs</h2>
			<Tabs
				bind:active={activeTab}
				tabs={[
					{ value: 'letra', label: 'Letra' },
					{ value: 'cifra', label: 'Cifra' },
					{ value: 'baixo', label: 'Baixo' },
					{ value: 'partitura', label: 'Partitura', disabled: true }
				]}
			/>
			<p class="mt-3 text-sm text-content-muted">Aba ativa: {activeTab}</p>
		</Card>

		<Card>
			<h2 class="mb-3 text-sm font-medium text-content-muted">Modal</h2>
			<Button onclick={() => (modalOpen = true)}>Abrir modal</Button>
			<Modal open={modalOpen} title="Exemplo de modal" onClose={() => (modalOpen = false)}>
				<p class="text-sm text-content-muted">Conteúdo do modal, com fechar por ESC ou backdrop.</p>
			</Modal>
		</Card>
	</div>
</div>
