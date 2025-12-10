<script lang="ts">
	import {
		CURRENCIES,
		SATOSHIS_PER_BTC,
		computePriceForStorage,
		FRACTION_DIGITS_PER_CURRENCY
	} from '$lib/types/Currency';
	import type { Price } from '$lib/types/Order';

	export let productId: string;
	export let productName: string;
	export let initialPrice: Price;
	export let displayVATCalculator: boolean;

	let priceAmountVATIncluded = initialPrice.amount;
	let vatRate = 0;
	let currency = initialPrice.currency;

	$: priceExcludedVAT = computePriceForStorage(
		(100 * priceAmountVATIncluded) / (100 + vatRate),
		currency
	);

	function formatPriceForInput(price: Price): string {
		const precision = price.precision ?? FRACTION_DIGITS_PER_CURRENCY[price.currency];
		return price.amount
			.toLocaleString('en', {
				maximumFractionDigits: precision,
				minimumFractionDigits: 0
			})
			.replace(/,/g, '');
	}

	function handleInputChange(event: Event) {
		const target = event.target as HTMLInputElement;
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

<h2 class="text-2xl">{productName}</h2>
{#if displayVATCalculator}
	<div class="gap-4 mx-4 flex flex-col md:flex-row">
		<label class="w-full">
			Price amount (VAT included)
			<input
				class="form-input"
				type="number"
				bind:value={priceAmountVATIncluded}
				step="any"
				required
			/>
		</label>

		<label class="w-full">
			VAT (for VAT excluded price calculation)
			<input class="form-input" type="number" bind:value={vatRate} step="any" />
		</label>

		<label class="w-full">
			Price amount (VAT excluded)
			<input
				class="form-input"
				type="number"
				name="{productId}.price"
				step="any"
				value={formatPriceForInput(priceExcludedVAT)}
				readonly
				required
			/>
		</label>

		<label class="w-full">
			Price currency
			<select name="{productId}.currency" class="form-input" bind:value={currency}>
				{#each CURRENCIES as curr}
					<option value={curr} selected={currency === curr}>
						{curr}
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
				name="{productId}.price"
				placeholder="Price"
				step="any"
				value={initialPrice.amount
					.toLocaleString('en', { maximumFractionDigits: 8 })
					.replace(/,/g, '')}
				on:input={handleInputChange}
				required
			/>
		</label>

		<label class="w-full">
			Price currency
			<select name="{productId}.currency" class="form-input" bind:value={currency}>
				{#each CURRENCIES as curr}
					<option value={curr} selected={currency === curr}>
						{curr}
					</option>
				{/each}
			</select>
		</label>
	</div>
{/if}
