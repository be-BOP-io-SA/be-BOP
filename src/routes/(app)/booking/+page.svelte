<script lang="ts">
	import { onDestroy } from 'svelte';
	import { useI18n } from '$lib/i18n';
	import { exportToICS } from '$lib/types/Schedule';
	import IconDownloadWindow from '$lib/components/icons/IconDownloadWindow.svelte';

	const { t, locale } = useI18n();
	export let data;

	type SortKey = 'dateAsc' | 'dateDesc' | 'orderNumberAsc' | 'orderNumberDesc';
	let sortKey = 'dateAsc' as SortKey;
	let showPast = false;
	let showCanceled = false;

	let now = new Date();
	const tick = setInterval(() => (now = new Date()), 60_000);
	onDestroy(() => clearInterval(tick));

	$: filtered = data.bookings.filter((b) => {
		if (!showCanceled && b.status === 'canceled') {
			return false;
		}
		if (!showPast && new Date(b.endsAt) < now) {
			return false;
		}
		return true;
	});

	$: sorted = [...filtered].sort((a, b) => {
		switch (sortKey) {
			case 'orderNumberAsc':
				return (a.orderNumber ?? 0) - (b.orderNumber ?? 0);
			case 'orderNumberDesc':
				return (b.orderNumber ?? 0) - (a.orderNumber ?? 0);
			case 'dateAsc':
				return new Date(a.beginsAt).getTime() - new Date(b.beginsAt).getTime();
			case 'dateDesc':
				return new Date(b.beginsAt).getTime() - new Date(a.beginsAt).getTime();
			default:
				sortKey satisfies never;
				return 0;
		}
	});

	function statusEmoji(b: { beginsAt: Date | string; endsAt: Date | string }) {
		const begins = new Date(b.beginsAt);
		const ends = new Date(b.endsAt);
		if (begins > now) {
			return '\u{1F535}';
		}
		if (ends > now) {
			return '\u{1F7E0}';
		}
		return '\u{1F7E2}';
	}
</script>

<main class="mx-auto max-w-7xl p-4 sm:p-6 body-mainPlan flex flex-col gap-4 sm:gap-6">
	<h1 class="text-2xl sm:text-3xl">{t('booking.listTitle')}</h1>

	{#if data.bookings.length}
		<div class="flex flex-col gap-3">
			<label class="form-label">
				{t('booking.sort.label')}
				<select class="form-input" bind:value={sortKey}>
					<option value="dateAsc">{t('booking.sort.dateAsc')}</option>
					<option value="dateDesc">{t('booking.sort.dateDesc')}</option>
					<option value="orderNumberAsc">{t('booking.sort.orderNumberAsc')}</option>
					<option value="orderNumberDesc">{t('booking.sort.orderNumberDesc')}</option>
				</select>
			</label>
			<label class="checkbox-label">
				<input class="form-checkbox" type="checkbox" bind:checked={showPast} />
				{t('booking.showPast')}
			</label>
			<label class="checkbox-label">
				<input class="form-checkbox" type="checkbox" bind:checked={showCanceled} />
				{t('booking.showCanceled')}
			</label>
		</div>

		{#if sorted.length}
			<ul class="flex flex-col gap-3">
				{#each sorted as b (b._id)}
					<li class="border rounded-lg p-3 sm:p-4 flex flex-col gap-2">
						<div class="flex flex-wrap items-baseline justify-between gap-2">
							<div class="flex items-center gap-2">
								<span aria-hidden="true">{statusEmoji(b)}</span>
								<a
									href="/order/{b.orderId}"
									target="_blank"
									rel="noopener"
									class="body-hyperlink underline font-semibold"
								>
									{#if b.orderNumber !== null}
										#{b.orderNumber.toLocaleString($locale)}
									{:else}
										{b.orderId}
									{/if}
								</a>
							</div>
							{#if b.productId}
								<a
									href="/product/{b.productId}"
									target="_blank"
									rel="noopener"
									class="font-medium body-hyperlink underline"
								>
									{b.productName}
								</a>
							{:else}
								<span class="font-medium">{b.productName}</span>
							{/if}
						</div>
						<div class="text-sm flex flex-wrap items-center gap-1">
							<time datetime={new Date(b.beginsAt).toISOString()}>
								{new Date(b.beginsAt).toLocaleString($locale)}
							</time>
							<span aria-hidden="true">–</span>
							<time datetime={new Date(b.endsAt).toISOString()}>
								{new Date(b.endsAt).toLocaleString($locale)}
							</time>
						</div>
						<div>
							<a
								href={exportToICS(
									{ title: b.productName, slug: '', beginsAt: b.beginsAt, endsAt: b.endsAt },
									0
								)}
								download="{b.productName}.ics"
								class="btn btn-black inline-flex items-center gap-2 text-sm"
							>
								<IconDownloadWindow class="h-4 w-auto" />
								{t('booking.exportIcal')}
							</a>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-gray-500">{t('booking.noUpcoming')}</p>
		{/if}
	{:else}
		<p class="text-gray-500">{t('booking.noBookings')}</p>
	{/if}
</main>
