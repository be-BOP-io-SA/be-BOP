<script lang="ts">
	import { useI18n } from '$lib/i18n';

	/** What went wrong, as the provider or the app said it: shown when the notice is touched. */
	export let detail = '';

	const { t } = useI18n();

	// A pop-up of the page: the web view of the app shows no browser dialog.
	let open = false;
</script>

<button type="button" class="text-red-500 underline text-center" on:click={() => (open = true)}>
	{t('pos.terminal.errorOccurred')}
</button>

{#if open}
	<div
		class="fixed inset-0 z-20 grid place-items-center p-4 bg-black/60"
		role="dialog"
		aria-modal="true"
		aria-label={t('pos.terminal.errorOccurred')}
	>
		<div class="w-full max-w-sm rounded p-4 flex flex-col gap-3 body-mainPlan">
			<h2 class="text-xl text-red-500">{t('pos.terminal.errorOccurred')}</h2>
			<pre class="whitespace-pre-wrap break-words text-sm max-h-[50vh] overflow-y-auto">{detail ||
					t('pos.terminal.errorNoDetail')}</pre>
			<button type="button" class="btn pos-cta text-xl py-3" on:click={() => (open = false)}>
				{t('pos.terminal.errorClose')}
			</button>
		</div>
	</div>
{/if}
