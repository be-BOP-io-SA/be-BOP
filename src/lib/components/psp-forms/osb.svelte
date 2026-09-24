<script lang="ts">
	export let config: { shopId: string; password: string; hmacKey: string };
</script>

<label class="form-label">
	Shop ID
	<input class="form-input" type="text" name="shopId" value={config.shopId} required />
</label>

<label class="form-label">
	REST API Password
	<input class="form-input" type="password" name="password" value={config.password} required />
</label>

<label class="form-label">
	HMAC-SHA-256 Key (optional)
	<input class="form-input" type="password" name="hmacKey" value={config.hmacKey} />
</label>

<p class="text-sm text-gray-500">Currency: XPF (fixed)</p>
