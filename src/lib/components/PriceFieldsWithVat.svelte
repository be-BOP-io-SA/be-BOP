<script lang="ts">
	import { FRACTION_DIGITS_PER_CURRENCY, type Currency } from '$lib/types/Currency';
	import { applyVat, extractVat } from '$lib/utils/vat';
	import { fixCurrencyRounding } from '$lib/utils/fixCurrencyRounding';
	import { hasMoreDecimalsThanCurrency } from '$lib/utils/currency-validation';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let priceVatExcluded: number;
	export let currency: Currency;
	export let vatRate: number;
	export let vatProfileLabel = t('admin.productForm.noCustomVatProfile');
	export let disabled = false;

	// Computed TTC is rounded to currency precision (float artifact: 17.24137931 × 1.16 =
	// 19.999999999599996); user-typed TTC is kept raw so decimal validation can fire on "19.99".
	let priceVatIncluded = fixCurrencyRounding(applyVat(priceVatExcluded, vatRate), currency);

	function onHtInput(event: Event) {
		const value = parseFloat((event.target as HTMLInputElement).value);
		// Empty/invalid field: keep previous value — a 0 price becomes a free product server-side.
		if (Number.isNaN(value)) {
			return;
		}
		priceVatExcluded = value;
		priceVatIncluded = fixCurrencyRounding(applyVat(value, vatRate), currency);
	}

	function onTtcInput(event: Event) {
		const value = parseFloat((event.target as HTMLInputElement).value);
		if (Number.isNaN(value)) {
			return;
		}
		priceVatIncluded = value;
		priceVatExcluded = vatRate === 0 ? value : extractVat(value, vatRate);
	}

	// Recompute TTC on rate/currency change only — never clobber a raw user-typed TTC.
	let lastVatRate = vatRate;
	let lastCurrency = currency;
	$: if (vatRate !== lastVatRate || currency !== lastCurrency) {
		lastVatRate = vatRate;
		lastCurrency = currency;
		priceVatIncluded = fixCurrencyRounding(applyVat(priceVatExcluded, vatRate), currency);
	}

	$: vatAmount = priceVatExcluded * (vatRate / 100);
	$: displayedExcluded = fixCurrencyRounding(priceVatExcluded, currency);
	$: displayedVat = fixCurrencyRounding(vatAmount, currency);
	$: hasDecimalError = hasMoreDecimalsThanCurrency(priceVatIncluded, currency);
</script>

<div class="gap-4 flex flex-col md:flex-row">
	<label class="w-full">
		<span class="text-red-500">*</span>
		{t('admin.priceFieldsWithVat.priceExcluded')}
		<input
			class="form-input"
			type="number"
			step="any"
			name="priceAmount"
			value={priceVatExcluded}
			on:input={onHtInput}
			on:wheel|preventDefault
			{disabled}
			required
		/>
	</label>

	<label class="w-full">
		<span class="text-red-500">*</span>
		{t('admin.priceFieldsWithVat.priceIncluded')}
		<input
			class="form-input"
			class:border-red-500={hasDecimalError}
			type="number"
			step="any"
			name="priceAmountVatIncluded"
			value={priceVatIncluded}
			on:input={onTtcInput}
			on:wheel|preventDefault
			{disabled}
			required
		/>
		<small class="text-gray-500 block mt-1">
			{t('admin.priceFieldsWithVat.endUserPriceHint')}
		</small>
	</label>
</div>

{#if hasDecimalError}
	<p class="alert-error">
		{t('admin.priceFieldsWithVat.decimalError', {
			currency,
			digits: FRACTION_DIGITS_PER_CURRENCY[currency]
		})}
	</p>
{/if}

<div class="gap-4 flex flex-col md:flex-row">
	<label class="w-full">
		{t('admin.priceFieldsWithVat.vatProfile')}
		<input class="form-input" value={vatProfileLabel} disabled />
	</label>

	<label class="w-full">
		{t('admin.priceFieldsWithVat.vatRate')}
		<input class="form-input" type="number" value={vatRate} disabled />
	</label>

	<label class="w-full">
		{t('admin.priceFieldsWithVat.vatAmount')}
		<input class="form-input" type="number" value={vatAmount} disabled />
	</label>
</div>

<div class="gap-4 flex flex-col md:flex-row">
	<label class="w-full">
		{t('admin.priceFieldsWithVat.displayedExcluded')}
		<input class="form-input" type="number" value={displayedExcluded} disabled />
	</label>

	<label class="w-full">
		{t('admin.priceFieldsWithVat.displayedIncluded')}
		<input
			class="form-input"
			class:border-red-500={hasDecimalError}
			type="number"
			value={priceVatIncluded}
			disabled
		/>
	</label>

	<label class="w-full">
		{t('admin.priceFieldsWithVat.displayedVat')}
		<input class="form-input" type="number" value={displayedVat} disabled />
	</label>
</div>
