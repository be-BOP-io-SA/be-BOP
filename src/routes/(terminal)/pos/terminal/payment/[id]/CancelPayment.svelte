<script lang="ts">
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	// Asked in the page: the app's web view shows no browser dialog, so `confirm()` would refuse.
	let confirming = false;
</script>

{#if confirming}
	<form method="post" action="?/cancel" class="flex flex-col gap-2 w-full max-w-sm">
		<p>{t('pos.terminal.cancelConfirm')}</p>
		<button type="submit" class="btn btn-red text-xl py-4">{t('pos.terminal.cancelYes')}</button>
		<button type="button" class="btn btn-gray" on:click={() => (confirming = false)}>
			{t('pos.terminal.cancelKeep')}
		</button>
	</form>
{:else}
	<button type="button" class="btn btn-red" on:click={() => (confirming = true)}>
		{t('pos.terminal.cancel')}
	</button>
{/if}
