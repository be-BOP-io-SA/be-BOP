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

	export let productId: string;
	export let currency = '';
	/** When false, the component does not fetch (used by the modal while closed). */
	export let active = true;

	const { t, locale } = useI18n();

	let tab: 'history' | 'paid' = 'history';
	let history: PriceHistoryData | null = null;
	let loading = false;
	let errored = false;
	let loadedFor = '';

	$: if (active && productId && loadedFor !== productId && !loading) {
		void load(productId);
	}

	async function load(id: string) {
		loading = true;
		errored = false;
		try {
			const res = await fetch(`/product/${encodeURIComponent(id)}/price-history`);
			if (!res.ok) {
				throw new Error(String(res.status));
			}
			history = await res.json();
			loadedFor = id;
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
	$: catVals = toXY(history?.catalogue.points);
	$: paidVals = toXY(history?.paid.points);

	// Time-range selector — windows the chart instead of cramming the whole history.
	const DAY = 86_400_000;
	const RANGES = [
		{ key: '1m', label: '1M', days: 30 },
		{ key: '1y', label: '1Y', days: 365 },
		{ key: '5y', label: '5Y', days: 1825 },
		{ key: 'all', label: 'All', days: null }
	] as const;
	let range: (typeof RANGES)[number]['key'] = '1m';

	function windowed(values: XY[], step: boolean): XY[] {
		const days = RANGES.find((r) => r.key === range)?.days ?? null;
		if (days === null || !values.length) {
			return values;
		}
		const cutoff = Date.now() - days * DAY;
		const within = values.filter((v) => v.x >= cutoff);
		if (step) {
			// Keep the line anchored at the window edge with the price in effect then.
			const before = values.filter((v) => v.x < cutoff).at(-1);
			if (before && (within.length === 0 || within[0].x > cutoff)) {
				return [{ x: cutoff, y: before.y }, ...within];
			}
		}
		return within;
	}
	$: catView = windowed(catVals, true);
	$: paidView = windowed(paidVals, false);

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
			: `${cur} ${v.toFixed(FRACTION_DIGITS_PER_CURRENCY[cur as keyof typeof FRACTION_DIGITS_PER_CURRENCY] ?? 2)}`;
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
	<button
		type="button"
		class="-mb-px border-b-2 py-3 text-sm font-medium {tab === 'history'
			? 'border-blue-500 text-blue-600'
			: 'border-transparent text-gray-500 hover:text-gray-700'}"
		on:click={() => (tab = 'history')}
	>
		{t('priceCalendar.tabHistory')}
	</button>
	<button
		type="button"
		class="-mb-px border-b-2 py-3 text-sm font-medium {tab === 'paid'
			? 'border-blue-500 text-blue-600'
			: 'border-transparent text-gray-500 hover:text-gray-700'}"
		on:click={() => (tab = 'paid')}
	>
		{t('priceCalendar.tabPaid')}
	</button>
</div>

<div class="pt-5">
	{#if loading}
		<p class="py-16 text-center text-sm text-gray-400">{t('priceCalendar.loading')}</p>
	{:else if errored}
		<p class="py-16 text-center text-sm text-red-500">{t('priceCalendar.error')}</p>
	{:else if history}
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
				{#if catView.length}
					<LayerCake padding={PADDING} x={getX} y={getY} yDomain={domain(catView)} data={catView}>
						<Svg>
							<PriceChartLayer
								currency={cur}
								locale={$locale}
								series={[{ id: 'cat', color: CAT_COLOR, step: true, area: true, values: catView }]}
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
					<p class="mt-1 text-xl font-semibold text-gray-900">{fmt(history.catalogue.current)}</p>
					{#if history.catalogue.deltaPct !== null}
						<p class="mt-1 text-xs font-medium {history.catalogue.deltaPct >= 0 ? 'text-red-500' : 'text-green-600'}">
							{history.catalogue.deltaPct >= 0 ? '▲' : '▼'} {fmtPct(history.catalogue.deltaPct)} {t('priceCalendar.vsPrevious')}
						</p>
					{/if}
				</div>
				<div class="rounded-xl border border-gray-100 p-4">
					<p class="text-xs uppercase tracking-wide text-gray-400">{t('priceCalendar.min30')}</p>
					<p class="mt-1 text-xl font-semibold text-gray-900">{fmt(history.catalogue.min30?.price)}</p>
					{#if history.catalogue.min30}
						<p class="mt-1 text-xs text-gray-400">{fmtDate(history.catalogue.min30.date)}</p>
					{/if}
				</div>
				<div class="rounded-xl border border-gray-100 p-4">
					<p class="text-xs uppercase tracking-wide text-gray-400">{t('priceCalendar.max30')}</p>
					<p class="mt-1 text-xl font-semibold text-gray-900">{fmt(history.catalogue.max30?.price)}</p>
					{#if history.catalogue.max30}
						<p class="mt-1 text-xs text-gray-400">{t('priceCalendar.since', { date: fmtDate(history.catalogue.max30.date) })}</p>
					{/if}
				</div>
			</div>
		{:else}
			<div class="mb-4 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
				<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 font-semibold text-white">%</span>
				<div>
					<p class="text-sm text-gray-700">
						{t('priceCalendar.meanLabel')} <span class="font-semibold text-gray-900">{fmt(history.paid.mean)}</span>
					</p>
					{#if history.paid.pctBelowCatalogue !== null}
						<p class="text-xs text-gray-500">
							{t('priceCalendar.belowCatalogue', { pct: `−${history.paid.pctBelowCatalogue.toFixed(1)}` })}
						</p>
					{/if}
				</div>
			</div>

			<div class="h-60 w-full rounded-xl border border-gray-100 p-2">
				{#if paidView.length || catView.length}
					<LayerCake
						padding={PADDING}
						x={getX}
						y={getY}
						yDomain={domain(catView, paidView)}
						data={[...catView, ...paidView]}
					>
						<Svg>
							<PriceChartLayer
								currency={cur}
								locale={$locale}
								series={[
									{ id: 'cat', color: CAT_COLOR, step: true, area: false, values: catView },
									{ id: 'paid', color: PAID_COLOR, step: false, area: true, values: paidView }
								]}
							/>
						</Svg>
					</LayerCake>
				{:else}
					<p class="py-16 text-center text-sm text-gray-400">{t('priceCalendar.noSales')}</p>
				{/if}
			</div>

			<div class="mt-3 flex items-center gap-5 text-xs text-gray-500">
				<span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full" style="background:{CAT_COLOR}" /> {t('priceCalendar.catalogue')}</span>
				<span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full" style="background:{PAID_COLOR}" /> {t('priceCalendar.averagePaid')}</span>
			</div>
		{/if}
	{/if}
</div>
