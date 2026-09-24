<script lang="ts">
	export let config: { apiKey: string; lnAddress: string; walletId: string };
</script>

<p class="text-sm">
	Receive Lightning payments into your Blink account. Configure <strong>one</strong> of the two options
	below. A Lightning address needs no API key and works for both custodial Blink accounts and self-custodial
	(Spark) addresses. Only BTC wallets are supported.
</p>

<h2 class="text-2xl">Option 1 — Lightning address (no API key)</h2>
<label class="form-label">
	Lightning address
	<input
		class="form-input"
		type="text"
		name="lnAddress"
		placeholder="you@blink.sv"
		value={config.lnAddress}
	/>
</label>

<h2 class="text-2xl">Option 2 — API key (custodial account)</h2>
<label class="form-label">
	API Key
	<input
		class="form-input"
		type="password"
		name="apiKey"
		placeholder="blink_..."
		value={config.apiKey}
	/>
</label>
<label class="form-label">
	Wallet ID (optional — defaults to your account's default BTC wallet)
	<input class="form-input" type="text" name="walletId" value={config.walletId} />
</label>
