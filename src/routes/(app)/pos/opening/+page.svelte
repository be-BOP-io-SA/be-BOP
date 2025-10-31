<script lang="ts">
	export let data;
</script>

<main class="max-w-2xl mx-auto p-6">
	<h1 class="text-3xl font-bold mb-6">Open the PoS</h1>

	{#if data.lastClosingAmount}
		<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
			<p class="text-sm text-blue-800">
				Yesterday's closing amount:
				<strong>
					{data.lastClosingAmount.amount.toFixed(2)}
					{data.lastClosingAmount.currency}
				</strong>
			</p>
		</div>
	{/if}

	<form method="POST" class="space-y-6">
		<div>
			<label for="amount" class="form-label"> Cash amount at opening </label>
			<div class="flex items-center gap-2">
				<input
					type="number"
					step="0.01"
					min="0"
					name="amount"
					id="amount"
					class="form-input flex-1"
					required
					value={data.lastClosingAmount?.amount ?? 0}
				/>
				<span class="text-gray-600">{data.currency}</span>
			</div>
		</div>

		<div class="flex gap-3">
			<button type="submit" class="btn btn-black"> Confirm and open PoS </button>
			<a href="/pos" class="btn btn-gray"> Cancel </a>
		</div>
	</form>
</main>
