<script lang="ts">
	import OrdersList from '$lib/components/OrdersList.svelte';
	import { ORDER_PAGINATION_LIMIT } from '$lib/types/Order';
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n.js';

	export let data;
	let next = 0;

	const { t, countryName, sortedCountryCodes } = useI18n();
</script>

<h1 class="text-3xl">List of orders</h1>
<form class="flex flex-col gap-2" method="GET">
	<div class="gap-4 flex flex-col md:flex-row">
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
			<select name="paymentMethod" class="form-input" disabled={data.paymentMethods.length === 0}>
				<option></option>
				{#each data.paymentMethods as paymentMethod}
					<option
						value={paymentMethod}
						selected={$page.url.searchParams.get('paymentMethod') === paymentMethod}
					>
						{t('checkout.paymentMethod.' + paymentMethod)}
					</option>
				{/each}
			</select>
		</label>
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
			<input type="submit" value="🔍" class="btn btn-gray" on:click={() => (next = 0)} />
			<a href="/admin/order" class="btn btn-gray">🧹</a>
		</label>
	</div>
	<OrdersList orders={data.orders} adminPrefix={data.adminPrefix} orderLabels={data.labels} />
	<div class="flex gap-2">
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
