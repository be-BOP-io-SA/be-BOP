<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n.js';
	import { UrlDependency } from '$lib/types/UrlDependency.js';
	import { onDestroy, onMount } from 'svelte';
	export let data;

	const { t } = useI18n();
	let timeoutId: ReturnType<typeof setInterval>;

	onMount(() => {
		timeoutId = setInterval(() => {
			invalidate(UrlDependency.CtiOrderNotification);
		}, 1000);
	});
	onDestroy(() => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	});
</script>

<div class="mx-auto max-w-7xl px-8">
	<h1 class="text-3xl font-bold text-gray-900 mb-4 text-center">
		{t('customerTouch.receipt.scanNostrNpubPrompt')}
	</h1>
	<div class="flex flex-col gap-4 m-auto">
		<a href="nostr:{data.nostrPublicKey}" class="m-auto">
			<img src="{$page.url.origin}/nostr/qrcode" class="w-96 h-96" alt="Nostr npub QR code" />
		</a>
	</div>
	<h1 class="text-3xl font-bold text-gray-900 mb-4 text-center">
		{t('customerTouch.receipt.sendCodePrompt')}
	</h1>
	<input
		disabled={true}
		placeholder="Email"
		value={data.otpCode}
		class="w-full p-2 bg-gray-100 border-2 border-transparent rounded-lg text-gray-900 mb-4 placeholder-gray-400 text-center text-3xl font-bold"
	/>
</div>
