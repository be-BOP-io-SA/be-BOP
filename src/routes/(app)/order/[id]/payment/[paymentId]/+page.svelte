<script lang="ts">
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n.js';

	export let form;

	const { t } = useI18n();
</script>

<main class="mx-auto max-w-3xl p-6 flex flex-col gap-4">
	{#if form?.paymentGenerationFailed}
		<div class="alert-error">
			{t('checkout.paymentGenerationFailed')}
		</div>
	{/if}
	<a href="/order/{$page.params.id}" class="body-hyperlink underline">← Order #{$page.params.id}</a>
</main>
