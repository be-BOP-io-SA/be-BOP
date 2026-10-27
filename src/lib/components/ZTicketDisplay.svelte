<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import IconCheck from '~icons/ant-design/check-outlined';
	import IconArrowLeft from '~icons/ant-design/arrow-left-outlined';

	export let zTicketText: string;
	export let sessionInfo: {
		openedAt: Date;
		closedAt?: Date;
	};
	export let showBackToPos = false;

	const { t } = useI18n();

	let copied = false;

	function printTicket() {
		window.print();
	}

	function copyToClipboard() {
		const element = document.querySelector('.printable');
		if (element) {
			navigator.clipboard.writeText(element.textContent || '');
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} else {
			console.error('Could not find .printable element to copy');
		}
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

<div class="no-print mb-6">
	<p class="text-gray-600 mb-2">
		{t('pos.zTicket.sessionOpened')}
		{new Date(sessionInfo.openedAt).toLocaleString()}
	</p>
	{#if sessionInfo.closedAt}
		<p class="text-gray-600">
			{t('pos.zTicket.sessionClosed')}
			{new Date(sessionInfo.closedAt).toLocaleString()}
		</p>
	{/if}
</div>

<div class="printable bg-white border rounded-lg p-6 mb-6">
	<pre class="font-mono text-sm whitespace-pre-wrap">{zTicketText}</pre>
</div>

<div class="no-print flex gap-3 flex-wrap">
	<button on:click={printTicket} class="btn btn-blue">{t('pos.zTicket.print')}</button>
	<button on:click={copyToClipboard} class="btn" class:btn-blue={!copied} class:btn-green={copied}>
		{#if copied}
			<IconCheck class="w-4 h-4 inline" /> {t('pos.zTicket.copied')}
		{:else}
			{t('pos.zTicket.copy')}
		{/if}
	</button>
	<slot name="back-buttons" />
	{#if showBackToPos}
		<a href="/pos" class="btn btn-gray">
			<IconArrowLeft class="w-4 h-4 inline" /> PoS
		</a>
	{/if}
</div>
