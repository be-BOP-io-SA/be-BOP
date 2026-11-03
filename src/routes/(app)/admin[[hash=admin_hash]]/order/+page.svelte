<script lang="ts">
	import OrdersList from '$lib/components/OrdersList.svelte';
	import { ORDER_PAGINATION_LIMIT } from '$lib/types/Order';
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n.js';

	export let data;
	let next = 0;
	let selectedPaymentMethod = $page.url.searchParams.get('paymentMethod') ?? '';

	const { t, countryName, sortedCountryCodes } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.order.title')}</h1>
<form class="flex flex-col gap-2" method="GET">
	<div class="gap-4 flex flex-col md:flex-row md:flex-wrap">
		<label class="form-label w-[15em]">
			{t('admin.order.searchOrder')}
			<input
				class="form-input"
				type="number"
				name="orderNumber"
				placeholder={t('admin.order.searchOrderByNumberPlaceholder')}
			/>
		</label>
		<label class="form-label w-[15em]">
			{t('admin.order.productAlias')}
			<input
				class="form-input"
				type="text"
				name="productAlias"
				value={$page.url.searchParams.get('productAlias')}
				placeholder={t('admin.order.searchOrderByProductAliasPlaceholder')}
			/>
		</label>
		<label class="form-label w-[15em]">
			{t('admin.order.paymentMean')}
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
				{t('admin.order.posSubtype')}
				<select name="posSubtype" class="form-input">
					<option value="">{t('admin.order.allSubtypes')}</option>
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
			{t('admin.order.country')}
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
			{t('admin.order.label')}
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
			{t('admin.order.email')}
			<input
				class="form-input"
				type="text"
				name="email"
				placeholder={t('admin.order.searchOrderByEmailPlaceholder')}
			/>
		</label>
		<label class="form-label w-[15em]">
			{t('admin.order.npub')}
			<input
				class="form-input"
				type="text"
				name="npub"
				placeholder={t('admin.order.searchOrderByNpubPlaceholder')}
			/>
		</label>
		<label class="form-label w-[15em]">
			{t('admin.order.employeeAlias')}
			<select name="employeeAlias" class="form-input">
				<option></option>
				<option>{t('admin.order.system')}</option>
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
	<OrdersList orders={data.orders} adminPrefix={data.adminPrefix} orderLabels={data.labels} />
	<div class="no-sticky flex gap-2">
		<input type="hidden" value={next} name="skip" />
		{#if Number($page.url.searchParams.get('skip'))}
			<button
				class="btn btn-blue"
				type="submit"
				on:click={() => (next = Math.max(0, next - ORDER_PAGINATION_LIMIT))}
				>{t('admin.order.previous')}</button
			>
		{/if}
		{#if data.orders.length >= ORDER_PAGINATION_LIMIT}
			<button class="btn btn-blue" type="submit" on:click={() => (next += ORDER_PAGINATION_LIMIT)}
				>{t('admin.order.next')}</button
			>
		{/if}
	</div>
</form>
