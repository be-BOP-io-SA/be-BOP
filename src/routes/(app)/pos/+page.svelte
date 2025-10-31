<script lang="ts">
	import OrdersList from '$lib/components/OrdersList.svelte';
	import { useI18n } from '$lib/i18n';
	import { isToday, isYesterday, format, formatDistance } from 'date-fns';
	import IconWarning from '~icons/ant-design/warning-outlined';

	const { t, countryName, sortedCountryCodes, formatDistanceLocale } = useI18n();

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

	$: getRelativeTime = (date: Date) => {
		const dateObj = new Date(date);
		if (isToday(dateObj)) {
			return 'today';
		}
		if (isYesterday(dateObj)) {
			return 'yesterday';
		}

		const days = Math.floor((Date.now() - dateObj.getTime()) / 86400000);
		return days <= 7
			? formatDistance(dateObj, new Date(), { addSuffix: true, locale: formatDistanceLocale() })
			: format(dateObj, 'P');
	};
</script>

<svelte:head>
	<meta name="viewport" content="width=1000" />
</svelte:head>
<main class="max-w-7xl p-4 flex flex-col gap-4">
	<a href="/pos/session" class="body-hyperlink hover:underline">{t('pos.sessionLink')}</a>
	<a href="/pos/touch" class="body-hyperlink hover:underline">{t('pos.sessionTouchLink')}</a>
	{#if data.posSession.enabled}
		<a href="/pos/history" class="body-hyperlink hover:underline">POS sessions history</a>
	{/if}
	<a href="/admin" class="body-hyperlink hover:underline" target="_blank"
		>{t('pos.adminInterface')}</a
	>

	{#if data.posSession.enabled}
		<div class="border border-gray-300 rounded-lg p-4 bg-white">
			<h2 class="text-xl font-semibold mb-4">POS Session Management</h2>

			{#if data.currentSession}
				{@const sessionDate = new Date(data.currentSession.openedAt)}
				{@const sessionIsToday = isToday(sessionDate)}
				{@const relativeTime = getRelativeTime(sessionDate)}

				<div class="mb-4">
					<p
						class="text-sm"
						class:text-gray-600={sessionIsToday}
						class:text-red-600={!sessionIsToday}
					>
						{#if sessionIsToday}
							Session opened <strong>{relativeTime}</strong> at
							<strong>{format(sessionDate, 'HH:mm')}</strong>
							by <strong>{data.currentSession.openedBy}</strong>
						{:else}
							<span class="inline-flex items-center gap-1">
								<IconWarning class="w-4 h-4" />
								Session opened <strong>{relativeTime}</strong> at
								<strong>{format(sessionDate, 'HH:mm')}</strong>
								by <strong>{data.currentSession.openedBy}</strong>
							</span>
							<span class="block mt-1 text-red-700 font-semibold"
								>This session should have been closed!</span
							>
						{/if}
					</p>
				</div>

				<div class="flex gap-3">
					{#if data.posSession.allowXTicketEditing}
						<a href="/pos/x-ticket" class="btn btn-blue"> Generate X ticket </a>
					{/if}
					<a href="/pos/closing" class="btn btn-green"> Close the PoS & generate Z ticket </a>
				</div>
			{:else}
				<p class="text-sm text-gray-600 mb-3">
					No active POS session. Start your day by opening the POS.
				</p>
				<a href="/pos/opening" class="btn btn-black"> Open the PoS </a>
			{/if}
		</div>
	{/if}
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
