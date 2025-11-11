<script lang="ts">
	import IconCheck from '~icons/ant-design/check-outlined';
	import IconArrowLeft from '~icons/ant-design/arrow-left-outlined';

	export let data;
	let copied = false;
	let editableText = data.xTicketText;

	function printTicket() {
		window.print();
	}

	function copyToClipboard() {
		navigator.clipboard.writeText(editableText);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<svelte:head>
	<style>
		@media print {
			body * {
				visibility: hidden;
			}
			.printable,
			.printable * {
				visibility: visible;
			}
			.printable {
				position: absolute;
				left: 0;
				top: 0;
			}
			.no-print {
				display: none !important;
			}
		}
	</style>
</svelte:head>

<main class="max-w-2xl mx-auto p-6">
	<div class="no-print mb-6">
		<h1 class="text-3xl font-bold mb-4">X Ticket</h1>
		<p class="text-gray-600 mb-4">
			Intermediate report for POS session opened at {new Date(
				data.session.openedAt
			).toLocaleString()}
		</p>
	</div>

	{#if data.allowEditing}
		<div class="no-print mb-4">
			<label for="ticket-editor" class="block text-sm font-medium text-gray-700 mb-2">
				Edit X Ticket (changes are not saved to database)
			</label>
			<textarea
				id="ticket-editor"
				bind:value={editableText}
				class="w-full h-96 p-4 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
				spellcheck="false"
			/>
		</div>
	{/if}

	<div class="printable hidden print:block">
		<pre class="font-mono text-sm whitespace-pre-wrap">{editableText}</pre>
	</div>

	<div class="no-print flex gap-3">
		<button on:click={printTicket} class="btn btn-blue"> Print </button>
		<button
			on:click={copyToClipboard}
			class="btn"
			class:btn-blue={!copied}
			class:btn-green={copied}
		>
			{#if copied}
				<IconCheck class="w-4 h-4 inline" /> Copied
			{:else}
				Copy
			{/if}
		</button>
		<a href="/pos" class="btn btn-gray">
			<IconArrowLeft class="w-4 h-4 inline" /> PoS
		</a>
	</div>
</main>
