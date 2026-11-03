<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import FiatCurrencySelect from './FiatCurrencySelect.svelte';

	export let config: { publicKey: string; secretKey: string; currency: string };

	const { t } = useI18n();
</script>

<label class="form-label">
	{t('admin.stripe.secretKey')}
	<input
		class="form-input"
		type="password"
		name="secretKey"
		value={config.secretKey}
		placeholder="sk_..."
		required
	/>
</label>

<label class="form-label">
	{t('admin.stripe.publicKey')}
	<input
		class="form-input"
		type="text"
		name="publicKey"
		value={config.publicKey}
		placeholder="pk_..."
		required
	/>
</label>

<FiatCurrencySelect label={t('admin.stripe.currency')} bind:value={config.currency} />
