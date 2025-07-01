<script lang="ts">
	import { enhance } from '$app/forms';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { upperFirst } from '$lib/utils/upperFirst.js';
	import { MultiSelect } from 'svelte-multiselect';

	export let data;

	let beginsAt = data.beginsAt;
	let endsAt = data.endsAt;
	let endsAtElement: HTMLInputElement;
	let availableProductList = data.products;
	let subscriptions = data.subscriptions;
	let wholeCatalog = data.discount.wholeCatalog;
	let mode = data.discount.mode;
	let productFree: string[] = [];
	if (data.discount.mode === 'freeProducts') {
		productFree = Object.keys(data.discount.quantityPerProduct ?? {});
	}
	let productFreeLine = productFree.length;
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
	let updateSubscriptionsWithMissingDiscountsProcess: undefined | 'in-progress' | 'completed';
</script>

<h1 class="text-3xl">Edit a discount</h1>

<form
	action="?/updateSubscriptionsWithMissingDiscounts"
	method="post"
	id="updateSubscriptionsWithMissingDiscountsForm"
	use:enhance={() => {
		updateSubscriptionsWithMissingDiscountsProcess = 'in-progress';
		return () => {
			updateSubscriptionsWithMissingDiscountsProcess = 'completed';
		};
	}}
></form>
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
		Mode
		<select name="mode" class="form-input" bind:value={mode} disabled>
			{#each ['percentage', 'freeProducts'] as modeDiscount}
				<option value={modeDiscount}>{upperFirst(modeDiscount)}</option>
			{/each}
		</select>
	</label>
	{#if mode === 'percentage'}
		<label class="form-label">
			Discount percentage
			<input
				class="form-input"
				type="number"
				min="1"
				max="100"
				name="percentage"
				value={data.discount.mode === 'percentage' ? data.discount.percentage : 0}
				placeholder="discount percentage"
				required
			/>
		</label>
	{/if}

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
			--sms-options-bg="var(--body-mainPlan-backgroundColor)"
			name="subscriptionIds"
			options={subscriptions.map((p) => ({ label: p.name, value: p._id }))}
			selected={data.discount.subscriptionIds.map((p) => ({
				value: p,
				label: subscriptions.find((p2) => p2._id === p)?.name ?? p
			}))}
		/>
	</label>
	{#if mode === 'percentage'}
		<label class="checkbox-label">
			<input
				type="checkbox"
				name="wholeCatalog"
				class="form-checkbox"
				bind:checked={wholeCatalog}
			/>
			The discount applies to the whole catalog (except free, subscription & PWYW products)
		</label>
		{#if !wholeCatalog}
			<!-- svelte-ignore a11y-label-has-associated-control -->
			<label class="form-label"
				>Products
				<MultiSelect
					--sms-options-bg="var(--body-mainPlan-backgroundColor)"
					name="productIds"
					options={availableProductList.map((p) => ({ label: p.name, value: p._id }))}
					selected={data.discount.productIds.map((p) => ({
						value: p,
						label: availableProductList.find((p2) => p2._id === p)?.name ?? p
					}))}
				/>
			</label>
		{/if}
	{/if}

	{#if mode === 'freeProducts'}
		<table class="justify-between gap-4">
			<thead>
				<tr>
					<td>Product slug</td>
					<td>Free copies quantity</td>
					<td></td>
				</tr>
			</thead>
			{#each [...productFree, ...Array(productFreeLine).fill( { productId: '', quantity: 0 } )].slice(0, productFreeLine) as product, i}
				<tbody>
					<tr>
						<td>
							<label class="form-label m-1">
								<select class="form-input" bind:value={productFree[i]}>
									{#each availableProductList as prod}
										<option value={prod._id} selected={prod._id === product}>{prod._id}</option>
									{/each}
								</select>
							</label>
						</td>
						<td>
							<label class="form-label m-1">
								<input
									type="number"
									name="quantityPerProduct[{productFree[i]}]"
									class="form-input"
									value={data.discount.mode === 'freeProducts'
										? data.discount.quantityPerProduct?.[product] ?? 0
										: 0}
								/>
							</label>
						</td>
						<td>
							<button
								type="button"
								class="self-start"
								on:click={() => {
									(productFree = productFree.filter((prod) => prod !== product)),
										(productFreeLine -= 1);
								}}>🗑️</button
							>
						</td>
					</tr>
				</tbody>
			{/each}
		</table>
		<button
			class="btn body-mainCTA self-start"
			on:click={() => (productFreeLine += 1)}
			type="button"
			>Add product
		</button>
	{/if}
	<div class="flex flex-row justify-between gap-2">
		<div class="flex gap-2 w-min">
			<input type="submit" class="btn btn-blue text-white" formaction="?/update" value="Update" />
			<a href="/discounts/{data.discount._id}" class="btn body-mainCTA">View</a>
			<button
				type="submit"
				class="btn btn-green text-white ml-auto whitespace-nowrap"
				form="updateSubscriptionsWithMissingDiscountsForm"
				disabled={updateSubscriptionsWithMissingDiscountsProcess === 'in-progress'}
			>
				{#if updateSubscriptionsWithMissingDiscountsProcess === 'in-progress'}
					Updating...
				{:else if updateSubscriptionsWithMissingDiscountsProcess === 'completed'}
					Subscriptions updated ✓
				{:else}
					Update subscriptions with missing discounts
				{/if}
			</button>
		</div>

		<input
			type="submit"
			class="btn btn-red text-white ml-auto"
			formaction="?/delete"
			value="Delete"
			on:click={confirmDelete}
		/>
	</div>
</form>
