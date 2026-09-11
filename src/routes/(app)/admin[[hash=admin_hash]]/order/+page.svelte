<script lang="ts">
	import OrdersList from '$lib/components/OrdersList.svelte';
	import { ORDER_PAGINATION_LIMIT } from '$lib/types/Order';
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n.js';

	export let data;
	let next = 0;
	let selectedPaymentMethod = $page.url.searchParams.get('paymentMethod') ?? '';

	// One row per custom checkout field to filter on. Restored from the URL so a bookmarked or
	// shared search comes back with its rows, and never empty: the first row is the invitation.
	let customFieldFilters: Array<{ slug: string; value: string }> = data.customFieldFilters.length
		? data.customFieldFilters.map((filter) => ({ ...filter }))
		: [{ slug: '', value: '' }];

	function addCustomFieldFilter() {
		customFieldFilters = [...customFieldFilters, { slug: '', value: '' }];
	}

	function removeCustomFieldFilter(index: number) {
		customFieldFilters = customFieldFilters.filter((_, i) => i !== index);
		if (!customFieldFilters.length) {
			customFieldFilters = [{ slug: '', value: '' }];
		}
	}

	const { t, countryName, sortedCountryCodes } = useI18n();
</script>

<h1 class="text-3xl">List of orders</h1>
<form class="flex flex-col gap-2" method="GET">
	<div class="gap-4 flex flex-col md:flex-row md:flex-wrap">
		<label class="form-label w-[15em]">
			Search Order
			<input
				class="form-input"
				type="number"
				name="orderNumber"
				placeholder="search order by number"
			/>
		</label>
		<label class="form-label w-[15em]">
			Product alias
			<input
				class="form-input"
				type="text"
				name="productAlias"
				value={$page.url.searchParams.get('productAlias')}
				placeholder="search order by product alias"
			/>
		</label>
		<label class="form-label w-[15em]">
			Payment Mean
			<select
				name="paymentMethod"
				class="form-input"
				disabled={data.paymentMethods.length === 0}
				bind:value={selectedPaymentMethod}
			>
				<option value=""></option>
				{#each data.paymentMethods as paymentMethod}
					<option value={paymentMethod}>
						{t('checkout.paymentMethod.' + paymentMethod)}
					</option>
				{/each}
			</select>
		</label>
		{#if selectedPaymentMethod === 'point-of-sale' && data.posSubtypes?.length}
			<label class="form-label w-[15em]">
				PoS Subtype
				<select name="posSubtype" class="form-input">
					<option value="">All subtypes</option>
					{#each data.posSubtypes as subtype}
						<option
							value={subtype.slug}
							selected={$page.url.searchParams.get('posSubtype') === subtype.slug}
						>
							{subtype.name}
						</option>
					{/each}
				</select>
			</label>
		{/if}
		<label class="form-label w-[15em]">
			Country
			<select name="country" class="form-input">
				<option></option>
				{#each sortedCountryCodes() as code}
					<option value={code} selected={$page.url.searchParams.get('country') === code}
						>{countryName(code)}</option
					>
				{/each}
			</select>
		</label>
		<label class="form-label w-[15em]">
			Label
			<select name="label" class="form-input">
				<option></option>
				{#each data.labels as label}
					<option value={label._id} selected={$page.url.searchParams.get('label') === label._id}
						>{label.name}</option
					>
				{/each}
			</select>
		</label>
		<label class="form-label w-[15em]">
			Email
			<input class="form-input" type="text" name="email" placeholder="search order by email" />
		</label>
		<label class="form-label w-[15em]">
			Npub
			<input class="form-input" type="text" name="npub" placeholder="search order npub" />
		</label>
		<label class="form-label w-[15em]">
			Employee alias
			<select name="employeeAlias" class="form-input">
				<option></option>
				<option>System</option>
				{#each data.employees as employee}
					<option
						value={employee.alias}
						selected={$page.url.searchParams.get('employeeAlias') === employee.alias}
						>{employee.alias}</option
					>
				{/each}
			</select>
		</label>
		<label class="form-label w-auto mt-8 flex flex-row">
			<input type="submit" value="🔍" class="btn body-mainCTA" on:click={() => (next = 0)} />
			<a href="/admin/order" class="btn body-mainCTA">🧹</a>
		</label>
	</div>
	{#if data.checkoutFields.length}
		<div class="flex flex-col gap-2">
			{#each customFieldFilters as filter, index}
				<div class="gap-4 flex flex-col md:flex-row md:flex-wrap md:items-end">
					<label class="form-label w-[15em]">
						{t('admin.order.customFieldFilterLabel')}
						<select name="customFieldSlug" class="form-input" bind:value={filter.slug}>
							<option value="" />
							{#each data.checkoutFields as field}
								<option value={field.slug}>{field.label}</option>
							{/each}
						</select>
					</label>
					<label class="form-label w-[15em]">
						{t('admin.order.customFieldValueLabel')}
						<input
							class="form-input"
							type="text"
							name="customFieldValue"
							bind:value={filter.value}
							placeholder={t('admin.order.customFieldValuePlaceholder')}
						/>
					</label>
					<label class="form-label w-auto flex flex-row gap-2">
						<button type="button" class="btn body-mainCTA" on:click={addCustomFieldFilter}>+</button
						>
						{#if customFieldFilters.length > 1}
							<button
								type="button"
								class="btn body-secondaryCTA"
								on:click={() => removeCustomFieldFilter(index)}>-</button
							>
						{/if}
					</label>
				</div>
			{/each}
		</div>
	{/if}
	<OrdersList orders={data.orders} adminPrefix={data.adminPrefix} orderLabels={data.labels} />
	<div class="no-sticky flex gap-2">
		<input type="hidden" value={next} name="skip" />
		{#if Number($page.url.searchParams.get('skip'))}
			<button
				class="btn btn-blue"
				type="submit"
				on:click={() => (next = Math.max(0, next - ORDER_PAGINATION_LIMIT))}>Previous</button
			>
		{/if}
		{#if data.orders.length >= ORDER_PAGINATION_LIMIT}
			<button class="btn btn-blue" type="submit" on:click={() => (next += ORDER_PAGINATION_LIMIT)}
				>Next</button
			>
		{/if}
	</div>
</form>
