<script lang="ts">
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { MultiSelect } from 'svelte-multiselect';

	export let data;

	let beginsAt = data.beginsAt;
	let endsAt = data.endsAt;
	let endsAtElement: HTMLInputElement;
	let availableProductList = data.products;
	let subscriptions = data.subscriptions;
	let wholeCatalog = data.discount.wholeCatalog;

	function checkForm(event: SubmitEvent) {
		if (endsAt && endsAt < beginsAt) {
			endsAtElement.setCustomValidity('End date must be after beginning date');
			endsAtElement.reportValidity();
			event.preventDefault();
			return;
		} else {
			endsAtElement.setCustomValidity('');
		}
	}

	function confirmDelete(event: Event) {
		if (!confirm('Would you like to delete this discount?')) {
			event.preventDefault();
		}
	}
</script>

<h1 class="text-3xl">Edit a discount</h1>

<form method="post" class="flex flex-col gap-4" on:submit={checkForm}>
	<label class="form-label">
		Discount slug
		<input type="text" disabled class="form-input" value={data.discount._id} />
	</label>

	<label class="form-label">
		discount name
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="name"
			value={data.discount.name}
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
			value={data.discount.percentage}
			placeholder="discount percentage"
			required
		/>
	</label>

	<div class="flex flex-wrap gap-4">
		<label class="form-label">
			Beginning date

			<input class="form-input" type="date" name="beginsAt" bind:value={beginsAt} required />
		</label>
	</div>

	<div class="flex flex-wrap gap-4">
		<label class="form-label">
			Ending date

			<input
				class="form-input"
				type="date"
				name="endsAt"
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
			selected={data.discount.subscriptionIds.map((p) => ({
				value: p,
				label: subscriptions.find((p2) => p2._id === p)?.name ?? p
			}))}
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
				selected={data.discount.productIds.map((p) => ({
					value: p,
					label: availableProductList.find((p2) => p2._id === p)?.name ?? p
				}))}
			/>
		</label>
	{/if}

	<div class="flex flex-row justify-between gap-2">
		<input type="submit" class="btn btn-blue text-white" formaction="?/update" value="Update" />
		<a href="/discounts/{data.discount._id}" class="btn btn-gray">View</a>

		<input
			type="submit"
			class="btn btn-red text-white ml-auto"
			formaction="?/delete"
			value="Delete"
			on:click={confirmDelete}
		/>
	</div>
</form>
