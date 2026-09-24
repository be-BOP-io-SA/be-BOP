<script lang="ts">
	export let config: { apiKey: string };
</script>

<label class="form-label">
	API Key
	<input class="form-input" type="password" name="apiKey" value={config.apiKey} required />
</label>
