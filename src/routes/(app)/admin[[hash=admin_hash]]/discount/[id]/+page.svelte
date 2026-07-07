<script lang="ts">
	import { enhance } from '$app/forms';
	import { useI18n } from '$lib/i18n';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { upperFirst } from '$lib/utils/upperFirst.js';
	import { MultiSelect } from 'svelte-multiselect';
	import ProductCombinationRow from '$lib/components/ProductCombinationRow.svelte';

	export let data;
	const { t, countryName } = useI18n();
	$: sortedCountries = [...data.countries].sort((a, b) =>
		countryName(a).localeCompare(countryName(b))
	);

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
	let combinations = data.discount.productCombinations ?? [];
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

	function confirmDelete(event: Event) {
		if (!confirm(t('admin.discount.confirmDeleteDiscount'))) {
			event.preventDefault();
		}
	}
	let updateSubscriptionsWithMissingDiscountsProcess: undefined | 'in-progress' | 'completed';
</script>

<h1 class="text-3xl">{t('admin.discount.editADiscount')}</h1>

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
		{t('admin.discount.discountSlug')}
		<input type="text" disabled class="form-input" value={data.discount._id} />
	</label>

	<label class="form-label">
		{t('admin.discount.discountName')}
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="name"
			value={data.discount.name}
			placeholder={t('admin.discount.discountNamePlaceholder')}
			required
		/>
	</label>
	<label class="form-label">
		{t('admin.discount.mode')}
		<select name="mode" class="form-input" bind:value={mode} disabled>
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
				value={data.discount.mode === 'percentage' ? data.discount.percentage : 0}
				placeholder={t('admin.discount.discountPercentagePlaceholder')}
				required
			/>
		</label>
	{/if}

	{#if mode === 'percentage'}
		<label class="checkbox-label">
			<input
				type="checkbox"
				name="showBadge"
				class="form-checkbox"
				checked={data.discount.showBadge !== false}
			/>
			{t('admin.discount.showBadge')}
		</label>
		<label class="checkbox-label">
			<input
				type="checkbox"
				name="showExpirationBanner"
				class="form-checkbox"
				checked={data.discount.showExpirationBanner}
			/>
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
				bind:value={beginsAt}
				required
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
					<input
						type="checkbox"
						name="channels"
						value={channel.value}
						class="form-checkbox"
						checked={data.discount.channels?.some((c) => c === channel.value)}
					/>
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
			selected={(data.discount.subscriptionIds ?? []).map((p) => ({
				value: p,
				label: subscriptions.find((p2) => p2._id === p)?.name ?? p
			}))}
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
				value={data.discount.promoCode ?? ''}
				placeholder={t('admin.discount.promoCodePlaceholder')}
			/>
			<span class="text-sm text-gray-500">{t('admin.discount.promoCodeTip')}</span>
		</label>

		<label class="form-label">
			{t('admin.discount.requiredDeliveryCountry')}
			<select name="deliveryCountry" class="form-input">
				<option value="none">{t('admin.discount.none')}</option>
				{#each sortedCountries as country}
					<option value={country} selected={data.discount.deliveryCountry === country}
						>{countryName(country)}</option
					>
				{/each}
			</select>
		</label>

		<label class="form-label">
			{t('admin.discount.requiredBillingCountry')}
			<select name="billingCountry" class="form-input">
				<option value="none">{t('admin.discount.none')}</option>
				{#each sortedCountries as country}
					<option value={country} selected={data.discount.billingCountry === country}
						>{countryName(country)}</option
					>
				{/each}
			</select>
		</label>

		<fieldset class="form-label">
			<legend>{t('admin.discount.paymentMethod')}</legend>
			{#each ['lightning', 'bank-transfer', 'point-of-sale', 'card', 'bitcoin', 'paypal', 'custom'] as pm}
				<label class="checkbox-label">
					<input
						type="checkbox"
						name="paymentMethods"
						value={pm}
						class="form-checkbox"
						checked={data.discount.paymentMethods?.some((m) => m === pm)}
					/>
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
				>{(data.discount.contactAddresses ?? []).join('\n')}</textarea
			>
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
					selected={data.discount.productIds.map((p) => ({
						value: p,
						label: availableProductList.find((p2) => p2._id === p)?.name ?? p
					}))}
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
						selected={(data.discount.requiredTagIds ?? []).map((id) => ({
							value: id,
							label: data.tags.find((t) => t._id === id)?.name ?? id
						}))}
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
			>{t('admin.discount.addProduct')}
		</button>
	{/if}
	<div class="flex flex-row justify-between gap-2">
		<div class="flex gap-2 w-min">
			<input
				type="submit"
				class="btn btn-blue text-white"
				formaction="?/update"
				value={t('admin.action.update')}
			/>
			<a href="/discounts/{data.discount._id}" class="btn body-mainCTA"
				>{t('admin.discount.view')}</a
			>
			<button
				type="submit"
				class="btn btn-green text-white ml-auto whitespace-nowrap"
				form="updateSubscriptionsWithMissingDiscountsForm"
				disabled={updateSubscriptionsWithMissingDiscountsProcess === 'in-progress'}
			>
				{#if updateSubscriptionsWithMissingDiscountsProcess === 'in-progress'}
					{t('admin.discount.updating')}
				{:else if updateSubscriptionsWithMissingDiscountsProcess === 'completed'}
					{t('admin.discount.subscriptionsUpdated')}
				{:else}
					{t('admin.discount.updateSubscriptionsWithMissingDiscounts')}
				{/if}
			</button>
		</div>

		<input
			type="submit"
			class="btn btn-red text-white ml-auto"
			formaction="?/delete"
			value={t('admin.discount.delete')}
			on:click={confirmDelete}
		/>
	</div>
</form>
