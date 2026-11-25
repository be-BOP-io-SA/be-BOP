<script lang="ts">
	import { enhance } from '$app/forms';
	import { useI18n } from '$lib/i18n';

	export let data;
	export let form;

	const { t } = useI18n();

	// Asked in the page: the app's web view shows no browser dialog, so `confirm()` would refuse.
	let confirmingClose = false;
</script>

<main class="flex-1 flex flex-col items-center gap-4 p-4 body-mainPlan">
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
			<form method="post" action="?/open" class="flex flex-col gap-3 w-full max-w-sm" use:enhance>
				{#if data.forbidTouchWhenClosed}
					<p class="text-center" role="alert">{t('pos.terminal.errors.tillClosed')}</p>
				{/if}
				<button type="submit" class="btn pos-cta text-xl py-4">
					{t('pos.terminal.till.open')}
				</button>
			</form>
		{:else if confirmingClose}
			<form method="post" action="?/close" class="flex flex-col gap-3 w-full max-w-sm" use:enhance>
				<p class="text-center">{t('pos.terminal.till.closeConfirm')}</p>
				<button type="submit" class="btn btn-red text-xl py-4">
					{t('pos.terminal.till.closeYes')}
				</button>
				<button
					type="button"
					class="btn pos-secondary text-xl py-4"
					on:click={() => (confirmingClose = false)}
				>
					{t('pos.terminal.till.closeKeep')}
				</button>
			</form>
		{:else}
			<button
				type="button"
				class="btn pos-cta w-full max-w-sm text-xl py-4"
				on:click={() => (confirmingClose = true)}
			>
				{t('pos.terminal.till.close')}
			</button>
		{/if}
	{/if}

	{#if !(data.enabled && !data.session && data.forbidTouchWhenClosed)}
		<a href="/pos/terminal" class="btn pos-secondary w-full max-w-sm text-xl py-4"
			>{t('pos.terminal.back')}</a
		>
	{/if}
</main>
