import { error } from '@sveltejs/kit';
import { collections } from '$lib/server/database.js';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { fetchOrderForUser } from '../../../fetchOrderForUser.js';
import { orderItemPrice } from '$lib/types/Order.js';

export async function load({ params }) {
	const order = await fetchOrderForUser(params.id);
	if (!order) {
		throw error(404, 'Order not found');
	}
	const payment = order.payments.find((payment) => payment.id === params.paymentId);
	if (!payment) {
		throw error(404, 'Payment not found');
	}
	if (payment.status !== 'paid') {
		if (payment.invoice?.number) {
			throw error(400, 'Invoice already created on pending payment');
		}
	} else {
		if (!payment.invoice?.number) {
			throw error(400, 'Invoice not found');
		}
	}

	const sellerIdentity = runtimeConfig.sellerIdentity || order.sellerIdentity;
	if (!sellerIdentity) {
		throw error(400, 'Seller identity is not set');
	}

	const isSharesPayment = order.splitMode === 'shares';
	const relevantItems = isSharesPayment
		? order.items.filter((item) => item.quantity > 0)
		: order.items;

	const currency = order.currencySnapshot.main.totalPrice.currency;

	// group items by VAT rate + calculate totals
	const { itemsByRate, totalExclVat, vatByRate } = relevantItems.reduce(
		(acc, item) => {
			const rate = item.vatRate ?? 0;
			const itemTotal = orderItemPrice(item, 'main'); // excl. VAT
			const vatAmount = (itemTotal * rate) / 100;

			const rateItems = acc.itemsByRate.get(rate) ?? [];
			rateItems.push(item);
			acc.itemsByRate.set(rate, rateItems);
			acc.totalExclVat += itemTotal;
			acc.vatByRate.set(rate, (acc.vatByRate.get(rate) ?? 0) + vatAmount);

			return acc;
		},
		{
			itemsByRate: new Map<number, typeof relevantItems>(),
			totalExclVat: 0,
			vatByRate: new Map<number, number>()
		}
	);

	const totalVat = Array.from(vatByRate.values()).reduce((sum, v) => sum + v, 0);
	const totalInclVat = totalExclVat + totalVat;

	// VAT tagGroups
	const tagGroups = Array.from(itemsByRate.entries())
		.sort((a, b) => b[0] - a[0])
		.map(([rate, items]) => ({
			tagNames: [`VAT ${rate}%`],
			items: items.map((item) => ({
				product: { name: item.product.name },
				quantity: item.quantity,
				variations: item.chosenVariations
					? [{ text: Object.values(item.chosenVariations).join(' '), count: item.quantity }]
					: [],
				notes: []
			}))
		}));

	const paymentAmount = payment.currencySnapshot.main.price.amount;
	const totalSharesPayments = isSharesPayment
		? order.payments
				.filter((p) => p.status === 'paid')
				.reduce((sum, p) => sum + p.currencySnapshot.main.price.amount, 0)
		: 0;
	const sharesInfo =
		isSharesPayment && totalSharesPayments > 0
			? {
					percentage: Math.round((paymentAmount / totalSharesPayments) * 100),
					amount: paymentAmount,
					currency
			  }
			: undefined;

	const priceInfo = {
		itemPrices: relevantItems.map((item) => ({
			amount: orderItemPrice(item, 'main'),
			currency
		})),
		total: totalInclVat,
		totalExclVat,
		vatBreakdown: Array.from(vatByRate.entries()).map(([rate, amount]) => ({ rate, amount })),
		currency,
		...(order.currencySnapshot.main.discount
			? {
					totalBeforeDiscount: totalInclVat + order.currencySnapshot.main.discount.amount,
					discountPercentage:
						(order.currencySnapshot.main.discount.amount /
							(totalInclVat + order.currencySnapshot.main.discount.amount)) *
						100
			  }
			: {})
	};

	// Company info for ticket header
	const companyInfo = {
		businessName: sellerIdentity.businessName,
		address: sellerIdentity.address,
		vatNumber: sellerIdentity.vatNumber,
		phone: sellerIdentity.contact?.phone
	};

	// Company logo URL (priority: ticketLogoId → logo.pictureId → undefined)
	const companyLogoId = runtimeConfig.ticketLogoId || runtimeConfig.logo?.pictureId;
	const companyLogoUrl = companyLogoId ? `/picture/raw/${companyLogoId}/format/128` : undefined;

	const orderTab = order.orderTabSlug
		? await collections.orderTabs.findOne(
				{ slug: order.orderTabSlug },
				{ projection: { poolOpenedAt: 1 } }
		  )
		: null;

	return {
		order,
		payment,
		layoutReset: true,
		tagGroups,
		priceInfo,
		companyInfo,
		companyLogoUrl,
		sharesInfo,
		peopleCount: order.peopleCountFromPosUi,
		orderCreatedAt: order.createdAt,
		poolOpenedAt: orderTab?.poolOpenedAt
	};
}
