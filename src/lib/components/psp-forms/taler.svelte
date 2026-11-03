<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import FiatCurrencySelect from './FiatCurrencySelect.svelte';

	export let config: { backendUrl: string; backendApiKey: string; currency: string };

	const { t } = useI18n();
</script>

<label class="form-label">
	{t('admin.taler.backendUrl')}
	<input class="form-input" type="text" name="backendUrl" value={config.backendUrl} required />
</label>

<label class="form-label">
	{t('admin.taler.backendApiKey')}
	<input
		class="form-input"
		type="password"
		name="backendApiKey"
		value={config.backendApiKey}
		required
	/>
</label>

<FiatCurrencySelect label={t('admin.taler.currency')} bind:value={config.currency} />
