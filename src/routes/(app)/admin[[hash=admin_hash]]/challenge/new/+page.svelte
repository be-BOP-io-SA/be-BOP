<script lang="ts">
	import { CURRENCIES } from '$lib/types/Currency.js';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { upperFirst } from '$lib/utils/upperFirst';
	import { addDays, addMonths } from 'date-fns';
	import { MultiSelect } from 'svelte-multiselect';

	export let data;
	let mode = 'moneyAmount';
	let ratio = 'total';
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

<h1 class="text-3xl">Add a challenge</h1>

<form method="post" class="flex flex-col gap-4" on:submit={checkForm}>
	<label class="form-label">
		Challenge name
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="name"
			placeholder="Challenge name"
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

	<label class="form-label">
		Goal
		<input
			class="form-input"
			type="number"
			name="goalAmount"
			min="0"
			placeholder={mode === 'moneyAmount' ? 'Amount' : 'Quantity'}
			step={mode === 'moneyAmount' ? 'any' : '1'}
			required
		/>
	</label>
	{#if mode === 'moneyAmount'}
		<label class="form-label w-full">
			Currency
			<select name="currency" class="form-input">
				{#each CURRENCIES as currency}
					<option value={currency}>{currency}</option>
				{/each}
			</select>
		</label>
		<label class="form-label w-full">
			Ratio
			<select name="ratio" class="form-input" bind:value={ratio}>
				{#each ['total', 'global', 'perProduct'] as ratio}
					<option value={ratio}>{ratio === 'total' ? upperFirst(ratio) : `Ratio (${ratio})`}</option
					>
				{/each}
			</select>
		</label>
		{#if ratio === 'global'}
			<label class="form-label">
				Ratio value (global)
				<input class="form-input" type="number" name="globalRatio" min="0" max="100" required />
			</label>
		{/if}
	{/if}

	<div class="flex flex-wrap gap-4">
		<label class="form-label">
			Beginning date

			<input class="form-input" type="date" name="beginsAt" required bind:value={beginsAt} />
		</label>
	</div>
	<div class="flex flex-wrap gap-4">
		<label class="form-label">
			Ending date

			<input
				class="form-input"
				type="date"
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
			options={data.products.map((p) => ({ label: p.name, value: p._id }))}
		/>
	</label>

	<input type="submit" class="btn btn-blue self-start text-white" value="Submit" />
</form>
