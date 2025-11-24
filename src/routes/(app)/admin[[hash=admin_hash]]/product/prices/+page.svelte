<script lang="ts">
	import {
		CURRENCIES,
		SATOSHIS_PER_BTC,
		computePriceForStorage,
		FRACTION_DIGITS_PER_CURRENCY,
		type Currency
	} from '$lib/types/Currency';
	import type { Price } from '$lib/types/Order';

	export let data;

	let displayVATCalculator = false;

	let productVATData = Object.fromEntries(
		data.products.map((product) => [product._id, { vatIncluded: product.price.amount, vatRate: 0 }])
	);

	function computePriceExcludingVATForInput(productId: string, currency: Currency): Price {
		const vatData = productVATData[productId];
		if (!vatData) {
			console.warn('VAT data not found for product', { productId });
			return computePriceForStorage(0, currency);
		}
		const rawAmount = (100 * vatData.vatIncluded) / (100 + vatData.vatRate);
		return computePriceForStorage(rawAmount, currency);
	}

	function formatPriceForInput(price: Price): string {
		const precision = price.precision ?? FRACTION_DIGITS_PER_CURRENCY[price.currency];
		return price.amount
			.toLocaleString('en', {
				maximumFractionDigits: precision,
				minimumFractionDigits: 0
			})
			.replace(/,/g, '');
	}

	$: vatExcludedPrices = data.products.reduce(
		(acc, product) => {
			const price = computePriceExcludingVATForInput(product._id, product.price.currency);
			acc[product._id] = formatPriceForInput(price);
			return acc;
		},
		{} as Record<string, string>
	);

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

<label class="checkbox-label">
	<input
		class="form-checkbox"
		type="checkbox"
		name="vatCalculator"
		bind:checked={displayVATCalculator}
	/>
	Display VAT calculator
</label>

<form class="flex flex-col gap-2" method="post">
	{#each data.products as product}
		<h2 class="text-2xl">{product.name}</h2>
		{#if displayVATCalculator}
			<div class="gap-4 mx-4 flex flex-col md:flex-row">
				<label class="w-full">
					Price amount (VAT included)
					<input
						class="form-input"
						type="number"
						bind:value={productVATData[product._id].vatIncluded}
						step="any"
						required
					/>
				</label>

				<label class="w-full">
					VAT (for VAT excluded price calculation)
					<input
						class="form-input"
						type="number"
						bind:value={productVATData[product._id].vatRate}
						step="any"
					/>
				</label>

				<label class="w-full">
					Price amount (VAT excluded)
					<input
						class="form-input"
						type="number"
						name="{product._id}.price"
						step="any"
						value={vatExcludedPrices[product._id]}
						on:input={handleInputChange}
						readonly
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
		{:else}
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
		{/if}
	{/each}
	<button class="btn btn-black self-start mt-4" type="submit">Update</button>
</form>
