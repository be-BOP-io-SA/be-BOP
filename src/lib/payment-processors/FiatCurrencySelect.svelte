<script lang="ts">
	import { sortCurrencies, currenciesToSelectOptions } from '$lib/types/Currency';
	import Select from 'svelte-select';
	import CurrencyLabel from '$lib/components/CurrencyLabel.svelte';
	import { currencies } from '$lib/stores/currencies';

	/** The currency stored for the processor, on which the picker opens. */
	export let value: string;
	export let label: string;
	export let name: string;

	// The shop's own currencies first, then the rest alphabetically. Crypto is excluded: a
	// provider that settles in BTC or SAT says so itself and never renders this.
	const options = currenciesToSelectOptions(
		sortCurrencies($currencies.main, $currencies.secondary).filter(
			(c) => c !== 'BTC' && c !== 'SAT'
		)
	);

	let selected = options.find((option) => option.value === value) ?? null;
</script>

<label class="form-label">
	<CurrencyLabel {label} />
	<Select
		items={options}
		searchable={true}
		clearable={false}
		bind:value={selected}
		class="form-input"
	/>
	<input type="hidden" {name} value={selected?.value || ''} required />
</label>
