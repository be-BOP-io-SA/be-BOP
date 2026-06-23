<script lang="ts" context="module">
	export type PriceHistoryPoint = { t: string; price: number };
	export type PriceHistoryData = {
		currency: string;
		catalogue: {
			points: PriceHistoryPoint[];
			current: number | null;
			deltaPct: number | null;
			min30: { price: number; date: string } | null;
			max30: { price: number; date: string } | null;
		};
		paid: { points: PriceHistoryPoint[]; mean: number | null; pctBelowCatalogue: number | null };
	};
</script>

<script lang="ts">
	import { LayerCake, Svg } from 'layercake';
	import PriceChartLayer from './PriceChartLayer.svelte';
	import { useI18n } from '$lib/i18n';
	import { FRACTION_DIGITS_PER_CURRENCY } from '$lib/types/Currency';
	import { browser } from '$app/environment';

	export let productId: string;
	export let currency = '';
	/** When false, the component does not fetch (used by the modal while closed). */
	export let active = true;
	export let showHistory = true;
	export let showPaid = false;
	export let vatMult = 1;
	export let adminOrderHref = '';

	const { t, locale } = useI18n();

	let tab: 'history' | 'paid' = showHistory ? 'history' : 'paid';
	let history: PriceHistoryData | null = null;
	let loading = false;
	let errored = false;
	let loadedKey = '';

	// Fetch only in the browser (never during SSR) and only while active — so the
	// modal loads on open, not on page load. Refetch when the range changes so the
	// server bounds the (heavy) orders query to the selected window.
	$: fetchKey = `${productId}|${range}`;
	$: if (browser && active && productId && loadedKey !== fetchKey && !loading) {
		void load(fetchKey);
	}

	async function load(key: string) {
		loading = true;
		errored = false;
		try {
			const res = await fetch(
				`/product/${encodeURIComponent(productId)}/price-history?range=${range}`
			);
			if (!res.ok) {
				throw new Error(String(res.status));
			}
			history = await res.json();
			loadedKey = key;
		} catch {
			errored = true;
		} finally {
			loading = false;
		}
	}

	type XY = { x: number; y: number };

	$: cur = history?.currency || currency;
	const toXY = (pts: PriceHistoryPoint[] = []): XY[] =>
		pts.map((p) => ({ x: Date.parse(p.t), y: p.price }));
	$: catVals = toXY(history?.catalogue.points).map((p) => ({ ...p, y: p.y * vatMult }));
	$: paidVals = toXY(history?.paid.points);

	// Time-range selector. The server bounds BOTH series to the selected range, so
	// there is no client-side windowing — the range only drives the refetch above.
	const RANGES = [
		{ key: '1m', label: '1M' },
		{ key: '1y', label: '1Y' },
		{ key: '5y', label: '5Y' },
		{ key: 'all', label: 'All' }
	] as const;
	let range: (typeof RANGES)[number]['key'] = '1m';

	function domain(...sets: Array<Array<{ x: number; y: number }>>): [number, number] {
		const ys = sets.flat().map((p) => p.y);
		if (!ys.length) {
			return [0, 1];
		}
		const lo = Math.min(...ys);
		const hi = Math.max(...ys);
		const pad = (hi - lo || hi || 1) * 0.08;
		return [lo - pad, hi + pad];
	}

	const fmt = (v: number | null | undefined) =>
		v === null || v === undefined
			? '—'
			: `${cur} ${v.toFixed(
					FRACTION_DIGITS_PER_CURRENCY[cur as keyof typeof FRACTION_DIGITS_PER_CURRENCY] ?? 2
			  )}`;
	const fmtCat = (v: number | null | undefined) =>
		fmt(v !== null && v !== undefined ? v * vatMult : v);
	const fmtDate = (iso: string) =>
		new Date(iso).toLocaleDateString($locale, { day: '2-digit', month: 'short' });
	const fmtPct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)} %`;

	const getX = (d: { x: number; y: number }) => d.x;
	const getY = (d: { x: number; y: number }) => d.y;

	const PADDING = { top: 8, right: 14, bottom: 26, left: 56 };
	const CAT_COLOR = '#3b82f6';
	const PAID_COLOR = '#f59e0b';
</script>

<!-- Sub-tabs -->
<div class="flex gap-6 border-b border-gray-100">
	{#if showHistory}
		<button
			type="button"
			class="-mb-px border-b-2 py-3 text-sm font-medium {tab === 'history'
				? 'border-blue-500 text-blue-600'
				: 'border-transparent text-gray-500 hover:text-gray-700'}"
			on:click={() => (tab = 'history')}
		>
			{t('priceCalendar.tabHistory')}
		</button>
	{/if}
	{#if showPaid}
		<button
			type="button"
			class="-mb-px border-b-2 py-3 text-sm font-medium {tab === 'paid'
				? 'border-blue-500 text-blue-600'
				: 'border-transparent text-gray-500 hover:text-gray-700'}"
			on:click={() => (tab = 'paid')}
		>
			{t('priceCalendar.tabPaid')}
		</button>
	{/if}
</div>

<div class="pt-5">
	{#if history}
		<div class="mb-3 flex justify-end gap-1">
			{#each RANGES as r}
				<button
					type="button"
					class="rounded-md px-2.5 py-1 text-xs font-medium {range === r.key
						? 'bg-blue-500 text-white'
						: 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
					on:click={() => (range = r.key)}>{r.label}</button
				>
			{/each}
		</div>
		{#if tab === 'history'}
			<div class="h-60 w-full rounded-xl border border-gray-100 p-2">
				{#if catVals.length}
					<LayerCake padding={PADDING} x={getX} y={getY} yDomain={domain(catVals)} data={catVals}>
						<Svg>
							<PriceChartLayer
								currency={cur}
								locale={$locale}
								series={[{ id: 'cat', color: CAT_COLOR, step: true, area: true, values: catVals }]}
							/>
						</Svg>
					</LayerCake>
				{:else}
					<p class="py-16 text-center text-sm text-gray-400">{t('priceCalendar.noHistory')}</p>
				{/if}
			</div>

			<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
				<div class="rounded-xl border border-gray-100 p-4">
					<p class="text-xs uppercase tracking-wide text-gray-400">{t('priceCalendar.current')}</p>
					<p class="mt-1 text-xl font-semibold text-gray-900">{fmtCat(history.catalogue.current)}</p>
					{#if history.catalogue.deltaPct !== null}
						<p
							class="mt-1 text-xs font-medium {history.catalogue.deltaPct >= 0
								? 'text-red-500'
								: 'text-green-600'}"
						>
							{history.catalogue.deltaPct >= 0 ? '▲' : '▼'}
							{fmtPct(history.catalogue.deltaPct)}
							{t('priceCalendar.vsPrevious')}
						</p>
					{/if}
				</div>
				<div class="rounded-xl border border-gray-100 p-4">
					<p class="text-xs uppercase tracking-wide text-gray-400">{t('priceCalendar.min30')}</p>
					<p class="mt-1 text-xl font-semibold text-gray-900">
						{fmtCat(history.catalogue.min30?.price)}
					</p>
					{#if history.catalogue.min30}
						<p class="mt-1 text-xs text-gray-400">{fmtDate(history.catalogue.min30.date)}</p>
					{/if}
				</div>
				<div class="rounded-xl border border-gray-100 p-4">
					<p class="text-xs uppercase tracking-wide text-gray-400">{t('priceCalendar.max30')}</p>
					<p class="mt-1 text-xl font-semibold text-gray-900">
						{fmtCat(history.catalogue.max30?.price)}
					</p>
					{#if history.catalogue.max30}
						<p class="mt-1 text-xs text-gray-400">
							{t('priceCalendar.since', { date: fmtDate(history.catalogue.max30.date) })}
						</p>
					{/if}
				</div>
			</div>
		{:else}
			<div class="mb-4 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
				<span
					class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 font-semibold text-white"
					>%</span
				>
				<div>
					<p class="text-sm text-gray-700">
						{t('priceCalendar.meanLabel')}
						<span class="font-semibold text-gray-900">{fmt(history.paid.mean)}</span>
					</p>
					{#if history.paid.pctBelowCatalogue !== null}
						<p class="text-xs text-gray-500">
							{t('priceCalendar.belowCatalogue', {
								pct: `−${history.paid.pctBelowCatalogue.toFixed(1)}`
							})}
						</p>
					{/if}
				</div>
			</div>
			{#if adminOrderHref}
				<div class="mb-3">
					<a href={adminOrderHref} class="text-xs text-blue-600 underline"
						>{t('priceCalendar.viewOrders')}</a
					>
				</div>
			{/if}

			<div class="h-60 w-full rounded-xl border border-gray-100 p-2">
				{#if paidVals.length || catVals.length}
					<LayerCake
						padding={PADDING}
						x={getX}
						y={getY}
						yDomain={domain(catVals, paidVals)}
						data={[...catVals, ...paidVals]}
					>
						<Svg>
							<PriceChartLayer
								currency={cur}
								locale={$locale}
								series={[
									{ id: 'cat', color: CAT_COLOR, step: true, area: false, values: catVals },
									{ id: 'paid', color: PAID_COLOR, step: false, area: true, values: paidVals }
								]}
							/>
						</Svg>
					</LayerCake>
				{:else}
					<p class="py-16 text-center text-sm text-gray-400">{t('priceCalendar.noSales')}</p>
				{/if}
			</div>

			<div class="mt-3 flex items-center gap-5 text-xs text-gray-500">
				<span class="flex items-center gap-1.5"
					><span class="h-2.5 w-2.5 rounded-full" style="background:{CAT_COLOR}" />
					{t('priceCalendar.catalogue')}</span
				>
				<span class="flex items-center gap-1.5"
					><span class="h-2.5 w-2.5 rounded-full" style="background:{PAID_COLOR}" />
					{t('priceCalendar.averagePaid')}</span
				>
			</div>
		{/if}
	{:else if loading}
		<!-- Placeholder chart mockup while the first load is in flight. -->
		<div class="animate-pulse">
			<div class="h-60 w-full rounded-xl border border-gray-100 bg-gray-50 p-4">
				<div class="flex h-full items-end gap-1.5">
					{#each [...Array(16).keys()] as i}
						<div class="flex-1 rounded-sm bg-gray-200" style="height:{25 + ((i * 53) % 60)}%" />
					{/each}
				</div>
			</div>
			<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
				{#each [...Array(3).keys()] as i (i)}
					<div class="h-[76px] rounded-xl border border-gray-100 bg-gray-50" />
				{/each}
			</div>
		</div>
	{:else if errored}
		<p class="py-16 text-center text-sm text-red-500">{t('priceCalendar.error')}</p>
	{/if}
</div>
