<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import FiatCurrencySelect from './FiatCurrencySelect.svelte';

	export let config: { clientId: string; secret: string; sandbox: boolean; currency: string };

	const { t } = useI18n();
</script>

<label class="form-label">
	{t('admin.paypal.clientId')}
	<input class="form-input" type="text" name="clientId" value={config.clientId} required />
</label>

<label class="form-label">
	{t('admin.paypal.secret')}
	<input class="form-input" type="password" name="secret" value={config.secret} required />
</label>

<label class="checkbox-label">
	<input
		class="form-checkbox"
		type="checkbox"
		name="sandbox"
		bind:checked={config.sandbox}
		value="true"
	/>
	{t('admin.paypal.sandboxCredentials')}
</label>

<FiatCurrencySelect label={t('admin.paypal.currency')} bind:value={config.currency} />
