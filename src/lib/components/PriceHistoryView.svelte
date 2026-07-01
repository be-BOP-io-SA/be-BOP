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
		paid: {
			currency: string;
			points: PriceHistoryPoint[];
			listPoints: PriceHistoryPoint[];
			mean: number | null;
			pctBelowCatalogue: number | null;
		};
	};
</script>

<script lang="ts">
	import { LayerCake, Svg } from 'layercake';
	import PriceChartLayer from './PriceChartLayer.svelte';
	import { useI18n } from '$lib/i18n';
	import { formatCurrencyAmount } from '$lib/utils/formatCurrencyAmount';
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
	// The paid tab is expressed in the accounting currency (from order snapshots), which may
	// differ from the product/catalogue currency shown on the history tab.
	$: paidCur = history?.paid.currency || cur;
	const toXY = (pts: PriceHistoryPoint[] = []): XY[] =>
		pts.map((p) => ({ x: Date.parse(p.t), y: p.price }));
	$: catVals = toXY(history?.catalogue.points).map((p) => ({ ...p, y: p.y * vatMult }));
	$: paidVals = toXY(history?.paid.points);
	// Snapshotted catalogue/list price overlay for the paid tab (accounting currency).
	$: listVals = toXY(history?.paid.listPoints);

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
		v === null || v === undefined ? '—' : `${cur} ${formatCurrencyAmount(v, cur)}`;
	const fmtCat = (v: number | null | undefined) =>
		fmt(v !== null && v !== undefined ? v * vatMult : v);
	// Paid-tab values are already in the accounting currency — no VAT multiplier, its own currency.
	const fmtPaid = (v: number | null | undefined) =>
		v === null || v === undefined ? '—' : `${paidCur} ${formatCurrencyAmount(v, paidCur)}`;
	const fmtDate = (iso: string) =>
		new Date(iso).toLocaleDateString($locale, { day: '2-digit', month: 'short' });
	const fmtPct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)} %`;

	const getX = (d: { x: number; y: number }) => d.x;
	const getY = (d: { x: number; y: number }) => d.y;

	// Left gutter is sized to the widest Y-axis label the chart actually renders (reported back
	// by PriceChartLayer via bind:leftPad): BTC's 8-decimal amounts need far more room than fiat,
	// and a fixed width either clips them or wastes space. Per tab, since either can be crypto.
	const PADDING_BASE = { top: 8, right: 14, bottom: 26 };
	let histLeftPad = 56;
	let paidLeftPad = 56;
	$: histPadding = { ...PADDING_BASE, left: histLeftPad };
	$: paidPadding = { ...PADDING_BASE, left: paidLeftPad };
	const CAT_COLOR = '#3b82f6';
	const PAID_COLOR = '#f59e0b';
</script>

<!--
	Theming note: this card uses an explicit light palette (bg-white + gray text) with
	`dark:` overrides for the .dark theme. Every text element MUST carry a resolvable
	color — the project's tailwind.config.js replaces the gray scale and defines NO
	`gray-500`/`gray-900`, so those utilities emit no rule and the element silently
	inherits the dynamic `--body-text-color`, which is light in dark mode → unreadable
	light-on-white. Stick to defined shades (…-850 is the darkest) and pair each with a
	`dark:` variant.
-->
<!-- Sub-tabs -->
<div class="flex gap-6 border-b border-gray-100 dark:border-gray-800">
	{#if showHistory}
		<button
			type="button"
			class="-mb-px border-b-2 py-3 text-sm font-medium {tab === 'history'
				? 'border-blue-500 text-blue-600 dark:text-blue-400'
				: 'border-transparent text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}"
			on:click={() => (tab = 'history')}
		>
			{t('priceCalendar.tabHistory')}
		</button>
	{/if}
	{#if showPaid}
		<button
			type="button"
			class="-mb-px border-b-2 py-3 text-sm font-medium {tab === 'paid'
				? 'border-blue-500 text-blue-600 dark:text-blue-400'
				: 'border-transparent text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}"
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
						: 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}"
					on:click={() => (range = r.key)}>{r.label}</button
				>
			{/each}
		</div>
		{#if tab === 'history'}
			<div class="h-60 w-full rounded-xl border border-gray-100 p-2 dark:border-gray-800">
				{#if catVals.length}
					<LayerCake padding={histPadding} x={getX} y={getY} yDomain={domain(catVals)} data={catVals}>
						<Svg>
							<PriceChartLayer
								bind:leftPad={histLeftPad}
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

			<div class="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
				<div class="rounded-xl border border-gray-100 p-2.5 dark:border-gray-800 sm:p-4">
					<p class="truncate text-[10px] uppercase tracking-wide text-gray-400 sm:text-xs">
						{t('priceCalendar.current')}
					</p>
					<p
						class="mt-0.5 whitespace-nowrap text-sm font-semibold text-gray-850 dark:text-white sm:mt-1 sm:text-xl"
					>
						{fmtCat(history.catalogue.current)}
					</p>
					{#if history.catalogue.deltaPct !== null}
						<p
							class="mt-0.5 text-[10px] font-medium sm:mt-1 sm:text-xs {history.catalogue
								.deltaPct >= 0
								? 'text-red-500'
								: 'text-green-600'}"
						>
							{history.catalogue.deltaPct >= 0 ? '▲' : '▼'}
							{fmtPct(history.catalogue.deltaPct)}
							{t('priceCalendar.vsPrevious')}
						</p>
					{/if}
				</div>
				<div class="rounded-xl border border-gray-100 p-2.5 dark:border-gray-800 sm:p-4">
					<p class="truncate text-[10px] uppercase tracking-wide text-gray-400 sm:text-xs">
						{t('priceCalendar.min30')}
					</p>
					<p
						class="mt-0.5 whitespace-nowrap text-sm font-semibold text-gray-850 dark:text-white sm:mt-1 sm:text-xl"
					>
						{fmtCat(history.catalogue.min30?.price)}
					</p>
					{#if history.catalogue.min30}
						<p class="mt-0.5 truncate text-[10px] text-gray-400 sm:mt-1 sm:text-xs">
							{fmtDate(history.catalogue.min30.date)}
						</p>
					{/if}
				</div>
				<div class="rounded-xl border border-gray-100 p-2.5 dark:border-gray-800 sm:p-4">
					<p class="truncate text-[10px] uppercase tracking-wide text-gray-400 sm:text-xs">
						{t('priceCalendar.max30')}
					</p>
					<p
						class="mt-0.5 whitespace-nowrap text-sm font-semibold text-gray-850 dark:text-white sm:mt-1 sm:text-xl"
					>
						{fmtCat(history.catalogue.max30?.price)}
					</p>
					{#if history.catalogue.max30}
						<p class="mt-0.5 truncate text-[10px] text-gray-400 sm:mt-1 sm:text-xs">
							{t('priceCalendar.since', { date: fmtDate(history.catalogue.max30.date) })}
						</p>
					{/if}
				</div>
			</div>
		{:else}
			<div
				class="mb-4 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40"
			>
				<span
					class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 font-semibold text-white"
					>%</span
				>
				<div>
					<p class="text-sm text-gray-700 dark:text-gray-200">
						{t('priceCalendar.meanLabel')}
						<span class="font-semibold text-gray-850 dark:text-white"
							>{fmtPaid(history.paid.mean)}</span
						>
					</p>
					{#if history.paid.pctBelowCatalogue !== null}
						<p class="text-xs text-gray-600 dark:text-gray-400">
							{t('priceCalendar.belowCatalogue', {
								pct: `−${history.paid.pctBelowCatalogue.toFixed(1)}`
							})}
						</p>
					{/if}
				</div>
			</div>
			{#if adminOrderHref}
				<div class="mb-3">
					<a href={adminOrderHref} class="text-xs text-blue-600 underline dark:text-blue-400"
						>{t('priceCalendar.viewOrders')}</a
					>
				</div>
			{/if}

			<div class="h-60 w-full rounded-xl border border-gray-100 p-2 dark:border-gray-800">
				{#if paidVals.length || listVals.length}
					<LayerCake
						padding={paidPadding}
						x={getX}
						y={getY}
						yDomain={domain(listVals, paidVals)}
						data={[...listVals, ...paidVals]}
					>
						<Svg>
							<PriceChartLayer
								bind:leftPad={paidLeftPad}
								currency={paidCur}
								locale={$locale}
								series={[
									{ id: 'cat', color: CAT_COLOR, step: true, area: false, values: listVals },
									{ id: 'paid', color: PAID_COLOR, step: false, area: true, values: paidVals }
								]}
							/>
						</Svg>
					</LayerCake>
				{:else}
					<p class="py-16 text-center text-sm text-gray-400">{t('priceCalendar.noSales')}</p>
				{/if}
			</div>

			<div class="mt-3 flex items-center gap-5 text-xs text-gray-600 dark:text-gray-400">
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
			<div
				class="h-60 w-full rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-850"
			>
				<div class="flex h-full items-end gap-1.5">
					{#each [...Array(16).keys()] as i}
						<div
							class="flex-1 rounded-sm bg-gray-200 dark:bg-gray-700"
							style="height:{25 + ((i * 53) % 60)}%"
						/>
					{/each}
				</div>
			</div>
			<div class="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
				{#each [...Array(3).keys()] as i (i)}
					<div
						class="h-[64px] rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-850 sm:h-[76px]"
					/>
				{/each}
			</div>
		</div>
	{:else if errored}
		<p class="py-16 text-center text-sm text-red-500">{t('priceCalendar.error')}</p>
	{/if}
</div>
