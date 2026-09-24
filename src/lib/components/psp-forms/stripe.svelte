<script lang="ts">
	import FiatCurrencySelect from './FiatCurrencySelect.svelte';

	export let config: { publicKey: string; secretKey: string; currency: string };
</script>

<label class="form-label">
	Secret Key
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
	Public Key
	<input
		class="form-input"
		type="text"
		name="publicKey"
		value={config.publicKey}
		placeholder="pk_..."
		required
	/>
</label>

<FiatCurrencySelect bind:value={config.currency} />
