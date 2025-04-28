<script lang="ts">
	import { enhance } from '$app/forms';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { upperFirst } from '$lib/utils/upperFirst.js';
	import { addDays } from 'date-fns';
	import { MultiSelect } from 'svelte-multiselect';

	export let data;
	let beginsAt = new Date().toJSON().slice(0, 10);
	let endsAt = addDays(new Date(), 1).toJSON().slice(0, 10);
	let endsAtElement: HTMLInputElement;
	let availableProductList = data.products;
	let subscriptions = data.subscriptions;
	let wholeCatalog = false;
	let mode = 'percentage';
	let productFreeLine = 2;
	let productFree: string[] = [];
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
		Mode
		<select name="mode" class="form-input" bind:value={mode}>
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
				placeholder="discount percentage"
				required
			/>
		</label>
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
			required
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
					name="productIds"
					options={availableProductList.map((p) => ({ label: p.name, value: p._id }))}
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
			{#each [...Array(productFreeLine).fill( { productId: '', quantity: 0 } )].slice(0, productFreeLine) as product, i}
				<tbody>
					<tr>
						<td>
							<label class="form-label m-1">
								<select class="form-input" bind:value={productFree[i]}>
									{#each availableProductList as prod}
										<option value={prod._id}>{prod._id}</option>
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
									value={product.quantity}
								/>
							</label>
						</td>
						<td>
							<button
								type="button"
								class="self-start"
								on:click={() => {
									(productFree = productFree.filter((prod) => prod !== productFree[i])),
										(productFreeLine -= 1);
								}}>🗑️</button
							>
						</td>
					</tr>
				</tbody>
			{/each}
		</table>
		<button class="btn btn-gray self-start" on:click={() => (productFreeLine += 1)} type="button"
			>Add product
		</button>
	{/if}

	<input type="submit" class="btn btn-blue self-start text-white" value="Submit" />
</form>
