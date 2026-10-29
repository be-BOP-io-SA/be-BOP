<script lang="ts">
	import IconTrash from '$lib/components/icons/IconTrash.svelte';
	import { sortCurrencies, currenciesToSelectOptions } from '$lib/types/Currency';
	import Select from 'svelte-select';
	import CurrencyLabel from '$lib/components/CurrencyLabel.svelte';
	import { currencies } from '$lib/stores/currencies';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;

	let thresholds = data.confirmationBlocksThresholds;

	if (thresholds.thresholds.length === 0) {
		thresholds.thresholds = [{ minAmount: 0, maxAmount: 0, confirmationBlocks: 0 }];
	}

	// Currency options for Select component (sorted: main → secondary → BTC/SAT → fiat A-Z)
	const sortedCurrencies = sortCurrencies($currencies.main, $currencies.secondary);
	const allCurrenciesOptions = currenciesToSelectOptions(sortedCurrencies);
	let selectedCurrency = allCurrenciesOptions.find((c) => c.value === thresholds.currency) || null;
	$: if (selectedCurrency) {
		thresholds.currency = selectedCurrency.value;
	}

	function checkTresholds(event: Event) {
		const blocks = new Set(thresholds.thresholds.map((t) => t.confirmationBlocks));

		if (blocks.size !== thresholds.thresholds.length) {
			alert(t('admin.config.duplicateConfirmationBlocksError'));
			event.preventDefault();
			return;
		}

		thresholds.thresholds = thresholds.thresholds.sort((a, b) => a.minAmount - b.minAmount);

		for (let i = 0; i < thresholds.thresholds.length - 1; i++) {
			if (thresholds.thresholds[i].maxAmount > thresholds.thresholds[i + 1].minAmount) {
				alert(t('admin.config.overlappingThresholdsError'));
				event.preventDefault();
				return;
			}
		}
	}
</script>

<main class="max-w-7xl mx-auto px-6 w-full flex flex-col gap-4">
	<h1 class="text-3xl">{t('admin.config.manageConfirmationThresholds')}</h1>

	<form method="post" class="flex flex-col gap-4" on:submit={checkTresholds}>
		<label class="form-label">
			<CurrencyLabel label={t('admin.config.currency')} />
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
			{t('admin.config.defaultConfirmationBlocks')}
			<input
				type="number"
				class="form-input"
				name="defaultBlocks"
				bind:value={thresholds.defaultBlocks}
			/>
		</label>

		<div class="grid grid-cols-[auto_auto_auto_min-content] gap-2">
			<span class="form-label"
				>{t('admin.config.minimumAmount', { currency: thresholds.currency })}</span
			>
			<span class="form-label"
				>{t('admin.config.maximumAmount', { currency: thresholds.currency })}</span
			>
			<span class="form-label">{t('admin.config.confirmationBlocks')}</span>
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
					<span class="sr-only"> {t('admin.config.deleteThreshold')} </span>
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
			{t('admin.config.addConfirmationThreshold')}
		</button>

		<button type="submit" class="btn body-mainCTA self-start">{t('admin.action.save')}</button>
	</form>
</main>
