<script lang="ts">
	import IconTrash from '$lib/components/icons/IconTrash.svelte';
	import { sortCurrenciesDefault } from '$lib/types/Currency';
	import Select from 'svelte-select';
	import CurrencyLabel from '$lib/components/CurrencyLabel.svelte';
	import { currencies } from '$lib/stores/currencies';

	export let data;

	let thresholds = data.confirmationBlocksThresholds;

	if (thresholds.thresholds.length === 0) {
		thresholds.thresholds = [{ minAmount: 0, maxAmount: 0, confirmationBlocks: 0 }];
	}

	// Currency options for Select component (sorted: main → secondary → BTC/SAT → fiat A-Z)
	const sortedCurrencies = sortCurrenciesDefault($currencies.main, $currencies.secondary);
	const allCurrenciesOptions = sortedCurrencies.map((c) => ({ value: c, label: c }));
	let selectedCurrency = allCurrenciesOptions.find((c) => c.value === thresholds.currency) || null;
	$: if (selectedCurrency) {
		thresholds.currency = selectedCurrency.value;
	}

	function checkTresholds(event: Event) {
		const blocks = new Set(thresholds.thresholds.map((t) => t.confirmationBlocks));

		if (blocks.size !== thresholds.thresholds.length) {
			alert('You cannot have two thresholds with the same number of confirmation blocks');
			event.preventDefault();
			return;
		}

		thresholds.thresholds = thresholds.thresholds.sort((a, b) => a.minAmount - b.minAmount);

		for (let i = 0; i < thresholds.thresholds.length - 1; i++) {
			if (thresholds.thresholds[i].maxAmount > thresholds.thresholds[i + 1].minAmount) {
				alert(
					'You cannot have two thresholds with overlapping amounts. Please make sure that the maximum amount of a threshold is lower than or equal to the minimum amount of the next threshold.'
				);
				event.preventDefault();
				return;
			}
		}
	}
</script>

<main class="max-w-7xl mx-auto px-6 w-full flex flex-col gap-4">
	<h1 class="text-3xl">Manage confirmation thresholds</h1>

	<form method="post" class="flex flex-col gap-4" on:submit={checkTresholds}>
		<label class="form-label">
			<CurrencyLabel label="Currency" />
			<Select
				items={allCurrenciesOptions}
				searchable={true}
				clearable={false}
				bind:value={selectedCurrency}
				class="form-input"
			/>
			<input type="hidden" name="currency" value={selectedCurrency?.value || ''} required />
		</label>

		<label class="form-label">
			Default confirmation blocks
			<input
				type="number"
				class="form-input"
				name="defaultBlocks"
				bind:value={thresholds.defaultBlocks}
			/>
		</label>

		<div class="grid grid-cols-[auto_auto_auto_min-content] gap-2">
			<span class="form-label">Minimum amount ({thresholds.currency})</span>
			<span class="form-label">Maximum amount ({thresholds.currency})</span>
			<span class="form-label">Confirmation blocks</span>
			<span />
			{#each thresholds.thresholds as threshold, i}
				<input
					type="number"
					class="form-input"
					name="thresholds[{i}].minAmount"
					bind:value={threshold.minAmount}
					max={threshold.maxAmount}
				/>
				<input
					type="number"
					class="form-input"
					name="thresholds[{i}].maxAmount"
					bind:value={threshold.maxAmount}
					min={threshold.minAmount}
				/>
				<input
					type="number"
					class="form-input"
					name="thresholds[{i}].confirmationBlocks"
					bind:value={threshold.confirmationBlocks}
				/>
				<button
					type="button"
					class="btn btn-red self-end"
					on:click={() =>
						(thresholds.thresholds = thresholds.thresholds.filter((t) => t !== threshold))}
				>
					<IconTrash />
					<span class="sr-only"> Delete threshold </span>
				</button>
			{/each}
		</div>
		<button
			class="underline self-start"
			type="button"
			on:click={() =>
				(thresholds.thresholds = [
					...thresholds.thresholds,
					{
						minAmount: thresholds.thresholds.at(-1)?.maxAmount ?? 0,
						maxAmount: (thresholds.thresholds.at(-1)?.maxAmount ?? 0) * 5,
						confirmationBlocks: (thresholds.thresholds.at(-1)?.confirmationBlocks ?? -1) + 1
					}
				])}
		>
			Add confirmation threshold
		</button>

		<button type="submit" class="btn body-mainCTA self-start">Save</button>
	</form>
</main>
