<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();
</script>

<main class="min-h-screen flex flex-col items-center gap-4 p-4 body-mainPlan">
	<h1 class="text-2xl">{t('pos.terminal.xTitle')}</h1>
	{#if data.ticket}
		<pre class="whitespace-pre-wrap text-sm w-full max-w-md">{data.ticket}</pre>
	{:else}
		<p>{t('pos.terminal.noSession')}</p>
	{/if}
	<a href="/pos/terminal" class="btn body-mainCTA w-full max-w-sm text-xl py-4"
		>{t('pos.terminal.back')}</a
	>
</main>
