<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let supply: 'enough' | 'low' | 'last' | 'exhausted';

	const { t } = useI18n();
</script>

{#if supply === 'low'}
	<div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-sm text-yellow-700">
		! <strong>{t('admin.bitcoinNodeless.warning')}</strong>
		{t('admin.bitcoinNodeless.keyRunningOutWarning')}
	</div>
{:else if supply !== 'enough'}
	<div class="bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700">
		! <strong>{t('admin.bitcoinNodeless.warning')}</strong>
		{supply === 'last'
			? t('admin.bitcoinNodeless.keyLastAddressWarning')
			: t('admin.bitcoinNodeless.keyExhaustedWarning')}
	</div>
{/if}
