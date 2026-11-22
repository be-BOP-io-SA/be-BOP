<script lang="ts">
	import { enhance } from '$app/forms';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	/** The cancel action of the payment: this page's own, or the one of another payment's page. */
	export let action = '?/cancel';

	// Asked in the page: the app's web view shows no browser dialog, so `confirm()` would refuse.
	let confirming = false;
</script>

{#if confirming}
	<form method="post" {action} class="flex flex-col gap-2 w-full max-w-sm" use:enhance>
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
