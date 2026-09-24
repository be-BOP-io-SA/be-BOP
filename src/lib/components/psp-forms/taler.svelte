<script lang="ts">
	import FiatCurrencySelect from './FiatCurrencySelect.svelte';

	export let config: { backendUrl: string; backendApiKey: string; currency: string };
</script>

<label class="form-label">
	Backend URL
	<input class="form-input" type="text" name="backendUrl" value={config.backendUrl} required />
</label>

<label class="form-label">
	Backend API Key
	<input
		class="form-input"
		type="password"
		name="backendApiKey"
		value={config.backendApiKey}
		required
	/>
</label>

<FiatCurrencySelect bind:value={config.currency} />
