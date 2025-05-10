<script lang="ts">
	import { CURRENCIES, SATOSHIS_PER_BTC } from '$lib/types/Currency';

	export let data;

	function handleInputChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const productId = target.name;
		const newPrice = target.value;

		if (newPrice && parseFloat(newPrice) < 1 / SATOSHIS_PER_BTC) {
			target.setCustomValidity('Price ' + productId + ' must be greater than 1 SAT');
			target.reportValidity();
			return;
		} else {
			target.setCustomValidity('');
		}
	}
</script>

<h1 class="text-3xl">Bulk Price Change</h1>

<form class="flex flex-col gap-2" method="post">
	{#each data.products as product}
		<h2 class="text-2xl">{product.name}</h2>
		<div class="gap-4 mx-4 flex flex-col md:flex-row">
			<label class="w-full">
				Price amount
				<input
					class="form-input"
					type="number"
					name="{product._id}.price"
					placeholder="Price"
					step="any"
					value={product.price.amount
						.toLocaleString('en', { maximumFractionDigits: 8 })
						.replace(/,/g, '')}
					on:input={handleInputChange}
					required
				/>
			</label>

			<label class="w-full">
				Price currency

				<select name="{product._id}.currency" class="form-input">
					{#each CURRENCIES as currency}
						<option value={currency} selected={product.price.currency === currency}>
							{currency}
						</option>
					{/each}
				</select>
			</label>
		</div>
	{/each}
	<button class="btn btn-black self-start mt-4" type="submit">Update</button>
</form>
