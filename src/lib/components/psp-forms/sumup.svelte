<script lang="ts">
	import FiatCurrencySelect from './FiatCurrencySelect.svelte';

	export let config: { apiKey: string; merchantCode: string; currency: string };
</script>

<label class="form-label">
	API Key
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
	Merchant Code
	<input
		class="form-input"
		type="text"
		name="merchantCode"
		value={config.merchantCode}
		placeholder="MXXXXXX"
		required
	/>
</label>

<FiatCurrencySelect bind:value={config.currency} />
