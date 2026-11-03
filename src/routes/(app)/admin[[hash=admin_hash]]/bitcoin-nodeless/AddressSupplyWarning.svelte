<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let supply: 'enough' | 'low' | 'exhausted';

	const { t } = useI18n();
</script>

{#if supply !== 'enough'}
	<div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-sm text-yellow-700">
		! <strong>{t('admin.bitcoinNodeless.warning')}</strong>
		{supply === 'exhausted'
			? t('admin.bitcoinNodeless.keyExhaustedWarning')
			: t('admin.bitcoinNodeless.keyRunningOutWarning')}
	</div>
{/if}
