<script lang="ts">
	import OrdersList from '$lib/components/OrdersList.svelte';
	import { useI18n } from '$lib/i18n';

	const { t, countryName, sortedCountryCodes } = useI18n();

	export let data;
	let overwriteIP = false;
	function handleSubmit(event: Event) {
		if (
			!confirm(
				"Are you sure ? This can have impact on law compliance with your sales and invoices. Do it only if you're sure about it and if the owner requested it"
			)
		) {
			event.preventDefault();
		}
	}
</script>

<svelte:head>
	<meta name="viewport" content="width=1000" />
</svelte:head>
<main class="max-w-7xl p-4 flex flex-col gap-4">
	<a href="/pos/session" class="body-hyperlink hover:underline">{t('pos.sessionLink')}</a>
	<a href="/pos/touch" class="body-hyperlink hover:underline">{t('pos.sessionTouchLink')}</a>
	<a href="/admin" class="body-hyperlink hover:underline" target="_blank"
		>{t('pos.adminInterface')}</a
	>
	<a href="/pos/customer-touch/welcome" class="body-hyperlink hover:underline"
		>Customer Touch Screen</a
	>

	<form method="POST" on:submit={handleSubmit}>
		<label class="checkbox-label">
			<input type="checkbox" class="form-checkbox" name="overwriteIP" bind:checked={overwriteIP} />
			Overwrite IP country for this POS session with selected country
		</label>
		<label class="form-label col-span-3">
			Overwrite session IP country (current value {data.countryCode})
			<select name="countryCode" class="form-input" required value={data.countryCode}>
				{#each sortedCountryCodes() as code}
					<option value={code}>{countryName(code)}</option>
				{/each}
			</select>
		</label>
		<button
			type="submit"
			disabled={!overwriteIP}
			class="btn btn-black mt-4"
			formaction="?/overwrite">Overwrite IP country</button
		>
		{#if data.sessionPos?.countryCodeOverwrite}
			<button type="submit" formaction="?/removeOverwrite" class="btn btn-black mt-4"
				>Remove Overwrite</button
			>{/if}
	</form>

	<form action="/admin/logout" method="POST">
		<button type="submit" class="btn btn-red">{t('login.cta.logout')}</button>
	</form>

	<h2 class="text-2xl">{t('pos.lastOrders.title')}</h2>

	<OrdersList orders={data.orders} adminPrefix="/pos" />
</main>
