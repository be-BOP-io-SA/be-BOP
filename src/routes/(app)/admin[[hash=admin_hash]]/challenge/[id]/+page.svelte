<script lang="ts">
	import { CURRENCIES } from '$lib/types/Currency.js';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { upperFirst } from '$lib/utils/upperFirst';
	import { MultiSelect } from 'svelte-multiselect';
	import { formatInTimeZone } from 'date-fns-tz';
	import OrdersList from '$lib/components/OrdersList.svelte';

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

	$: console.log(beginsAtISO, endsAtISO);

	let endsAtElement: HTMLInputElement;
	let progressChanged = false;
	let globalRatioDisable = true;

	function checkForm(event: SubmitEvent) {
		if (endsAt < beginsAt) {
			endsAtElement.setCustomValidity('End date must be after beginning date');
			endsAtElement.reportValidity();
			event.preventDefault();
			return;
		} else {
			endsAtElement.setCustomValidity('');
		}
	}

	function confirmDelete(event: Event) {
		if (!confirm('Would you like to delete this Challenge?')) {
			event.preventDefault();
		}
	}
</script>

<h1 class="text-3xl">Edit a challenge</h1>

<form method="post" class="flex flex-col gap-4" on:submit={checkForm}>
	<label class="form-label">
		Challenge slug for CMS integration
		<input type="text" disabled class="form-input" value={data.challenge._id} />
	</label>

	<label class="form-label">
		Challenge name
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="name"
			value={data.challenge.name}
			placeholder="Challenge name"
			required
		/>
	</label>

	<label class="form-label">
		Mode
		<select class="form-input" value={data.challenge.mode} disabled>
			{#each ['moneyAmount', 'totalProducts'] as option}
				<option value={option}>{upperFirst(option)}</option>
			{/each}
		</select>
	</label>

	<label class="form-label">
		Goal
		<input
			class="form-input"
			type="number"
			name="goalAmount"
			min="0"
			value={data.challenge.goal.amount}
			placeholder={data.challenge.mode === 'moneyAmount' ? 'Amount' : 'Quantity'}
			step={data.challenge.mode === 'moneyAmount' ? 'any' : '1'}
			required
		/>
	</label>
	{#if data.challenge.mode === 'moneyAmount'}
		<label class="form-label w-full">
			Currency
			<select name="currency" class="form-input" value={data.challenge.goal.currency} disabled>
				{#each CURRENCIES as currency}
					<option value={currency}>{currency}</option>
				{/each}
			</select>
		</label>
		<label class="form-label w-full">
			Ratio
			<select name="ratio" class="form-input" value={data.challenge.ratio} disabled>
				{#each ['total', 'global', 'perProduct'] as ratio}
					<option value={ratio}>{ratio === 'total' ? upperFirst(ratio) : `Ratio (${ratio})`}</option
					>
				{/each}
			</select>
		</label>
		{#if data.challenge.ratio === 'global'}
			<div class="grid grid-cols-2 gap-4">
				<label class="form-label">
					Ratio value (global)
					<input
						class="form-input"
						type="number"
						name="globalRatio"
						min="0"
						max="100"
						required
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
		Edit progress
	</label>
	<input type="hidden" name="oldProgress" value={data.challenge.progress} />
	<label class="form-label">
		Progress
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
		Beginning date

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
		Ending date

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
		Products
		<MultiSelect
			name="productIds"
			options={data.products.map((p) => ({ label: p.name, value: p._id }))}
			selected={data.challenge.productIds.map((productId) => ({
				value: productId,
				label: data.products.find((p) => p._id === productId)?.name ?? productId
			}))}
		/>
	</label>

	<div class="flex flex-row justify-between gap-2">
		<input type="submit" class="btn btn-blue text-white" formaction="?/update" value="Update" />
		<a href="/challenges/{data.challenge._id}" class="btn btn-gray">View</a>

		<input
			type="submit"
			class="btn btn-red text-white ml-auto"
			formaction="?/delete"
			value="Delete"
			on:click={confirmDelete}
		/>
	</div>
	<h1 class="text-3xl">List of orders</h1>
	<p>
		Those are full orders made and fully paid during the challenge periods, and including at least
		one product whitelisted on the Challenge
	</p>
	<p>
		The display amounts are those from order total. It's not necessarily the amount added to the
		challenge gauge
	</p>
	<OrdersList orders={data.orders} />
</form>
