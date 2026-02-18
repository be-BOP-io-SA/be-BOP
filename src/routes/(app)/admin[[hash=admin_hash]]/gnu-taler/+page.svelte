<script lang="ts">
	import { CURRENCIES } from '$lib/types/Currency';

	export let data;
</script>

<h1 class="text-3xl">GNU Taler</h1>

<form class="contents" method="post" action="?/save">
	<label class="form-label">
		Backend URL
		<input
			class="form-input"
			type="text"
			name="backendUrl"
			value={data.taler.backendUrl}
			required
		/>
	</label>

	<label class="form-label">
		Backend API Key
		<input
			class="form-input"
			type="password"
			name="backendApiKey"
			value={data.taler.backendApiKey}
			required
		/>
	</label>

	<label class="form-label">
		Currency
		<select class="form-input" name="currency" bind:value={data.taler.currency} required>
			{#each CURRENCIES.filter((c) => c !== 'BTC' && c !== 'SAT') as currency}
				<option value={currency}>{currency}</option>
			{/each}
		</select>
	</label>

	<div class="flex justify-between">
		<button class="btn btn-black" type="submit">Save</button>
		<button class="btn btn-red" type="submit" form="delete-form">Reset</button>
	</div>
</form>
<form class="contents" method="post" action="?/delete" id="delete-form"></form>
