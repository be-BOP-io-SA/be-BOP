<script lang="ts">
	import CurrencyLabel from './CurrencyLabel.svelte';
	import type { Currency } from '$lib/types/Currency';
	import type { DeliveryMethod } from '$lib/types/DeliveryFees';
	import { applyVat, extractVat } from '$lib/utils/vat';
	import { fixCurrencyRounding } from '$lib/utils/fixCurrencyRounding';

	// Form-field name prefix, e.g. "deliveryFees[FR]" or "deliveryZones[0]".
	export let fieldPrefix: string;
	export let methods: DeliveryMethod[] = [];
	export let currencyOptions: Array<{ value: Currency; label: string }>;
	export let defaultCurrency: Currency;
	export let disabled = false;
	export let vatRate = 0;
	export let vatIncludedReference = false;

	// Local working copy. We never bind this back into the parent's deliveryFees: a two-way bind to a
	// nested array member ping-pongs parent<->child into an infinite reactive loop. The <form> submits
	// the rendered name="..." inputs directly, so the parent's JS model doesn't need the rows. Re-seed
	// only when the parent passes a NEW array ref (e.g. product "Fill from general settings").
	let rows: DeliveryMethod[] = [];
	let lastMethodsRef: DeliveryMethod[] | undefined;
	$: if (methods !== lastMethodsRef) {
		lastMethodsRef = methods;
		rows = (methods ?? []).map((m) => ({ ...m }));
	}

	function addMethod() {
		rows = [...rows, { label: '', amount: 0, currency: defaultCurrency }];
	}

	function removeMethod(index: number) {
		rows = rows.filter((_, i) => i !== index);
	}
</script>

{#each rows as method, m}
	<div class="gap-4 flex flex-col md:flex-row">
		<label class="w-full">
			Delivery method
			<input
				class="form-input"
				type="text"
				{disabled}
				name="{fieldPrefix}.methods[{m}].label"
				placeholder="Method name"
				bind:value={method.label}
				required
			/>
		</label>
		<label class="w-full">
			Amount {vatIncludedReference ? '(VAT included)' : '(VAT excluded)'}
			<input
				class="form-input"
				type="number"
				step="any"
				{disabled}
				name="{fieldPrefix}.methods[{m}].amount"
				placeholder="Price"
				bind:value={method.amount}
				required
			/>
			{#if vatRate > 0 && method.currency && Number.isFinite(method.amount)}
				<small class="text-gray-500 block mt-1">
					{#if vatIncludedReference}
						= {fixCurrencyRounding(extractVat(method.amount, vatRate), method.currency)}
						{method.currency} (VAT excluded)
					{:else}
						= {fixCurrencyRounding(applyVat(method.amount, vatRate), method.currency)}
						{method.currency} (VAT included)
					{/if}
				</small>
			{/if}
		</label>
		<label class="w-full">
			<CurrencyLabel label="Currency" />
			<!-- Native <select> on purpose: svelte-select re-emits into bind:value and loops here. -->
			<select
				class="form-input"
				{disabled}
				name="{fieldPrefix}.methods[{m}].currency"
				bind:value={method.currency}
			>
				{#each currencyOptions as opt}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</label>
		<div class="flex flex-col">
			<span class="invisible" aria-hidden="true">.</span>
			<button
				type="button"
				class="text-red-500 text-xl leading-none px-1 py-2"
				title="Remove method"
				{disabled}
				on:click={() => removeMethod(m)}
			>
				🗑
			</button>
		</div>
	</div>
{/each}

<button type="button" class="body-hyperlink underline self-start" {disabled} on:click={addMethod}>
	Add delivery method
</button>
