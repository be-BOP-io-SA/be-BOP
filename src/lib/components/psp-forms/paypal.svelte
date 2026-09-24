<script lang="ts">
	import FiatCurrencySelect from './FiatCurrencySelect.svelte';

	export let config: { clientId: string; secret: string; sandbox: boolean; currency: string };
</script>

<label class="form-label">
	Client ID
	<input class="form-input" type="text" name="clientId" value={config.clientId} required />
</label>

<label class="form-label">
	Secret
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
	Those credentials are for the sandbox environment
</label>

<FiatCurrencySelect bind:value={config.currency} />
