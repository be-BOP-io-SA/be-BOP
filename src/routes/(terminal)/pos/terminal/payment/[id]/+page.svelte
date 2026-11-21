<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n';
	import PriceTag from '$lib/components/PriceTag.svelte';

	export let data;

	const { t } = useI18n();

	// Refreshed while the customer pays; the server asks the processor on each refresh.
	let timer: ReturnType<typeof setInterval> | undefined;
	onMount(() => {
		timer = setInterval(() => {
			if (data.status === 'pending') {
				invalidateAll();
			}
		}, 2000);
	});
	onDestroy(() => clearInterval(timer));

	let copied = false;
	async function copy(value: string) {
		await navigator.clipboard.writeText(value);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	// The value to copy, without the scheme a wallet link adds in front of it.
	$: copyValue = (data.address ?? '').replace(/^(bitcoin|lightning|zcash):/i, '');

	// The be-BOP-pos app exposes its Tap to Pay module to the page; a browser has none.
	type CardBridge = { collectCardPayment(clientSecret: string): Promise<unknown> };
	let cardBridge: CardBridge | undefined;
	let cardError = '';
	onMount(() => {
		cardBridge = (window as unknown as { bebopPos?: CardBridge }).bebopPos;
	});
	async function collectCard() {
		cardError = '';
		try {
			await cardBridge?.collectCardPayment(data.cardClientSecret ?? '');
		} catch (err) {
			cardError = err instanceof Error ? err.message : String(err);
		}
		invalidateAll();
	}

	let receiptQrSvg = '';
	$: if (data.status === 'paid' && !receiptQrSvg) {
		import('qrcode').then(async ({ default: qrcode }) => {
			receiptQrSvg = await qrcode.toString(data.receiptUrl, { type: 'svg', margin: 1 });
		});
	}
</script>

<main
	class="min-h-screen flex flex-col items-center justify-center gap-4 p-4 body-mainPlan text-center"
>
	<p class="text-sm opacity-70">#{data.number}{data.externalRef ? ` · ${data.externalRef}` : ''}</p>
	<PriceTag
		class="text-4xl font-semibold"
		amount={data.price.amount}
		currency={data.price.currency}
	/>

	{#if data.status === 'pending' && data.method === 'card'}
		{#if cardBridge}
			<button
				type="button"
				class="btn body-mainCTA w-full max-w-sm text-xl py-4"
				on:click={collectCard}
			>
				{t('pos.terminal.collectCard')}
			</button>
			{#if cardError}
				<p class="text-red-500" role="alert">{cardError}</p>
			{/if}
		{:else}
			<p>{t('pos.terminal.cardNeedsApp')}</p>
		{/if}
		<p>{t('pos.terminal.waiting')}</p>
		<form
			method="post"
			action="?/cancel"
			on:submit={(e) => (confirm(t('pos.terminal.cancelConfirm')) ? true : e.preventDefault())}
		>
			<button type="submit" class="btn btn-red">{t('pos.terminal.cancel')}</button>
		</form>
	{:else if data.status === 'pending'}
		<a href={data.address} class="w-72 h-72 bg-white block">
			<img src="{$page.url.pathname}/qrcode" alt="QR code" class="w-full h-full" />
		</a>
		{#if copyValue}
			<button
				type="button"
				class="btn btn-gray max-w-sm break-all text-xs"
				on:click={() => copy(copyValue)}
			>
				{copied ? t('pos.terminal.copied') : copyValue}
			</button>
		{/if}
		{#if data.awaitingConfirmation}
			<p class="text-green-600">
				{t('order.awaitingConfirmationBitcoin', { count: data.confirmationBlocks })}
			</p>
		{:else}
			<p>{t('pos.terminal.waiting')}</p>
		{/if}
		<form
			method="post"
			action="?/cancel"
			on:submit={(e) => (confirm(t('pos.terminal.cancelConfirm')) ? true : e.preventDefault())}
		>
			<button type="submit" class="btn btn-red">{t('pos.terminal.cancel')}</button>
		</form>
	{:else if data.status === 'paid'}
		<p class="text-3xl text-green-600 font-semibold">{t('pos.terminal.paid')}</p>
		{#if data.overpayment && !data.overpayment.treatment}
			<form method="post" action="?/overpayment" class="flex flex-col gap-3 w-full max-w-sm">
				<p class="text-lg">
					{t('pos.terminal.overpaid')}
					<PriceTag
						inline
						amount={data.overpayment.amount.amount}
						currency={data.overpayment.amount.currency}
					/>
				</p>
				<p>{t('pos.terminal.overpaidQuestion')}</p>
				<button type="submit" name="treatment" value="tip" class="btn body-mainCTA text-xl py-4">
					{t('pos.terminal.keepAsTip')}
				</button>
				<button type="submit" name="treatment" value="refund" class="btn btn-gray text-xl py-4">
					{t('pos.terminal.refundOverpayment')}
				</button>
			</form>
		{:else}
			{#if data.overpayment?.treatment === 'refund'}
				<p>{t('pos.terminal.refundToDo')}</p>
			{/if}
			<p>{t('pos.terminal.receiptScan')}</p>
			<div class="w-56 h-56 bg-white">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html receiptQrSvg}
			</div>
			<a href="/pos/terminal" class="btn body-mainCTA w-full max-w-sm text-xl py-4">
				{t('pos.terminal.newPayment')}
			</a>
		{/if}
	{:else}
		<p class="text-2xl text-red-600">
			{data.status === 'expired'
				? t('pos.terminal.expired')
				: data.status === 'canceled'
				? t('pos.terminal.canceled')
				: t('pos.terminal.failed')}
		</p>
		<a href="/pos/terminal" class="btn body-mainCTA w-full max-w-sm text-xl py-4">
			{t('pos.terminal.newPayment')}
		</a>
	{/if}
</main>
