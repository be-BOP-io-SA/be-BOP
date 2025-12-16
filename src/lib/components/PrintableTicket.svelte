<script lang="ts">
	import type { Product } from '$lib/types/Product';
	import type { Currency } from '$lib/types/Currency';
	import { format } from 'date-fns';

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

	// Optional: for customer receipts with prices
	export let priceInfo:
		| {
				itemPrices: Array<{ amount: number; currency: Currency }>;
				total: number;
				vatRate: number;
				currency: Currency;
		  }
		| undefined = undefined;

	$: ticketText = priceInfo
		? // Customer receipt with prices
		  tagGroups
				.flatMap((group, groupIdx) => {
					let itemIndex = 0;
					return [
						groupIdx === 0 ? `TICKET "${poolLabel}"` : '',
						groupIdx === 0 && generatedAt ? format(generatedAt, 'dd/MM/yyyy HH:mm') : '',
						groupIdx === 0 ? '\n' : '',
						...group.items.flatMap((item) => {
							const price = priceInfo.itemPrices[itemIndex++];
							return [
								`${item.quantity} X ${item.product.name.toUpperCase()}`,
								...item.variations.map((v) => `  ${v.count} ${v.text}`),
								...item.notes.map((note) => `  +${note}`),
								price ? `${price.currency} ${price.amount.toFixed(2)}` : '',
								''
							];
						}),
						...(groupIdx === tagGroups.length - 1
							? [
									'\n',
									'Total',
									`incl. VAT ${priceInfo.vatRate.toFixed(1)}%`,
									`${priceInfo.currency} ${priceInfo.total.toFixed(2)}`
							  ]
							: [])
					];
				})
				.filter(Boolean)
				.join('\n')
		: // Kitchen ticket without prices
		  tagGroups
				.flatMap((group) => [
					'',
					'',
					'',
					`TICKET ${poolLabel.toUpperCase()}`,
					...(generatedAt ? [format(generatedAt, 'HH:mm').replace(':', 'h').toUpperCase()] : []),
					'',
					...(group.tagNames.length > 0
						? [`--- ${group.tagNames.join(', ').toUpperCase()} ---`]
						: []),
					...group.items.flatMap((item) => [
						`${item.quantity} X ${item.product.name.toUpperCase()}`,
						...item.variations.map((v) => `${v.count} ${v.text}`),
						...item.notes.map((note) => `+${note}`)
					]),
					'',
					'',
					''
				])
				.join('\n');
</script>

<svelte:head>
	<style>
		@media print {
			@page {
				margin: 5mm;
			}

			body {
				margin: 0;
				padding: 0;
			}

			body * {
				visibility: hidden;
			}
			.printable,
			.printable * {
				visibility: visible;
			}
			.printable {
				position: absolute;
				left: 0;
				top: 0;
				width: 80mm;
				max-width: 100%;
			}
			.printable pre {
				margin: 0;
				padding: 0;
				font-size: 12px;
				line-height: 1.3;
			}
			.no-print {
				display: none !important;
			}
		}
	</style>
</svelte:head>

<div class="printable hidden print:block">
	<pre class="font-mono whitespace-pre-wrap">{ticketText}</pre>
</div>
