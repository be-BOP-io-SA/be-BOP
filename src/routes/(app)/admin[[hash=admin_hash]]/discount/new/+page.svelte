<script lang="ts">
	import { enhance } from '$app/forms';
	import { useI18n } from '$lib/i18n';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { upperFirst } from '$lib/utils/upperFirst.js';
	import { addDays } from 'date-fns';
	import { MultiSelect } from 'svelte-multiselect';
	import ProductCombinationRow from '$lib/components/ProductCombinationRow.svelte';

	export let data;
	const { t, countryName } = useI18n();
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
			endsAtElement.setCustomValidity(t('admin.discount.endDateMustBeAfterBeginningDate'));
			endsAtElement.reportValidity();
			event.preventDefault();
			return;
		} else {
			endsAtElement.setCustomValidity('');
		}
	}
</script>

<h1 class="text-3xl">{t('admin.discount.addADiscount')}</h1>

<form method="post" class="flex flex-col gap-4" on:submit={checkForm} use:enhance>
	<label class="form-label">
		{t('admin.discount.discountName')}
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="name"
			placeholder={t('admin.discount.discountNamePlaceholder')}
			required
		/>
	</label>
	<label class="form-label">
		{t('admin.discount.mode')}
		<select name="mode" class="form-input" bind:value={mode}>
			{#each ['percentage', 'freeProducts'] as modeDiscount}
				<option value={modeDiscount}>{upperFirst(modeDiscount)}</option>
			{/each}
		</select>
	</label>
	{#if mode === 'percentage'}
		<label class="form-label">
			{t('admin.discount.discountPercentage')}
			<input
				class="form-input"
				type="number"
				min="1"
				max="100"
				name="percentage"
				placeholder={t('admin.discount.discountPercentagePlaceholder')}
				required
			/>
		</label>
	{/if}

	{#if mode === 'percentage'}
		<label class="checkbox-label">
			<input type="checkbox" name="showBadge" class="form-checkbox" checked />
			{t('admin.discount.showBadge')}
		</label>
		<label class="checkbox-label">
			<input type="checkbox" name="showExpirationBanner" class="form-checkbox" />
			{t('admin.discount.showExpirationBanner')}
		</label>
	{/if}

	<div class="flex flex-wrap gap-4">
		<label class="form-label">
			{t('admin.discount.beginningDate')}

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
			{t('admin.discount.endingDate')}

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
			<legend>{t('admin.discount.channelApplication')}</legend>
			{#each [{ value: 'web', label: t('admin.discount.channelWeb') }, { value: 'web-pos', label: t('admin.discount.channelWebPos') }, { value: 'pos-touch', label: t('admin.discount.channelPosTouch') }, { value: 'nostr-bot', label: 'Nostr-bot' }] as channel}
				<label class="checkbox-label">
					<input type="checkbox" name="channels" value={channel.value} class="form-checkbox" />
					{channel.label}
				</label>
			{/each}
		</fieldset>
	{/if}

	<!-- svelte-ignore a11y-label-has-associated-control -->
	<label class="form-label"
		>{t('admin.discount.requiredSubscription')} (optional)

		<MultiSelect
			--sms-options-bg="var(--body-mainPlan-backgroundColor)"
			name="subscriptionIds"
			options={subscriptions.map((p) => ({ label: p.name, value: p._id }))}
		/>
	</label>

	{#if mode === 'percentage'}
		<label class="form-label">
			{t('admin.discount.requiredCode')}
			<input
				class="form-input"
				type="text"
				name="promoCode"
				maxlength="50"
				placeholder={t('admin.discount.promoCodePlaceholder')}
			/>
			<span class="text-sm text-gray-500">{t('admin.discount.promoCodeTip')}</span>
		</label>

		<label class="form-label">
			{t('admin.discount.requiredDeliveryCountry')}
			<select name="deliveryCountry" class="form-input">
				<option value="none">{t('admin.discount.none')}</option>
				{#each sortedCountries as country}
					<option value={country}>{countryName(country)}</option>
				{/each}
			</select>
		</label>

		<label class="form-label">
			{t('admin.discount.requiredBillingCountry')}
			<select name="billingCountry" class="form-input">
				<option value="none">{t('admin.discount.none')}</option>
				{#each sortedCountries as country}
					<option value={country}>{countryName(country)}</option>
				{/each}
			</select>
		</label>

		<fieldset class="form-label">
			<legend>{t('admin.discount.paymentMethod')}</legend>
			{#each ['lightning', 'bank-transfer', 'point-of-sale', 'card', 'bitcoin', 'paypal', 'custom'] as pm}
				<label class="checkbox-label">
					<input type="checkbox" name="paymentMethods" value={pm} class="form-checkbox" />
					{pm}{pm === 'point-of-sale' ? ` ${t('admin.discount.posRoleOnly')}` : ''}
				</label>
			{/each}
		</fieldset>

		<label class="form-label">
			{t('admin.discount.requiredContactAddress')}
			<textarea
				class="form-input"
				name="contactAddresses"
				rows="4"
				placeholder={t('admin.discount.contactAddressesPlaceholder')}
			></textarea>
			<span class="text-sm text-gray-500">{t('admin.discount.contactAddressesTip')}</span>
		</label>

		<fieldset class="form-label">
			<legend>{t('admin.discount.requiredProductCombination')}</legend>
			{#each combinations as combo, comboIdx}
				<div class="border rounded p-2 mb-2">
					<h4 class="font-semibold">
						{t('admin.discount.combinationProduct', { number: comboIdx + 1 })}
					</h4>
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
						+ {t('admin.discount.addProductToCombination')}
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
				{t('admin.discount.addCombination')}
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
			{t('admin.discount.appliesToWholeCatalog')}
		</label>
		{#if !wholeCatalog}
			<!-- svelte-ignore a11y-label-has-associated-control -->
			<label class="form-label"
				>{t('admin.discount.products')}
				<MultiSelect
					--sms-options-bg="var(--body-mainPlan-backgroundColor)"
					name="productIds"
					options={availableProductList.map((p) => ({ label: p.name, value: p._id }))}
				/>
			</label>
			{#if data.tags.length}
				<!-- svelte-ignore a11y-label-has-associated-control -->
				<label class="form-label"
					>{t('admin.discount.requiredTag')}
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
					<td>{t('admin.discount.productSlug')}</td>
					<td>{t('admin.discount.freeCopiesQuantity')}</td>
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
			>{t('admin.discount.addProduct')}
		</button>
	{/if}

	<input
		type="submit"
		class="btn btn-blue self-start text-white"
		value={t('admin.discount.submit')}
	/>
</form>
