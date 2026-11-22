<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let data;
	export let form;

	const { t } = useI18n();
</script>

<main class="min-h-screen flex flex-col items-center gap-4 p-4 body-mainPlan">
	<h1 class="text-2xl">{t('pos.terminal.till.title')}</h1>

	{#if form && 'zTicket' in form}
		<p class="text-green-600 font-semibold">{t('pos.terminal.till.closed')}</p>
		<pre class="whitespace-pre-wrap text-sm w-full max-w-md">{form.zTicket}</pre>
	{:else if !data.enabled}
		<p class="text-center max-w-sm">{t('pos.terminal.till.notEnabled')}</p>
	{:else}
		{#if form && 'tillError' in form}
			<p class="text-red-500" role="alert">{t(`pos.terminal.till.errors.${form.tillError}`)}</p>
		{/if}
		{#if !data.session}
			<form method="post" action="?/open" class="flex flex-col gap-3 w-full max-w-sm">
				{#if data.forbidTouchWhenClosed}
					<p class="text-center" role="alert">{t('pos.terminal.errors.tillClosed')}</p>
				{/if}
				<button type="submit" class="btn body-mainCTA text-xl py-4">
					{t('pos.terminal.till.open')}
				</button>
			</form>
		{:else}
			<form method="post" action="?/close" class="flex flex-col gap-3 w-full max-w-sm">
				<button type="submit" class="btn body-mainCTA text-xl py-4">
					{t('pos.terminal.till.close')}
				</button>
			</form>
		{/if}
	{/if}

	{#if !(data.enabled && !data.session && data.forbidTouchWhenClosed)}
		<a href="/pos/terminal" class="btn btn-gray w-full max-w-sm text-xl py-4"
			>{t('pos.terminal.back')}</a
		>
	{/if}
</main>
