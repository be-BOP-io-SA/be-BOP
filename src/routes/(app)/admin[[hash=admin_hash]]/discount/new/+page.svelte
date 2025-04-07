<script lang="ts">
	import { enhance } from '$app/forms';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { addDays } from 'date-fns';
	import { MultiSelect } from 'svelte-multiselect';

	export let data;
	let beginsAt = new Date().toJSON().slice(0, 10);
	let endsAt = addDays(new Date(), 1).toJSON().slice(0, 10);
	let endsAtElement: HTMLInputElement;
	let availableProductList = data.products;
	let subscriptions = data.subscriptions;
	let wholeCatalog = false;

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

<h1 class="text-3xl">Add a discount</h1>

<form method="post" class="flex flex-col gap-4" on:submit={checkForm} use:enhance>
	<label class="form-label">
		Discount name
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="name"
			placeholder="discount name"
			required
		/>
	</label>

	<label class="form-label">
		Discount percentage
		<input
			class="form-input"
			type="number"
			min="1"
			max="100"
			name="percentage"
			placeholder="discount percentage"
			required
		/>
	</label>

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
		>Required Subscription

		<MultiSelect
			name="subscriptionIds"
			options={subscriptions.map((p) => ({ label: p.name, value: p._id }))}
		/>
	</label>

	<label class="checkbox-label">
		<input type="checkbox" name="wholeCatalog" class="form-checkbox" bind:checked={wholeCatalog} />
		The discount applies to the whole catalog (except free, subscription & PWYW products)
	</label>
	{#if !wholeCatalog}
		<!-- svelte-ignore a11y-label-has-associated-control -->
		<label class="form-label"
			>Products
			<MultiSelect
				name="productIds"
				options={availableProductList.map((p) => ({ label: p.name, value: p._id }))}
			/>
		</label>
	{/if}

	<input type="submit" class="btn btn-blue self-start text-white" value="Submit" />
</form>
