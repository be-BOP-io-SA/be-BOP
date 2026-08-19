<script lang="ts">
	import { CURRENCIES } from '$lib/types/Currency.js';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { upperFirst } from '$lib/utils/upperFirst';
	import { MultiSelect } from 'svelte-multiselect';
	import { formatInTimeZone } from 'date-fns-tz';
	import OrdersList from '$lib/components/OrdersList.svelte';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;

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

	$: beginsAtISO = new Date(beginsAt).toISOString();
	$: endsAtISO = new Date(endsAt).toISOString();

	let ratio = data.challenge.ratio || 'total';
	let endsAtElement: HTMLInputElement;
	let progressChanged = false;
	let globalRatioDisable = true;

	function checkForm(event: SubmitEvent) {
		if (endsAt < beginsAt) {
			endsAtElement.setCustomValidity(t('admin.challenge.endDateAfterBegin'));
			endsAtElement.reportValidity();
			event.preventDefault();
			return;
		} else {
			endsAtElement.setCustomValidity('');
		}
	}

	function confirmDelete(event: Event) {
		if (!confirm(t('admin.challenge.confirmDelete'))) {
			event.preventDefault();
		}
	}
</script>

<h1 class="text-3xl">{t('admin.challenge.editTitle')}</h1>

<form method="post" class="flex flex-col gap-4" on:submit={checkForm}>
	<label class="form-label">
		{t('admin.challenge.slugForCms')}
		<input type="text" disabled class="form-input" value={data.challenge._id} />
	</label>

	<label class="form-label">
		{t('admin.challenge.challengeName')}
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="name"
			value={data.challenge.name}
			placeholder={t('admin.challenge.challengeName')}
			required
		/>
	</label>

	<label class="form-label">
		{t('admin.challenge.mode')}
		<select class="form-input" value={data.challenge.mode} disabled>
			{#each ['moneyAmount', 'totalProducts'] as option}
				<option value={option}>{upperFirst(option)}</option>
			{/each}
		</select>
	</label>

	<label class="form-label">
		{t('admin.challenge.goal')}
		<input
			class="form-input"
			type="number"
			name="goalAmount"
			min="0"
			value={data.challenge.goal.amount}
			placeholder={data.challenge.mode === 'moneyAmount'
				? t('admin.challenge.amount')
				: t('admin.challenge.quantity')}
			step={data.challenge.mode === 'moneyAmount' ? 'any' : '1'}
			required
		/>
	</label>
	{#if data.challenge.mode === 'moneyAmount'}
		<label class="form-label w-full">
			{t('admin.challenge.currency')}
			<select name="currency" class="form-input" value={data.challenge.goal.currency} disabled>
				{#each CURRENCIES as currency}
					<option value={currency}>{currency}</option>
				{/each}
			</select>
		</label>
		<label class="form-label w-full">
			{t('admin.challenge.ratio')}
			<select name="ratio" class="form-input" value={ratio} disabled>
				{#each ['total', 'global', 'perProduct'] as ratio}
					<option value={ratio}
						>{ratio === 'total'
							? upperFirst(ratio)
							: t('admin.challenge.ratioOption', { ratio })}</option
					>
				{/each}
			</select>
		</label>
		{#if data.challenge.ratio === 'global'}
			<div class="grid grid-cols-2 gap-4">
				<label class="form-label">
					{t('admin.challenge.ratioValueGlobal')}
					<input
						class="form-input"
						type="number"
						name="globalRatio"
						min="0"
						max="100"
						required
						step="any"
						disabled={globalRatioDisable}
						value={data.challenge.globalRatio}
					/>
				</label>
				<label class="checkbox-label">
					<input class="form-checkbox" type="checkbox" bind:checked={globalRatioDisable} />
					🔐
				</label>
			</div>
		{/if}
	{/if}
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="progressChanged"
			class="form-checkbox"
			bind:checked={progressChanged}
		/>
		{t('admin.challenge.editProgress')}
	</label>
	<input type="hidden" name="oldProgress" value={data.challenge.progress} />
	<label class="form-label">
		{t('admin.challenge.progress')}
		<input
			class="form-input"
			name="progress"
			type="number"
			value={data.challenge.progress}
			readonly={!progressChanged}
			step="any"
		/>
	</label>

	<label class="form-label">
		{t('admin.challenge.beginningDate')}

		<input
			class="form-input"
			type="datetime-local"
			name="beginsAtDisplay"
			bind:value={beginsAt}
			required
		/>
	</label>

	<input type="hidden" name="beginsAt" value={beginsAtISO} />

	<label class="form-label">
		{t('admin.challenge.endingDate')}

		<input
			class="form-input"
			type="datetime-local"
			required
			name="endsAtDisplay"
			bind:value={endsAt}
			bind:this={endsAtElement}
			on:input={() => endsAtElement?.setCustomValidity('')}
		/>
	</label>

	<input type="hidden" name="endsAt" value={endsAtISO} />

	<!-- svelte-ignore a11y-label-has-associated-control -->
	<label class="form-label">
		{t('admin.challenge.products')}
		<MultiSelect
			--sms-options-bg="var(--body-mainPlan-backgroundColor)"
			name="productIds"
			options={data.products.map((p) => ({ label: p.name, value: p._id }))}
			selected={data.challenge.productIds.map((productId) => ({
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
		<a href="/challenges/{data.challenge._id}" class="btn body-mainCTA"
			>{t('admin.challenge.view')}</a
		>

		<input
			type="submit"
			class="btn btn-red text-white ml-auto"
			formaction="?/delete"
			value={t('admin.challenge.delete')}
			on:click={confirmDelete}
		/>
	</div>
	<h1 class="text-3xl">{t('admin.challenge.listOfOrders')}</h1>
	<p>
		{t('admin.challenge.ordersDescription1')}
	</p>
	<p>
		{t('admin.challenge.ordersDescription2')}
	</p>
	<OrdersList orders={data.orders} />
</form>
