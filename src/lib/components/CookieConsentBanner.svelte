<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { useI18n } from '$lib/i18n';
	import { cookieConsentVisible } from '$lib/stores/cookieConsentVisible';

	export let hostnames: string[] = [];
	export let hasPrivacyPage = false;

	const { t } = useI18n();
	let loading = false;

	async function decide(value: 'accepted' | 'denied') {
		loading = true;
		try {
			await fetch('/cookie-consent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ value })
			});
			cookieConsentVisible.set(false);
			await invalidateAll();
		} finally {
			loading = false;
		}
	}
</script>

<aside
	class="fixed inset-x-0 bottom-0 z-50 body-secondPlan border-t border-gray-300 shadow-lg print:hidden"
	role="dialog"
	aria-live="polite"
	aria-label={t('cookieConsent.banner.ariaLabel')}
>
	<div class="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center">
		<div class="flex-1 text-sm">
			{#if hostnames.length > 0}
				<p>{t('cookieConsent.banner.dataSentTo', { hostnames: hostnames.join(', ') })}</p>
			{:else}
				<p>{t('cookieConsent.banner.dataSentToFallback')}</p>
			{/if}
			{#if hasPrivacyPage}
				<a class="body-hyperlink underline text-sm" href="/privacy"
					>{t('cookieConsent.banner.learnMore')}</a
				>
			{/if}
		</div>
		<div class="flex gap-2">
			<button
				type="button"
				class="btn body-secondaryCTA"
				disabled={loading}
				on:click={() => decide('denied')}>{t('cookieConsent.banner.deny')}</button
			>
			<button
				type="button"
				class="btn body-mainCTA"
				disabled={loading}
				on:click={() => decide('accepted')}>{t('cookieConsent.banner.accept')}</button
			>
		</div>
	</div>
</aside>
