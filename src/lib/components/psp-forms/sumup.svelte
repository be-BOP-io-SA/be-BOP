<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import FiatCurrencySelect from './FiatCurrencySelect.svelte';

	export let config: { apiKey: string; merchantCode: string; currency: string };

	const { t } = useI18n();
</script>

<label class="form-label">
	{t('admin.sumup.apiKey')}
	<input
		class="form-input"
		type="password"
		name="apiKey"
		value={config.apiKey}
		placeholder="sup_sk_..."
		required
	/>
</label>

<label class="form-label">
	{t('admin.sumup.merchantCode')}
	<input
		class="form-input"
		type="text"
		name="merchantCode"
		value={config.merchantCode}
		placeholder="MXXXXXX"
		required
	/>
</label>

<FiatCurrencySelect label={t('admin.sumup.currency')} bind:value={config.currency} />
