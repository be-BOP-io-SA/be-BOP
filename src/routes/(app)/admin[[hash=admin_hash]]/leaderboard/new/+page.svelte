<script lang="ts">
	import { CURRENCIES } from '$lib/types/Currency.js';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { upperFirst } from '$lib/utils/upperFirst';
	import { addDays, addMonths } from 'date-fns';
	import { MultiSelect } from 'svelte-multiselect';

	export let data;
	let mode = 'moneyAmount';
	let beginsAt = new Date().toJSON().slice(0, 10);
	let endsAt = addMonths(new Date(), 30).toJSON().slice(0, 10);
	let endsAtElement: HTMLInputElement;

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
</script>

<h1 class="text-3xl">Add a leaderboard</h1>

<form method="post" class="flex flex-col gap-4" on:submit={checkForm}>
	<label class="form-label">
		Leaderboard name
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="name"
			placeholder="leaderboard name"
			required
		/>
	</label>

	<label class="form-label">
		Mode
		<select class="form-input" name="mode" bind:value={mode}>
			{#each ['moneyAmount', 'totalProducts'] as option}
				<option value={option}>{upperFirst(option)}</option>
			{/each}
		</select>
	</label>

	{#if mode === 'moneyAmount'}
		<label class="form-label w-full">
			currency
			<select name="currency" class="form-input">
				{#each CURRENCIES as currency}
					<option value={currency}>{currency}</option>
				{/each}
			</select>
		</label>
	{/if}
	<div class="flex flex-wrap gap-4">
		<label class="form-label">
			Beginning date

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
			Ending date

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
		>Products
		<MultiSelect
			name="productIds"
			required
			options={data.products.map((p) => ({ label: p.name, value: p._id }))}
		/>
	</label>

	<input type="submit" class="btn btn-blue self-start text-white" value="Submit" />
</form>
