<script lang="ts">
	import type { Product } from '$lib/types/Product';
	import type { Currency } from '$lib/types/Currency';
	import { format } from 'date-fns';
	import BEBOP_LOGO_BW from '$lib/assets/bebop-bw.svg';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let poolLabel: string;
	export let generatedAt: Date | undefined = undefined;
	export let tagGroups: Array<{
		tagNames: string[];
		items: Array<{
			product: Pick<Product, 'name'>;
			quantity: number;
			variations: Array<{ text: string; count: number }>;
			notes: string[];
		}>;
	}> = [];

	export let priceInfo:
		| {
				itemPrices: Array<{ amount: number; currency: Currency }>;
				total: number;
				totalExclVat: number;
				vatBreakdown: Array<{ rate: number; amount: number }>;
				currency: Currency;
				totalBeforeDiscount?: number;
				discountPercentage?: number;
		  }
		| undefined = undefined;

	export let companyInfo:
		| {
				businessName?: string;
				address?: {
					street?: string;
					zip?: string;
					city?: string;
					country?: string;
				};
				vatNumber?: string;
				phone?: string;
		  }
		| undefined = undefined;

	export let companyLogoUrl: string | undefined = undefined;
	export let showBebopLogo = true;
	// show ticket on screen (for standalone ticket pages). Default false for POS pages.
	export let showOnScreen = false;
	export let showGroupHeaders = false;
	export let sharesInfo: { percentage: number; amount: number; currency: Currency } | undefined =
		undefined;
	export let peopleCount: number | undefined = undefined;

	// ESC/POS Mode Toggle
	// Set to true to enable ESC/POS commands for compatible thermal printers
	export let useEscPos = false;

	// ESC/POS Command Constants
	const ESC = {
		// Text formatting
		BOLD_ON: '\x1b\x45\x01',
		BOLD_OFF: '\x1b\x45\x00',
		UNDERLINE_ON: '\x1b\x2d\x01',
		UNDERLINE_OFF: '\x1b\x2d\x00',
		UNDERLINE_THICK_ON: '\x1b\x2d\x02',
		INVERT_ON: '\x1d\x42\x01',
		INVERT_OFF: '\x1d\x42\x00',

		// Text size
		NORMAL: '\x1b\x21\x00',
		DOUBLE_HEIGHT: '\x1b\x21\x10',
		DOUBLE_WIDTH: '\x1b\x21\x20',
		QUAD: '\x1b\x21\x30',

		// Alignment
		ALIGN_LEFT: '\x1b\x61\x00',
		ALIGN_CENTER: '\x1b\x61\x01',
		ALIGN_RIGHT: '\x1b\x61\x02',

		// Font types
		FONT_A: '\x1b\x4d\x00',
		FONT_B: '\x1b\x4d\x01',

		// Line feed
		LF: '\x0a'
	};

	export let ticketWidth = 38;

	/**
	 * Places text on left and right sides of the line with spacing in between
	 * If text doesn't fit, puts label on first line and value right-aligned on second line
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function leftRight(left: string, right: string, width: number = ticketWidth): string {
		const spaces = width - left.length - right.length;
		if (spaces < 1) {
			// Doesn't fit - split into two lines: label left, value right-aligned below
			return left + '\n' + ' '.repeat(Math.max(0, width - right.length)) + right;
		}
		return left + ' '.repeat(spaces) + right;
	}

	/**
	 * Centers text within given width
	 */
	function centerText(text: string, width: number = ticketWidth): string {
		if (text.length >= width) {
			return text;
		}
		const spaces = (width - text.length) / 2;
		return ' '.repeat(Math.floor(spaces)) + text + ' '.repeat(Math.ceil(spaces));
	}

	/**
	 * Right-aligns text within given width
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function rightAlign(text: string, width: number = ticketWidth): string {
		if (text.length >= width) {
			return text;
		}
		const spaces = width - text.length;
		return ' '.repeat(spaces) + text;
	}

	/**
	 * Creates table row with custom column widths and alignments
	 * Last column gets remaining space to ensure full width alignment
	 */
	function tableRow(
		columns: Array<{
			text: string;
			width: number;
			align?: 'LEFT' | 'CENTER' | 'RIGHT';
			bold?: boolean;
		}>,
		totalWidth: number = ticketWidth
	): string {
		// Calculate widths, giving last column the remainder
		const widths = columns.map((col, i) => {
			if (i === columns.length - 1) {
				// Last column gets remaining space
				const usedWidth = columns
					.slice(0, -1)
					.reduce((sum, c) => sum + Math.floor(totalWidth * c.width), 0);
				return totalWidth - usedWidth;
			}
			return Math.floor(totalWidth * col.width);
		});

		return columns
			.map((col, i) => {
				const cellWidth = widths[i];
				let cellText = col.text.substring(0, cellWidth);
				const spaces = cellWidth - cellText.length;

				let result = '';

				if (col.align === 'CENTER') {
					const leftSpaces = Math.floor(spaces / 2);
					const rightSpaces = spaces - leftSpaces;
					result = ' '.repeat(leftSpaces) + cellText + ' '.repeat(rightSpaces);
				} else if (col.align === 'RIGHT') {
					result = ' '.repeat(Math.max(0, spaces)) + cellText;
				} else {
					result = cellText + ' '.repeat(Math.max(0, spaces));
				}

				return col.bold ? bold(result) : result;
			})
			.join('');
	}

	/**
	 * Creates a separator line with different styles
	 * When useEscPos is false, Unicode chars are replaced with ASCII equivalents
	 */
	function separator(char: '=' | '-' | '·' | '─' | '═' = '=', width: number = ticketWidth): string {
		let actualChar = char;
		if (!useEscPos) {
			// Map Unicode to ASCII for printer compatibility
			const asciiMap: Record<string, string> = {
				'═': '=',
				'─': '-',
				'·': '.'
			};
			actualChar = (asciiMap[char] ?? char) as typeof char;
		}
		return actualChar.repeat(width);
	}

	/**
	 * Wraps text to fit within given width
	 */
	function wordWrap(text: string, width: number = ticketWidth): string[] {
		const lines: string[] = [];
		let currentLine = '';

		text.split(' ').forEach((word) => {
			if (currentLine.length + word.length + 1 <= width) {
				currentLine += (currentLine ? ' ' : '') + word;
			} else {
				if (currentLine) {
					lines.push(currentLine);
				}
				currentLine = word;
			}
		});

		if (currentLine) {
			lines.push(currentLine);
		}
		return lines;
	}

	/**
	 * Applies bold formatting to text (ESC/POS only)
	 */
	function bold(text: string): string {
		if (!useEscPos) {
			return text;
		}
		return `${ESC.BOLD_ON}${text}${ESC.BOLD_OFF}`;
	}

	/**
	 * Applies underline formatting to text (ESC/POS only)
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function underline(text: string, thick = false): string {
		if (!useEscPos) {
			return text;
		}
		const cmd = thick ? ESC.UNDERLINE_THICK_ON : ESC.UNDERLINE_ON;
		return `${cmd}${text}${ESC.UNDERLINE_OFF}`;
	}

	/**
	 * Applies invert formatting to text - white on black (ESC/POS only)
	 * In plain mode, wraps text with brackets for visibility
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function invert(text: string): string {
		if (!useEscPos) {
			return `[${text.trim()}]`;
		}
		return `${ESC.INVERT_ON}${text}${ESC.INVERT_OFF}`;
	}

	/**
	 * Formats price with currency and alignment
	 */
	function formatPrice(amount: number, currency: Currency): string {
		return `${currency} ${amount.toFixed(2)}`;
	}

	$: ticketLabels = {
		subtotal: t('pos.touch.subtotal').toUpperCase(),
		total: t('pos.touch.total').toUpperCase(),
		exclVat: t('pos.split.exclVat'),
		inclVat: t('pos.split.inclVatShort'),
		discount: t('order.discount.title'),
		totalWithDiscount: t('order.receipt.totalWithDiscount').toUpperCase(),
		beforeDiscount: t('pos.split.beforeDiscount'),
		afterDiscount: t('pos.split.afterDiscount')
	};

	$: isCustomerReceipt = !!priceInfo;
	$: hasDiscount = !!priceInfo?.totalBeforeDiscount && !!priceInfo?.discountPercentage;

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	$: discountAmount =
		hasDiscount && priceInfo ? (priceInfo.totalBeforeDiscount ?? 0) - priceInfo.total : 0;

	$: totalBeforeDiscountSafe = priceInfo?.totalBeforeDiscount ?? 0;
	$: discountPercentageSafe = priceInfo?.discountPercentage ?? 0;

	$: itemsWithPrices = (() => {
		let priceIndex = 0;
		return tagGroups.flatMap((group) =>
			group.items.map((item) => ({
				...item,
				tagNames: group.tagNames,
				price: priceInfo?.itemPrices[priceIndex++]
			}))
		);
	})();

	// Helper: render variations and notes for an item (shared between global and kitchen tickets)
	type ItemWithExtras = {
		variations: Array<{ text: string; count: number }>;
		notes: string[];
	};

	const renderVariationsAndNotes = (item: ItemWithExtras, lines: string[], indent = '  ') => {
		item.variations.forEach((variation) => {
			lines.push(
				tableRow([
					{ text: '', width: 0.15 },
					{ text: `${indent}${variation.count} ${variation.text}`, width: 0.85, align: 'LEFT' }
				])
			);
		});

		item.notes.forEach((note) => {
			lines.push(
				tableRow([
					{ text: '', width: 0.15 },
					{ text: `${indent}+${note}`, width: 0.85, align: 'LEFT' }
				])
			);
		});
	};

	// Ticket Builder - generates formatted ticket content
	$: ticketContent = (() => {
		const lines: string[] = [];

		// Separator after HTML header (if company info exists)
		if (companyInfo) {
			lines.push(separator('═'));
		}

		// Ticket header
		if (isCustomerReceipt && priceInfo) {
			lines.push('');
			if (useEscPos) {
				lines.push(ESC.DOUBLE_WIDTH + centerText(`TICKET "${poolLabel}"`, 16) + ESC.NORMAL);
			} else {
				lines.push(centerText(`TICKET "${poolLabel}"`));
			}

			if (generatedAt) {
				lines.push(centerText(format(generatedAt, 'dd/MM/yyyy HH:mm')));
			}

			lines.push(separator('-'));

			// Helper: render table header
			const renderTableHeader = () => {
				lines.push(
					tableRow([
						{ text: 'QTY', width: 0.15, align: 'LEFT', bold: true },
						{ text: 'ITEM', width: 0.55, align: 'LEFT', bold: true },
						{ text: 'PRICE', width: 0.3, align: 'RIGHT', bold: true }
					])
				);
				lines.push(separator('·'));
			};

			// Helper: render single item
			const renderItem = (item: (typeof itemsWithPrices)[0]) => {
				const itemName = item.product.name.toUpperCase();
				const priceStr = item.price ? formatPrice(item.price.amount, item.price.currency) : '';

				lines.push(
					tableRow([
						{ text: `${item.quantity}x`, width: 0.15, align: 'LEFT' },
						{ text: itemName, width: 0.55, align: 'LEFT' },
						{ text: priceStr, width: 0.3, align: 'RIGHT' }
					])
				);

				renderVariationsAndNotes(item, lines);
			};

			let lastGroupKey = '';
			if (!showGroupHeaders) {
				lines.push('');
				renderTableHeader();
			}

			itemsWithPrices.forEach((item) => {
				const groupKey = item.tagNames.join(', ');

				if (showGroupHeaders && groupKey !== lastGroupKey) {
					lines.push('');
					lines.push(separator('-'));
					if (groupKey) {
						lines.push(groupKey + ' items:');
					}
					lines.push(separator('-'));
					renderTableHeader();
					lastGroupKey = groupKey;
				}

				renderItem(item);
			});

			lines.push('');
			lines.push(separator('─'));

			if (hasDiscount) {
				const discountMultiplier = 1 - discountPercentageSafe / 100;

				// --- BEFORE DISCOUNT ---
				lines.push(centerText(ticketLabels.beforeDiscount));
				lines.push(separator('─'));

				// excl. VAT (before discount)
				lines.push(
					tableRow([
						{ text: ticketLabels.exclVat, width: 0.7, align: 'LEFT' },
						{
							text: formatPrice(priceInfo.totalExclVat, priceInfo.currency),
							width: 0.3,
							align: 'RIGHT'
						}
					])
				);

				// Each VAT rate (before discount)
				priceInfo.vatBreakdown.forEach((vat) => {
					lines.push(
						tableRow([
							{ text: `+ VAT ${vat.rate.toFixed(1)}%`, width: 0.7, align: 'LEFT' },
							{ text: formatPrice(vat.amount, priceInfo.currency), width: 0.3, align: 'RIGHT' }
						])
					);
				});

				// incl. VAT (before discount)
				lines.push(
					tableRow([
						{ text: ticketLabels.inclVat, width: 0.7, align: 'LEFT' },
						{
							text: formatPrice(totalBeforeDiscountSafe, priceInfo.currency),
							width: 0.3,
							align: 'RIGHT'
						}
					])
				);

				// --- AFTER DISCOUNT ---
				lines.push(separator('─'));
				lines.push(
					centerText(`${ticketLabels.afterDiscount} (-${discountPercentageSafe.toFixed(0)}%)`)
				);
				lines.push(separator('─'));

				// excl. VAT (after discount)
				lines.push(
					tableRow([
						{ text: ticketLabels.exclVat, width: 0.7, align: 'LEFT' },
						{
							text: formatPrice(priceInfo.totalExclVat * discountMultiplier, priceInfo.currency),
							width: 0.3,
							align: 'RIGHT'
						}
					])
				);

				// Each VAT rate (after discount)
				priceInfo.vatBreakdown.forEach((vat) => {
					lines.push(
						tableRow([
							{ text: `+ VAT ${vat.rate.toFixed(1)}%`, width: 0.7, align: 'LEFT' },
							{
								text: formatPrice(vat.amount * discountMultiplier, priceInfo.currency),
								width: 0.3,
								align: 'RIGHT'
							}
						])
					);
				});

				// incl. VAT (after discount) - final total, bold
				lines.push(
					tableRow([
						{ text: ticketLabels.inclVat, width: 0.7, align: 'LEFT', bold: true },
						{
							text: formatPrice(priceInfo.total, priceInfo.currency),
							width: 0.3,
							align: 'RIGHT',
							bold: true
						}
					])
				);
			} else {
				// NO DISCOUNT: Simple format

				// excl. VAT
				lines.push(
					tableRow([
						{ text: ticketLabels.exclVat, width: 0.7, align: 'LEFT' },
						{
							text: formatPrice(priceInfo.totalExclVat, priceInfo.currency),
							width: 0.3,
							align: 'RIGHT'
						}
					])
				);

				// Each VAT rate separately
				priceInfo.vatBreakdown.forEach((vat) => {
					lines.push(
						tableRow([
							{ text: `+ VAT ${vat.rate.toFixed(1)}%`, width: 0.7, align: 'LEFT' },
							{ text: formatPrice(vat.amount, priceInfo.currency), width: 0.3, align: 'RIGHT' }
						])
					);
				});

				// incl. VAT - final total, bold
				lines.push(
					tableRow([
						{ text: ticketLabels.inclVat, width: 0.7, align: 'LEFT', bold: true },
						{
							text: formatPrice(priceInfo.total, priceInfo.currency),
							width: 0.3,
							align: 'RIGHT',
							bold: true
						}
					])
				);
			}

			// shares payment info
			if (sharesInfo) {
				lines.push('');
				lines.push(separator('-'));
				lines.push(
					tableRow([
						{
							text: `! Partial payment ${sharesInfo.percentage}% :`,
							width: 0.7,
							align: 'LEFT',
							bold: true
						},
						{
							text: formatPrice(sharesInfo.amount, sharesInfo.currency),
							width: 0.3,
							align: 'RIGHT',
							bold: true
						}
					])
				);
			}

			// people count (from POS)
			if (peopleCount) {
				lines.push('');
				lines.push(
					tableRow([
						{ text: t('order.receipt.peopleCount') + ':', width: 0.7, align: 'LEFT' },
						{ text: String(peopleCount), width: 0.3, align: 'RIGHT' }
					])
				);
			}

			lines.push(separator('═'));
		} else {
			// Kitchen ticket (no prices) - unified format with global ticket
			lines.push('');
			if (useEscPos) {
				lines.push(ESC.DOUBLE_HEIGHT + bold(centerText(`TICKET ${poolLabel.toUpperCase()}`, 16)));
				if (generatedAt) {
					lines.push(ESC.DOUBLE_WIDTH + centerText(format(generatedAt, 'HH:mm'), 16) + ESC.NORMAL);
				}
			} else {
				lines.push(centerText(`TICKET ${poolLabel.toUpperCase()}`));
				if (generatedAt) {
					lines.push(centerText(format(generatedAt, 'HH:mm')));
				}
			}

			lines.push(separator('═'));

			tagGroups.forEach((group) => {
				if (group.tagNames.length > 0) {
					lines.push('');
					lines.push(separator('-'));
					const tagText = group.tagNames.join(', ').toUpperCase();
					wordWrap(tagText, ticketWidth).forEach((line) => {
						lines.push(line);
					});
					lines.push(separator('-'));
				}

				group.items.forEach((item) => {
					const itemName = item.product.name.toUpperCase();
					lines.push(
						tableRow([
							{ text: `${item.quantity}x`, width: 0.15, align: 'LEFT', bold: true },
							{ text: itemName, width: 0.85, align: 'LEFT', bold: true }
						])
					);

					renderVariationsAndNotes(item, lines, '');
				});
			});

			lines.push('');
			lines.push(separator('═'));
		}

		return lines.filter((line) => line !== undefined).join('\n');
	})();
</script>

<svelte:head>
	<style>
		/* Common styles for .printable (work on both screen and print) */
		.printable pre {
			margin: 0;
			padding: 0;
			font-size: 12px;
			line-height: 1.3;
			white-space: pre;
		}

		/* Company header with logo */
		.printable .ticket-header {
			display: flex;
			align-items: center;
			margin-bottom: 2mm;
		}

		.printable .ticket-header-logo {
			flex: 0 0 35%;
			padding-right: 2mm;
		}

		.printable .ticket-header-logo img {
			max-width: 100%;
			height: auto;
		}

		.printable .ticket-header-info {
			flex: 0 0 65%;
			text-align: center;
			font-size: 10px;
			line-height: 1.4;
		}

		.printable .ticket-header-info .company-name {
			font-weight: bold;
			font-size: 11px;
		}

		/* Header without logo - centered */
		.printable .ticket-header-centered {
			text-align: center;
			margin-bottom: 2mm;
			font-size: 10px;
			line-height: 1.4;
		}

		.printable .ticket-header-centered .company-name {
			font-weight: bold;
			font-size: 12px;
		}

		/* Be-Bop footer */
		.printable .bebop-footer {
			text-align: center;
			margin-top: 3mm;
			margin-bottom: 5mm; /* Space before tear line */
		}

		.printable .bebop-footer .powered-by {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 2mm;
			padding-left: 16mm;
		}

		.printable .bebop-footer .powered-by span {
			font-size: 10px;
		}

		.printable .bebop-footer .powered-by img {
			height: 8mm;
			width: auto;
			filter: grayscale(100%) contrast(150%);
		}

		.printable .bebop-footer .site-url {
			font-size: 9px;
			margin-top: 1mm;
			padding-left: 16mm;
		}

		/* Print-specific styles */
		@media print {
			@page {
				margin: 0;
				size: 58mm auto;
			}

			body {
				margin: 0 !important;
				padding: 0 !important;
			}

			.printable {
				display: block !important;
				position: absolute;
				left: 0;
				top: 0;
				width: 58mm;
				font-family: monospace;
				font-size: 12px;
				page-break-inside: avoid;
				break-inside: avoid;
			}
		}

		/* Screen-specific: hide by default (overridden by showOnScreen prop) */
		@media screen {
			.printable {
				display: none;
			}
		}
	</style>
</svelte:head>

<div
	class="printable"
	style={showOnScreen
		? 'display: block !important; position: relative; width: 58mm; font-family: monospace; font-size: 12px;'
		: ''}
>
	<!-- Company header with logo (flex layout) or centered (no logo) -->
	{#if companyInfo}
		{#if companyLogoUrl}
			<div class="ticket-header">
				<div class="ticket-header-logo">
					<img src={companyLogoUrl} alt="Logo" />
				</div>
				<div class="ticket-header-info">
					{#if companyInfo.businessName}
						<div class="company-name">{companyInfo.businessName.toUpperCase()}</div>
					{/if}
					{#if companyInfo.vatNumber}
						<div>VAT: {companyInfo.vatNumber}</div>
					{/if}
					{#if companyInfo.address?.street}
						<div>{companyInfo.address.street}</div>
					{/if}
					{#if companyInfo.address?.zip || companyInfo.address?.city}
						<div>
							{[companyInfo.address?.zip, companyInfo.address?.city].filter(Boolean).join(' ')}
						</div>
					{/if}
					{#if companyInfo.phone}
						<div>Tel: {companyInfo.phone}</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="ticket-header-centered">
				{#if companyInfo.businessName}
					<div class="company-name">{companyInfo.businessName.toUpperCase()}</div>
				{/if}
				{#if companyInfo.vatNumber}
					<div>VAT: {companyInfo.vatNumber}</div>
				{/if}
				{#if companyInfo.address?.street}
					<div>{companyInfo.address.street}</div>
				{/if}
				{#if companyInfo.address?.zip || companyInfo.address?.city}
					<div>
						{[companyInfo.address?.zip, companyInfo.address?.city].filter(Boolean).join(' ')}
					</div>
				{/if}
				{#if companyInfo.phone}
					<div>Tel: {companyInfo.phone}</div>
				{/if}
			</div>
		{/if}
	{/if}

	<!-- Ticket content -->
	<pre class="font-mono">{ticketContent}</pre>

	<!-- Be-Bop "powered by" footer -->
	{#if showBebopLogo}
		<div class="bebop-footer">
			<div class="powered-by">
				<span class="pt-3.5">Powered by</span>
				<img src={BEBOP_LOGO_BW} alt="Be-Bop" />
			</div>
			<div class="site-url">http://be-bop.io</div>
		</div>
	{/if}
</div>
