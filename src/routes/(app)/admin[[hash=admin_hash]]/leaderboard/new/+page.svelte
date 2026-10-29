<script lang="ts">
	import { sortCurrencies, currenciesToSelectOptions } from '$lib/types/Currency.js';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { upperFirst } from '$lib/utils/upperFirst';
	import { addDays, addMonths } from 'date-fns';
	import { MultiSelect } from 'svelte-multiselect';
	import Select from 'svelte-select';
	import CurrencyLabel from '$lib/components/CurrencyLabel.svelte';
	import { currencies } from '$lib/stores/currencies';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();

	let mode = 'moneyAmount';
	let beginsAt = new Date().toJSON().slice(0, 10);
	let endsAt = addMonths(new Date(), 30).toJSON().slice(0, 10);
	let endsAtElement: HTMLInputElement;

	// Currency options for Select component (sorted: main → secondary → BTC/SAT → fiat A-Z)
	const sortedCurrencies = sortCurrencies($currencies.main, $currencies.secondary);
	const allCurrenciesOptions = currenciesToSelectOptions(sortedCurrencies);
	let selectedCurrency = allCurrenciesOptions[0] || null;

	function checkForm(event: SubmitEvent) {
		if (endsAt < beginsAt) {
			endsAtElement.setCustomValidity(t('admin.leaderboard.endDateAfterBeginning'));
			endsAtElement.reportValidity();
			event.preventDefault();
			return;
		} else {
			endsAtElement.setCustomValidity('');
		}
	}

	const modeLabels: Record<string, string> = {
		moneyAmount: t('admin.leaderboard.modeMoneyAmount'),
		totalProducts: t('admin.leaderboard.modeTotalProducts')
	};
</script>

<h1 class="text-3xl">{t('admin.leaderboard.addLeaderboardTitle')}</h1>

<form method="post" class="flex flex-col gap-4" on:submit={checkForm}>
	<label class="form-label">
		{t('admin.leaderboard.nameLabel')}
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="name"
			placeholder={t('admin.leaderboard.namePlaceholder')}
			required
		/>
	</label>

	<label class="form-label">
		{t('admin.leaderboard.modeLabel')}
		<select class="form-input" name="mode" bind:value={mode}>
			{#each ['moneyAmount', 'totalProducts'] as option}
				<option value={option}>{modeLabels[option] ?? upperFirst(option)}</option>
			{/each}
		</select>
	</label>

	{#if mode === 'moneyAmount'}
		<label class="form-label w-full">
			<CurrencyLabel label={t('admin.leaderboard.currencyLabel')} />
			<Select
				items={allCurrenciesOptions}
				searchable={true}
				clearable={false}
				bind:value={selectedCurrency}
				class="form-input"
			/>
			<input type="hidden" name="currency" value={selectedCurrency?.value || ''} required />
		</label>
	{/if}
	<div class="flex flex-wrap gap-4">
		<label class="form-label">
			{t('admin.leaderboard.beginningDate')}

			<input
				class="form-input"
				type="datetime-local"
				name="beginsAt"
				required
				bind:value={beginsAt}
			/>
		</label>
	</div>
	<div class="flex flex-wrap gap-4">
		<label class="form-label">
			{t('admin.leaderboard.endingDate')}

			<input
				class="form-input"
				type="datetime-local"
				required
				name="endsAt"
				min={addDays(new Date(), 1).toJSON().slice(0, 10)}
				bind:value={endsAt}
				bind:this={endsAtElement}
				on:input={() => endsAtElement?.setCustomValidity('')}
			/>
		</label>
	</div>

	<!-- svelte-ignore a11y-label-has-associated-control -->
	<label class="form-label"
		>{t('admin.leaderboard.productsLabel')}
		<MultiSelect
			--sms-options-bg="var(--body-mainPlan-backgroundColor)"
			name="productIds"
			required
			options={data.products.map((p) => ({ label: p.name, value: p._id }))}
		/>
	</label>

	<input
		type="submit"
		class="btn btn-blue self-start text-white"
		value={t('admin.leaderboard.submit')}
	/>
</form>
