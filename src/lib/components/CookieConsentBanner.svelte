<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { useI18n } from '$lib/i18n';
	import { cookieConsentVisible } from '$lib/stores/cookieConsentVisible';

	export let hostnames: string[] = [];

	const { t } = useI18n();
	let loading = false;

	/**
	 * Injects the raw analytics snippet returned by `/cookie-consent` into the current page
	 * without a full reload. The snippet is HTML (potentially `<script>`, `<link>`, `<meta>`,
	 * `<noscript>`), so we parse it via `DOMParser` and re-create each `<script>` — assigning
	 * `.innerHTML` to a container does *not* execute inline `<script>` per the HTML spec.
	 */
	function injectAnalyticsSnippet(snippet: string) {
		if (!snippet) {
			return;
		}
		const doc = new DOMParser().parseFromString(snippet, 'text/html');
		const nodes = [...doc.head.childNodes, ...doc.body.childNodes];
		for (const node of nodes) {
			if (node.nodeType !== Node.ELEMENT_NODE) {
				continue;
			}
			const el = node as Element;
			if (el.tagName === 'SCRIPT') {
				const script = document.createElement('script');
				for (const attr of Array.from(el.attributes)) {
					script.setAttribute(attr.name, attr.value);
				}
				script.text = el.textContent ?? '';
				document.head.appendChild(script);
			} else {
				document.head.appendChild(el.cloneNode(true));
			}
		}
	}

	async function decide(value: 'accepted' | 'denied') {
		loading = true;
		try {
			const res = await fetch('/cookie-consent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ value })
			});
			cookieConsentVisible.set(false);
			if (value === 'accepted') {
				const { analyticsScriptSnippet } = (await res.json()) as {
					analyticsScriptSnippet?: string;
				};
				injectAnalyticsSnippet(analyticsScriptSnippet ?? '');
			}
			// Re-run the root layout loader so `data.analyticsConsent` flips from `null` to
			// `'accepted' | 'denied'`. Without this the banner would stay visible — the display
			// gate reads `data.analyticsConsent === null || $cookieConsentVisible`, and clearing
			// only the store leaves the first branch true. `<svelte:head>` also re-renders the
			// snippet as inert text; scripts are already executing via `injectAnalyticsSnippet`.
			await invalidateAll();
		} finally {
			loading = false;
		}
	}
</script>

<!--
	A11y follow-up (issue #2650): role="dialog" + aria-live="polite" without focus management
	is a broken compromise. Deferred because most be-BOPs won't configure analytics and the
	banner never appears — will be revisited when a high-traffic tenant with analytics needs it.
-->
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
			<a class="body-hyperlink underline text-sm" href="/privacy"
				>{t('cookieConsent.banner.learnMore')}</a
			>
		</div>
		<div class="flex gap-2">
			<button
				type="button"
				class="btn body-mainCTA"
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
