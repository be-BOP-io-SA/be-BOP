import { describe, expect, it } from 'vitest';
import {
	evaluateDiscountConditions,
	isPublicZeroCriteriaDiscount,
	publicDiscountPriceSnapshot
} from './discount';
import type { DiscountContext } from './discount';
import type { Discount } from '$lib/types/Discount';

/** Minimal valid public percentage discount; override any field per test. */
function discount(overrides: Record<string, unknown> = {}): Discount {
	return {
		_id: 'd1',
		name: 'Test',
		productIds: [],
		wholeCatalog: true,
		beginsAt: new Date('2026-01-01T00:00:00.000Z'),
		endsAt: null,
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		updatedAt: new Date('2026-01-01T00:00:00.000Z'),
		mode: 'percentage',
		percentage: 25,
		...overrides
	} as Discount;
}

describe('isPublicZeroCriteriaDiscount', () => {
	it('is true for a whole-catalog percentage discount with no conditions', () => {
		expect(isPublicZeroCriteriaDiscount(discount())).toBe(true);
	});

	it('is true when targeting specific products (no whole-catalog) with no conditions', () => {
		expect(
			isPublicZeroCriteriaDiscount(discount({ wholeCatalog: false, productIds: ['p1'] }))
		).toBe(true);
	});

	it('treats empty condition arrays as "no condition"', () => {
		expect(
			isPublicZeroCriteriaDiscount(
				discount({ subscriptionIds: [], channels: [], requiredTagIds: [] })
			)
		).toBe(true);
	});

	it('is false when it targets nothing (no whole-catalog, no products)', () => {
		expect(isPublicZeroCriteriaDiscount(discount({ wholeCatalog: false, productIds: [] }))).toBe(
			false
		);
	});

	it('is false for a freeProducts discount', () => {
		expect(
			isPublicZeroCriteriaDiscount(
				discount({ mode: 'freeProducts', quantityPerProduct: { p1: 1 } })
			)
		).toBe(false);
	});

	it.each([
		['promoCode', { promoCode: 'SAVE' }],
		['subscriptionIds', { subscriptionIds: ['sub1'] }],
		['channels', { channels: ['web'] }],
		['paymentMethods', { paymentMethods: ['cash'] }],
		['deliveryCountry', { deliveryCountry: 'FR' }],
		['billingCountry', { billingCountry: 'FR' }],
		['contactAddresses', { contactAddresses: ['a@b.com'] }],
		['requiredTagIds', { requiredTagIds: ['t1'] }],
		[
			'productCombinations',
			{ productCombinations: [{ products: [{ productId: 'p', quantity: 1 }] }] }
		]
	])('is false when %s is set', (_label, override) => {
		expect(isPublicZeroCriteriaDiscount(discount(override))).toBe(false);
	});
});

describe('publicDiscountPriceSnapshot', () => {
	it('captures the fields needed to reconstruct the public price timeline', () => {
		const begins = new Date('2026-03-01T00:00:00.000Z');
		const ends = new Date('2026-03-31T00:00:00.000Z');
		const d = discount({
			percentage: 30,
			beginsAt: begins,
			endsAt: ends,
			wholeCatalog: false,
			productIds: ['p1', 'p2']
		}) as Extract<Discount, { mode: 'percentage' }>;

		expect(publicDiscountPriceSnapshot(d)).toEqual({
			percentage: 30,
			beginsAt: begins,
			endsAt: ends,
			wholeCatalog: false,
			productIds: ['p1', 'p2']
		});
	});
});

/** Cart context with no conditions met beyond what a test sets. */
function context(overrides: Partial<DiscountContext> = {}): DiscountContext {
	return {
		userSubscriptionIds: [],
		userContactAddresses: [],
		cartItems: [],
		isLoggedIn: false,
		...overrides
	};
}

describe('evaluateDiscountConditions — required subscription', () => {
	const membership = discount({ subscriptionIds: ['membership'] });

	it('passes when the subscription is already active', () => {
		expect(
			evaluateDiscountConditions(membership, context({ userSubscriptionIds: ['membership'] }))
		).toBe(true);
	});

	it('fails when the customer has no such subscription', () => {
		expect(evaluateDiscountConditions(membership, context())).toBe(false);
	});

	// #2718: without the opt-in, a subscription sitting in the cart is not a subscription the
	// customer holds — an existing members-only discount must keep meaning paid-up members.
	it('ignores the subscription sitting in the cart by default', () => {
		expect(
			evaluateDiscountConditions(
				membership,
				context({ cartItems: [{ productId: 'membership', quantity: 1 }] })
			)
		).toBe(false);
	});

	it('accepts the subscription sitting in the cart once the shop opts in', () => {
		expect(
			evaluateDiscountConditions(
				discount({ subscriptionIds: ['membership'], acceptSubscriptionInCart: true }),
				context({ cartItems: [{ productId: 'membership', quantity: 1 }] })
			)
		).toBe(true);
	});

	it('still fails with the opt-in when neither the cart nor the customer carries it', () => {
		expect(
			evaluateDiscountConditions(
				discount({ subscriptionIds: ['membership'], acceptSubscriptionInCart: true }),
				context({ cartItems: [{ productId: 'something-else', quantity: 1 }] })
			)
		).toBe(false);
	});
});

describe('evaluateDiscountConditions — required product combinations', () => {
	// #2718: combinations gate the discount and are matched against the cart, so a subscription
	// works there like any other line once the admin form lets it be picked.
	const combo = discount({
		productCombinations: [{ products: [{ productId: 'membership', quantity: 1 }] }]
	});

	it('matches a subscription listed in a required combination', () => {
		expect(
			evaluateDiscountConditions(
				combo,
				context({ cartItems: [{ productId: 'membership', quantity: 1 }] })
			)
		).toBe(true);
	});

	it('does not match when the combination is absent from the cart', () => {
		expect(evaluateDiscountConditions(combo, context())).toBe(false);
	});
});
