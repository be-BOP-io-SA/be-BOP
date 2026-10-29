<script lang="ts">
	import { sortCurrencies, currenciesToSelectOptions } from '$lib/types/Currency.js';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { upperFirst } from '$lib/utils/upperFirst';
	import { MultiSelect } from 'svelte-multiselect';
	import { formatInTimeZone } from 'date-fns-tz';
	import Select from 'svelte-select';
	import CurrencyLabel from '$lib/components/CurrencyLabel.svelte';
	import { currencies } from '$lib/stores/currencies';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();

	let beginsAt = formatInTimeZone(
		data.beginsAt,
		Intl.DateTimeFormat().resolvedOptions().timeZone,
		'yyyy-MM-dd HH:mm'
	);
	let endsAt = formatInTimeZone(
		data.endsAt,
		Intl.DateTimeFormat().resolvedOptions().timeZone,
		'yyyy-MM-dd HH:mm'
	);

	let endsAtElement: HTMLInputElement;
	let progressChanged = false;

	// Currency options for Select components (sorted: main → secondary → BTC/SAT → fiat A-Z)
	const sortedCurrencies = sortCurrencies($currencies.main, $currencies.secondary);
	const allCurrenciesOptions = currenciesToSelectOptions(sortedCurrencies);
	let selectedCurrencies: Record<number, { value: string; label: string } | null> = {};
	$: {
		for (let i = 0; i < data.leaderboard.progress.length; i++) {
			if (!selectedCurrencies[i]) {
				selectedCurrencies[i] =
					allCurrenciesOptions.find((c) => c.value === data.leaderboard.progress[i].currency) ||
					null;
			}
		}
	}

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

	function confirmDelete(event: Event) {
		if (!confirm(t('admin.leaderboard.confirmDelete'))) {
			event.preventDefault();
		}
	}

	const modeLabels: Record<string, string> = {
		moneyAmount: t('admin.leaderboard.modeMoneyAmount'),
		totalProducts: t('admin.leaderboard.modeTotalProducts')
	};
</script>

<h1 class="text-3xl">{t('admin.leaderboard.editTitle')}</h1>

<form method="post" class="flex flex-col gap-4" on:submit={checkForm}>
	<label class="form-label">
		{t('admin.leaderboard.slugLabel')}
		<input type="text" disabled class="form-input" value={data.leaderboard._id} />
	</label>

	<label class="form-label">
		{t('admin.leaderboard.nameLabel')}
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="name"
			value={data.leaderboard.name}
			placeholder={t('admin.leaderboard.namePlaceholder')}
			required
		/>
	</label>

	<label class="form-label">
		{t('admin.leaderboard.modeLabel')}
		<select class="form-input" value={data.leaderboard.mode} disabled>
			{#each ['moneyAmount', 'totalProducts'] as option}
				<option value={option}>{modeLabels[option] ?? upperFirst(option)}</option>
			{/each}
		</select>
	</label>

	<h2 class="text-2xl">{t('admin.leaderboard.progressTitle')}</h2>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="progressChanged"
			class="form-checkbox"
			bind:checked={progressChanged}
		/>
		{t('admin.leaderboard.editProgress')}
	</label>
	{#each data.leaderboard.progress as progress, i}
		<h2 class="text-xl">{progress.productId}</h2>
		<div class="gap-4 flex flex-col md:flex-row">
			<input type="hidden" name="progress[{i}].productId" value={progress.productId} />

			<label class="w-full">
				{t('admin.leaderboard.amountLabel')}
				<input
					class="form-input"
					type="number"
					name="progress[{i}].amount"
					placeholder={t('admin.leaderboard.amountPlaceholder')}
					step="any"
					value={progress.amount
						.toLocaleString('en', { maximumFractionDigits: 8 })
						.replace(/,/g, '')}
					required
					disabled={!progressChanged}
				/>
			</label>
			{#if data.leaderboard.mode === 'moneyAmount'}
				<label class="w-full">
					<CurrencyLabel label={t('admin.leaderboard.currencyLabel')} />
					<Select
						items={allCurrenciesOptions}
						searchable={true}
						clearable={false}
						bind:value={selectedCurrencies[i]}
						disabled={!progressChanged}
						class="form-input"
					/>
					<input
						type="hidden"
						name="progress[{i}].currency"
						value={selectedCurrencies[i]?.value || ''}
					/>
				</label>
			{/if}
		</div>
	{/each}

	<label class="form-label">
		{t('admin.leaderboard.beginningDate')}

		<input
			class="form-input"
			type="datetime-local"
			name="beginsAt"
			bind:value={beginsAt}
			required
		/>
	</label>

	<label class="form-label">
		{t('admin.leaderboard.endingDate')}

		<input
			class="form-input"
			type="datetime-local"
			required
			name="endsAt"
			bind:value={endsAt}
			bind:this={endsAtElement}
			on:input={() => endsAtElement?.setCustomValidity('')}
		/>
	</label>

	<!-- svelte-ignore a11y-label-has-associated-control -->
	<label class="form-label">
		{t('admin.leaderboard.productsLabel')}
		<MultiSelect
			--sms-options-bg="var(--body-mainPlan-backgroundColor)"
			disabled
			name="productIds"
			options={data.products.map((p) => ({ label: p.name, value: p._id }))}
			selected={data.leaderboard.productIds.map((productId) => ({
				value: productId,
				label: data.products.find((p) => p._id === productId)?.name ?? productId
			}))}
		/>
	</label>

	<div class="flex flex-row justify-between gap-2">
		<input
			type="submit"
			class="btn btn-blue text-white"
			formaction="?/update"
			value={t('admin.action.update')}
		/>
		<a href="/leaderboards/{data.leaderboard._id}" class="btn body-mainCTA"
			>{t('admin.leaderboard.view')}</a
		>

		<input
			type="submit"
			class="btn btn-red text-white ml-auto"
			formaction="?/delete"
			value={t('admin.leaderboard.delete')}
			on:click={confirmDelete}
		/>
	</div>
</form>
