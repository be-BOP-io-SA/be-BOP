<script lang="ts">
	import { enhance } from '$app/forms';
	import { useI18n } from '$lib/i18n';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { upperFirst } from '$lib/utils/upperFirst.js';
	import { addDays } from 'date-fns';
	import { MultiSelect } from 'svelte-multiselect';
	import ProductCombinationRow from '$lib/components/ProductCombinationRow.svelte';

	export let data;
	const { countryName } = useI18n();
	$: sortedCountries = [...data.countries].sort((a, b) =>
		countryName(a).localeCompare(countryName(b))
	);
	let beginsAt = new Date().toJSON().slice(0, 16);
	let endsAt = addDays(new Date(), 1).toJSON().slice(0, 16);
	let endsAtElement: HTMLInputElement;
	let availableProductList = data.products;
	let subscriptions = data.subscriptions;
	let wholeCatalog = false;
	let mode = 'percentage';
	let productFreeLine = 2;
	let productFree: string[] = [];
	let combinations: Array<{ products: Array<{ productId: string; quantity: number }> }> = [];
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

	{#if mode === 'percentage'}
		<label class="checkbox-label">
			<input type="checkbox" name="showBadge" class="form-checkbox" checked />
			Show discount badge (-X%) on product page
		</label>
		<label class="checkbox-label">
			<input type="checkbox" name="showExpirationBanner" class="form-checkbox" />
			Show discount expiration reminder on product page
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
				name="endsAt"
				bind:value={endsAt}
				bind:this={endsAtElement}
				on:input={() => endsAtElement?.setCustomValidity('')}
			/>
		</label>
	</div>

	{#if mode === 'percentage'}
		<fieldset class="form-label">
			<legend>Discount channel application</legend>
			{#each [{ value: 'web', label: 'Web' }, { value: 'web-pos', label: 'Web with PoS privilege (/cart)' }, { value: 'pos-touch', label: 'Bar-restaurant PoS (/pos/touch)' }, { value: 'nostr-bot', label: 'Nostr-bot' }] as channel}
				<label class="checkbox-label">
					<input type="checkbox" name="channels" value={channel.value} class="form-checkbox" />
					{channel.label}
				</label>
			{/each}
		</fieldset>
	{/if}

	<!-- svelte-ignore a11y-label-has-associated-control -->
	<label class="form-label"
		>Required Subscription (optional)

		<MultiSelect
			--sms-options-bg="var(--body-mainPlan-backgroundColor)"
			name="subscriptionIds"
			options={subscriptions.map((p) => ({ label: p.name, value: p._id }))}
		/>
	</label>

	{#if mode === 'percentage'}
		<label class="form-label">
			Required code (optional)
			<input
				class="form-input"
				type="text"
				name="promoCode"
				maxlength="50"
				placeholder="Enter promocode chain"
			/>
			<span class="text-sm text-gray-500"
				>Tip: use 8+ characters mixing letters, numbers and special characters (e.g. SPRING_2026X4!)
				— short codes are easy to brute-force.</span
			>
		</label>

		<label class="form-label">
			Required delivery country (optional)
			<select name="deliveryCountry" class="form-input">
				<option value="none">None</option>
				{#each sortedCountries as country}
					<option value={country}>{countryName(country)}</option>
				{/each}
			</select>
		</label>

		<label class="form-label">
			Required billing country (optional)
			<select name="billingCountry" class="form-input">
				<option value="none">None</option>
				{#each sortedCountries as country}
					<option value={country}>{countryName(country)}</option>
				{/each}
			</select>
		</label>

		<fieldset class="form-label">
			<legend>Payment method</legend>
			{#each ['lightning', 'bank-transfer', 'point-of-sale', 'card', 'bitcoin', 'paypal'] as pm}
				<label class="checkbox-label">
					<input type="checkbox" name="paymentMethods" value={pm} class="form-checkbox" />
					{pm}{pm === 'point-of-sale' ? ' (only for users with POS role)' : ''}
				</label>
			{/each}
		</fieldset>

		<label class="form-label">
			Required contact address (optional)
			<textarea
				class="form-input"
				name="contactAddresses"
				rows="4"
				placeholder="One address per line (email, npub, phone...)"
			></textarea>
			<span class="text-sm text-gray-500"
				>Tip: use <code>npub*</code> to grant the discount to all Nostr-authenticated users.</span
			>
		</label>

		<fieldset class="form-label">
			<legend>Required product combination (optional)</legend>
			{#each combinations as combo, comboIdx}
				<div class="border rounded p-2 mb-2">
					<h4 class="font-semibold">Combination {comboIdx + 1} Product</h4>
					{#each combo.products as product, prodIdx}
						<ProductCombinationRow
							{product}
							{comboIdx}
							{prodIdx}
							{availableProductList}
							on:change={() => (combinations = combinations)}
							on:remove={() => {
								combo.products = combo.products.filter((_, idx) => idx !== prodIdx);
								combinations = combinations;
							}}
						/>
					{/each}
					<button
						type="button"
						class="text-sm underline"
						on:click={() => {
							combo.products = [...combo.products, { productId: '', quantity: 1 }];
							combinations = combinations;
						}}
					>
						+ Add product to combination
					</button>
				</div>
			{/each}
			<button
				type="button"
				class="btn body-mainCTA self-start"
				on:click={() => {
					combinations = [...combinations, { products: [{ productId: '', quantity: 1 }] }];
				}}
			>
				Add combination
			</button>
		</fieldset>
	{/if}
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
				/>
			</label>
			{#if data.tags.length}
				<!-- svelte-ignore a11y-label-has-associated-control -->
				<label class="form-label"
					>Products with this tag (optional)
					<MultiSelect
						--sms-options-bg="var(--body-mainPlan-backgroundColor)"
						name="requiredTagIds"
						options={data.tags.map((t) => ({ label: t.name, value: t._id }))}
					/>
				</label>
			{/if}
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
		<button
			class="btn body-mainCTA self-start"
			on:click={() => (productFreeLine += 1)}
			type="button"
			>Add product
		</button>
	{/if}

	<input type="submit" class="btn btn-blue self-start text-white" value="Submit" />
</form>
