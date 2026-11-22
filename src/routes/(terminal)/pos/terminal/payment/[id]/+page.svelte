<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n';
	import CancelPayment from './CancelPayment.svelte';
	import NotificationAddressInput from '$lib/components/NotificationAddressInput.svelte';
	import PriceTag from '$lib/components/PriceTag.svelte';

	export let data;
	export let form;

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

	// The be-BOP-pos app exposes its native modules to the page; a browser has none.
	type CardBridge = {
		collectCardPayment(clientSecret: string): Promise<unknown>;
		scanQr?(): Promise<string>;
		sendSms?(phone: string, text: string): Promise<unknown>;
		info?(): Promise<{ smsAvailable?: boolean; nfcAvailable?: boolean; nfcEnabled?: boolean }>;
	};
	// The app says whether the device has a SIM ready: the SMS receipt is offered only then.
	let smsAvailable = false;
	let cardBridge: CardBridge | undefined;
	// The customer's npub is never typed: it is scanned from their QR and sent at once.
	let scannedNpub = '';
	let nostrReceiptForm: HTMLFormElement | null = null;
	let phone = '';
	let smsStatus = '';
	async function scanNpub() {
		try {
			scannedNpub = ((await cardBridge?.scanQr?.()) ?? '').trim();
		} catch {
			// Cancelled or no camera: nothing is sent.
			return;
		}
		if (scannedNpub) {
			await tick();
			nostrReceiptForm?.requestSubmit();
		}
	}
	async function sendSms() {
		smsStatus = '';
		try {
			await cardBridge?.sendSms?.(phone, `${t('pos.receipt.title')}: ${data.receiptUrl}`);
			smsStatus = t('pos.terminal.receiptSent');
		} catch (err) {
			smsStatus = err instanceof Error ? err.message : String(err);
		}
	}
	let cardError = '';
	// Tap to Pay reads the card with the device's NFC: it must be there, and switched on.
	let nfc: 'ready' | 'disabled' | 'unavailable' = 'ready';
	async function readDevice() {
		try {
			const info = await cardBridge?.info?.();
			smsAvailable = !!info?.smsAvailable;
			nfc =
				info?.nfcAvailable === false
					? 'unavailable'
					: info?.nfcEnabled === false
					? 'disabled'
					: 'ready';
		} catch {
			smsAvailable = false;
		}
	}
	// Coming back from the Android settings, where NFC was switched on: listen for the card again.
	function onVisible() {
		if (document.visibilityState === 'visible') {
			collectCard();
		}
	}
	onMount(() => {
		cardBridge = (window as unknown as { bebopPos?: CardBridge }).bebopPos;
		// Choosing the card is enough: the device listens for it as soon as this screen opens.
		collectCard();
		document.addEventListener('visibilitychange', onVisible);
		return () => document.removeEventListener('visibilitychange', onVisible);
	});
	let collecting = false;
	async function collectCard() {
		await readDevice();
		if (
			collecting ||
			nfc !== 'ready' ||
			!cardBridge ||
			data.status !== 'pending' ||
			data.method !== 'card'
		) {
			return;
		}
		collecting = true;
		cardError = '';
		try {
			await cardBridge.collectCardPayment(data.cardClientSecret ?? '');
		} catch (err) {
			cardError = err instanceof Error ? err.message : String(err);
		}
		collecting = false;
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
			{#if nfc !== 'ready'}
				<p class="text-red-500" role="alert">
					{nfc === 'disabled' ? t('pos.terminal.nfcDisabled') : t('pos.terminal.nfcUnavailable')}
				</p>
			{/if}
			{#if nfc === 'ready' && collecting}
				<p class="text-xl">{t('pos.terminal.presentCard')}</p>
			{/if}
			{#if cardError}
				<p class="text-red-500" role="alert">{cardError}</p>
				<button
					type="button"
					class="btn body-mainCTA w-full max-w-sm text-xl py-4"
					on:click={collectCard}
				>
					{t('pos.terminal.retryCard')}
				</button>
			{/if}
		{:else}
			<p>{t('pos.terminal.cardNeedsApp')}</p>
		{/if}
		<p>{t('pos.terminal.waiting')}</p>
		{#if data.canCancel}
			<CancelPayment />
		{/if}
		<!-- The payment stays waiting, listed on the home screen of the terminal. -->
		<a href="/pos/terminal" class="underline">{t('pos.terminal.back')}</a>
	{:else if data.status === 'pending'}
		<!-- Shown for the customer's wallet to scan: the device itself never pays. -->
		<img src="{$page.url.pathname}/qrcode" alt="QR code" class="w-72 h-72 bg-white" />
		{#if data.awaitingConfirmation}
			<p class="text-green-600">
				{t('order.awaitingConfirmationBitcoin', { count: data.confirmationBlocks })}
			</p>
		{:else}
			<p>{t('pos.terminal.waiting')}</p>
		{/if}
		{#if data.canCancel}
			<CancelPayment />
		{/if}
		<!-- The payment stays waiting, listed on the home screen of the terminal. -->
		<a href="/pos/terminal" class="underline">{t('pos.terminal.back')}</a>
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
				{#if data.canRefund}
					<button type="submit" name="treatment" value="refund" class="btn btn-gray text-xl py-4">
						{t('pos.terminal.refundOverpayment')}
					</button>
				{/if}
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
			<section class="flex flex-col gap-2 w-full max-w-sm">
				<p class="font-semibold">{t('pos.terminal.sendReceipt')}</p>
				{#if form && 'receiptSent' in form}
					<p class="text-green-600">{t('pos.terminal.receiptSent')}</p>
				{:else if form && 'receiptError' in form}
					<p class="text-red-500">{t(`login.error.${form.receiptError}`)}</p>
				{/if}
				<div class="flex items-end gap-2">
					{#if $page.data.availableContactModes.includes('email')}
						<form method="post" action="?/receipt" class="flex items-end gap-2 grow">
							<NotificationAddressInput
								class="form-label grow text-left"
								modes={['email']}
								required
							/>
							<button
								type="submit"
								class="btn body-mainCTA text-xl"
								title={t('pos.terminal.sendReceipt')}
								aria-label={t('pos.terminal.sendReceipt')}>📤</button
							>
						</form>
					{/if}
					{#if cardBridge?.scanQr && $page.data.availableContactModes.includes('nostr')}
						<form method="post" action="?/receipt" bind:this={nostrReceiptForm}>
							<input type="hidden" name="address" value={scannedNpub} />
							<button
								type="button"
								class="btn btn-gray text-xl"
								title={t('pos.terminal.scan')}
								aria-label={t('pos.terminal.scan')}
								on:click={scanNpub}>📷</button
							>
						</form>
					{/if}
				</div>
				{#if cardBridge?.sendSms && smsAvailable}
					<form class="flex gap-2" on:submit|preventDefault={sendSms}>
						<input
							type="tel"
							class="form-input grow"
							placeholder="+33…"
							bind:value={phone}
							required
						/>
						<button type="submit" class="btn btn-gray">{t('pos.terminal.sendBySms')}</button>
					</form>
					{#if smsStatus}
						<p>{smsStatus}</p>
					{/if}
				{/if}
			</section>
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
