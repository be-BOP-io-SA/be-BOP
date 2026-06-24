<script lang="ts">
	import { getContext } from 'svelte';
	import { FRACTION_DIGITS_PER_CURRENCY } from '$lib/types/Currency';
	import type { Readable } from 'svelte/store';

	type XY = { x: number; y: number };
	type Scale = ((value: number) => number) & {
		ticks?: (count?: number) => number[];
		range?: () => number[];
		invert?: (value: number) => number;
	};

	/** One series to draw. x = epoch ms, y = price. */
	export let series: Array<{
		id: string;
		color: string;
		step: boolean;
		area: boolean;
		values: XY[];
	}> = [];
	export let currency: string;
	export let locale = 'fr';

	// LayerCake context (d3 scales as Svelte stores).
	const { xScale, yScale, width, height } = getContext<{
		xScale: Readable<Scale>;
		yScale: Readable<Scale>;
		width: Readable<number>;
		height: Readable<number>;
	}>('LayerCake');

	const digits = (c: string) =>
		FRACTION_DIGITS_PER_CURRENCY[c as keyof typeof FRACTION_DIGITS_PER_CURRENCY] ?? 2;
	const fmtPrice = (v: number) => `${currency} ${v.toFixed(digits(currency))}`;
	const fmtDate = (t: number) =>
		new Date(t).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: '2-digit' });

	function linePath(values: XY[], step: boolean, xs: Scale, ys: Scale): string {
		if (!values.length) {
			return '';
		}
		let d = `M${xs(values[0].x)},${ys(values[0].y)}`;
		for (let i = 1; i < values.length; i++) {
			const x = xs(values[i].x);
			if (step) {
				d += `L${x},${ys(values[i - 1].y)}`;
			}
			d += `L${x},${ys(values[i].y)}`;
		}
		return d;
	}

	function areaPath(values: XY[], step: boolean, xs: Scale, ys: Scale, base: number): string {
		if (!values.length) {
			return '';
		}
		const first = xs(values[0].x);
		const last = xs(values[values.length - 1].x);
		return `${linePath(values, step, xs, ys)}L${last},${base}L${first},${base}Z`;
	}

	/** Real value of a series at instant `time` (step holds, linear takes nearest point). */
	function valueAt(s: { values: XY[]; step: boolean }, time: number): XY | null {
		if (!s.values.length) {
			return null;
		}
		if (s.step) {
			let v = s.values[0];
			for (const p of s.values) {
				if (p.x <= time) {
					v = p;
				}
			}
			return { x: time, y: v.y };
		}
		let nearest = s.values[0];
		for (const p of s.values) {
			if (Math.abs(p.x - time) < Math.abs(nearest.x - time)) {
				nearest = p;
			}
		}
		return nearest;
	}

	$: paths = series.map((s) => ({
		id: s.id,
		color: s.color,
		area: s.area,
		line: linePath(s.values, s.step, $xScale, $yScale),
		fill: s.area ? areaPath(s.values, s.step, $xScale, $yScale, $height) : ''
	}));
	$: yTicks = $yScale && $yScale.ticks ? $yScale.ticks(4) : [];
	// Fit the number of X labels to the available width so dates never overlap on
	// narrow (mobile / low-res) screens — each label needs ~80px to breathe.
	$: xTickCount = Math.max(2, Math.min(5, Math.floor(($width || 0) / 80)));
	$: xTicks = $xScale && $xScale.ticks ? $xScale.ticks(xTickCount) : [];
	$: xRangeMax = $xScale && $xScale.range ? $xScale.range()[1] : 0;

	// --- Hover tooltip ---------------------------------------------------------
	let hoverX: number | null = null; // plot-space x in pixels
	function onMove(event: MouseEvent) {
		const rect = (event.currentTarget as SVGRectElement).getBoundingClientRect();
		const px = event.clientX - rect.left;
		hoverX = px >= 0 && px <= xRangeMax ? px : null;
	}
	function onLeave() {
		hoverX = null;
	}
	$: hoverTime =
		hoverX !== null && $xScale && $xScale.invert ? ($xScale.invert(hoverX) as number) : null;
	$: hoverItems =
		hoverTime !== null
			? series
					.map((s) => ({ color: s.color, pt: valueAt(s, hoverTime as number) }))
					.filter((h): h is { color: string; pt: XY } => h.pt !== null)
			: [];
	// Balanced tooltip: padding is symmetric and the box fits its content.
	const TIP_PADX = 11;
	const TIP_PADY = 8;
	const TIP_LINE = 17;
	const estWidth = (s: string, perChar: number) => s.length * perChar;
	$: tipDate = hoverTime === null ? '' : fmtDate(hoverTime);
	$: tipW =
		Math.ceil(
			Math.max(
				estWidth(tipDate, 5.6),
				0,
				...hoverItems.map((h) => 15 + estWidth(fmtPrice(h.pt.y), 6.4))
			)
		) +
		TIP_PADX * 2;
	$: tipH = TIP_PADY * 2 + TIP_LINE * (1 + hoverItems.length);
	$: tooltipFlip = hoverX !== null && hoverX > xRangeMax - tipW - 14;
	$: tooltipX = hoverX === null ? 0 : tooltipFlip ? hoverX - tipW - 8 : hoverX + 8;
</script>

<!-- Y grid + labels -->
{#each yTicks as ty}
	<line
		x1="0"
		x2={xRangeMax}
		y1={$yScale(ty)}
		y2={$yScale(ty)}
		class="stroke-gray-300 [stroke-dasharray:2_3]"
	/>
	<text
		x="-8"
		y={$yScale(ty)}
		dy="0.32em"
		text-anchor="end"
		class="fill-gray-600 text-[11px] tabular-nums">{fmtPrice(ty)}</text
	>
{/each}

<!-- X labels -->
{#each xTicks as tx}
	<text
		x={$xScale(tx)}
		y={$height + 16}
		text-anchor="middle"
		class="fill-gray-600 text-[11px] tabular-nums">{fmtDate(tx)}</text
	>
{/each}

<!-- Series: area fills first, then lines on top -->
{#each paths as p (p.id + '-area')}
	{#if p.area}
		<path d={p.fill} fill={p.color} fill-opacity="0.12" stroke="none" />
	{/if}
{/each}
{#each paths as p (p.id + '-line')}
	<path d={p.line} fill="none" stroke={p.color} stroke-width="2" />
{/each}

<!-- Interaction surface (on top to capture the mouse) -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<rect
	x="0"
	y="0"
	width={xRangeMax}
	height={$height}
	fill="transparent"
	on:mousemove={onMove}
	on:mouseleave={onLeave}
/>

<!-- Hover guide, dots and tooltip -->
{#if hoverX !== null && hoverItems.length}
	<g style="pointer-events:none">
		<line
			x1={hoverX}
			x2={hoverX}
			y1="0"
			y2={$height}
			class="stroke-gray-550 [stroke-dasharray:3_3]"
		/>
		{#each hoverItems as h}
			<circle
				cx={$xScale(h.pt.x)}
				cy={$yScale(h.pt.y)}
				r="3.5"
				fill={h.color}
				stroke="#fff"
				stroke-width="1.5"
			/>
		{/each}
		<g transform="translate({tooltipX},4)">
			<rect width={tipW} height={tipH} rx="7" class="fill-gray-850 opacity-90" />
			<text
				x={TIP_PADX}
				y={TIP_PADY + TIP_LINE / 2}
				dominant-baseline="central"
				class="fill-gray-400 text-[10px]">{tipDate}</text
			>
			{#each hoverItems as h, i}
				{@const cy = TIP_PADY + TIP_LINE * (i + 1) + TIP_LINE / 2}
				<circle cx={TIP_PADX + 3} {cy} r="3.5" fill={h.color} />
				<text
					x={TIP_PADX + 14}
					y={cy}
					dominant-baseline="central"
					class="fill-white text-[11px] tabular-nums">{fmtPrice(h.pt.y)}</text
				>
			{/each}
		</g>
	</g>
{/if}
