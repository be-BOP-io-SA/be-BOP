import { describe, expect, it } from 'vitest';
import { orderItemPrice, orderItemPriceUndiscounted } from './Order';
import type { OrderItemInfoNeededForFinalPrice } from './Order';

describe('Order item price calculations', () => {
	// Mock order with various item configurations
	const items: OrderItemInfoNeededForFinalPrice[] = [
		// Basic item - no special conditions
		{
			product: {
				bookingSpec: undefined
			},
			quantity: 2,
			currencySnapshot: {
				main: { price: { amount: 100, currency: 'EUR' } },
				priceReference: { price: { amount: 110, currency: 'USD' } },
				secondary: { price: { amount: 90, currency: 'CHF' } },
				accounting: { price: { amount: 95, currency: 'EUR' } }
			}
		},
		// Item with discount percentage
		{
			product: {
				bookingSpec: undefined
			},
			quantity: 1,
			discountPercentage: 20,
			currencySnapshot: {
				main: { price: { amount: 200, currency: 'EUR' } },
				priceReference: { price: { amount: 220, currency: 'USD' } },
				secondary: { price: { amount: 180, currency: 'CHF' } },
				accounting: { price: { amount: 190, currency: 'EUR' } }
			}
		},
		// Item with custom price
		{
			product: {
				bookingSpec: undefined
			},
			quantity: 3,
			currencySnapshot: {
				main: {
					price: { amount: 150, currency: 'EUR' },
					customPrice: { amount: 120, currency: 'EUR' }
				},
				priceReference: {
					price: { amount: 165, currency: 'USD' },
					customPrice: { amount: 132, currency: 'USD' }
				},
				secondary: {
					price: { amount: 135, currency: 'CHF' },
					customPrice: { amount: 108, currency: 'CHF' }
				},
				accounting: {
					price: { amount: 142, currency: 'EUR' },
					customPrice: { amount: 114, currency: 'EUR' }
				}
			}
		},
		// Item with free quantity
		{
			product: {
				bookingSpec: undefined
			},
			quantity: 5,
			freeQuantity: 2,
			currencySnapshot: {
				main: { price: { amount: 50, currency: 'EUR' } },
				priceReference: { price: { amount: 55, currency: 'USD' } },
				secondary: { price: { amount: 45, currency: 'CHF' } },
				accounting: { price: { amount: 47, currency: 'EUR' } }
			}
		},
		// Booking item with time slots
		{
			product: {
				bookingSpec: { slotMinutes: 30 }
			},
			quantity: 1, // This will be overridden by booking calculation
			booking: {
				start: new Date('2025-01-01T10:00:00Z'),
				end: new Date('2025-01-01T12:00:00Z') // 2 hours = 120 minutes = 4 slots
			},
			currencySnapshot: {
				main: { price: { amount: 75, currency: 'EUR' } },
				priceReference: { price: { amount: 82, currency: 'USD' } },
				secondary: { price: { amount: 68, currency: 'CHF' } },
				accounting: { price: { amount: 71, currency: 'EUR' } }
			}
		},
		// Complex item: booking + discount + + free quantity
		{
			product: {
				bookingSpec: { slotMinutes: 15 }
			},
			quantity: 1, // Will be overridden by booking
			freeQuantity: 1,
			discountPercentage: 15,
			booking: {
				start: new Date('2025-01-01T14:00:00Z'),
				end: new Date('2025-01-01T15:30:00Z') // 1.5 hours = 90 minutes = 6 slots
			},
			currencySnapshot: {
				main: { price: { amount: 40, currency: 'EUR' } },
				priceReference: { price: { amount: 44, currency: 'USD' } },
				secondary: { price: { amount: 36, currency: 'CHF' } },
				accounting: { price: { amount: 38, currency: 'EUR' } }
			}
		},
		// Item with custom price and discount
		{
			product: {
				bookingSpec: undefined
			},
			quantity: 2,
			discountPercentage: 25,
			currencySnapshot: {
				main: {
					price: { amount: 100, currency: 'EUR' },
					customPrice: { amount: 80, currency: 'EUR' }
				},
				priceReference: {
					price: { amount: 110, currency: 'USD' },
					customPrice: { amount: 88, currency: 'USD' }
				},
				secondary: {
					price: { amount: 90, currency: 'CHF' },
					customPrice: { amount: 72, currency: 'CHF' }
				},
				accounting: {
					price: { amount: 95, currency: 'EUR' },
					customPrice: { amount: 76, currency: 'EUR' }
				}
			}
		}
	];

	describe('orderItemPriceUndiscounted', () => {
		it('should calculate basic item price without special conditions', () => {
			const item = items[0];
			expect(orderItemPriceUndiscounted(item, 'main')).toBe(200); // 100 * 2
			expect(orderItemPriceUndiscounted(item, 'priceReference')).toBe(220); // 110 * 2
			expect(orderItemPriceUndiscounted(item, 'secondary')).toBe(180); // 90 * 2
			expect(orderItemPriceUndiscounted(item, 'accounting')).toBe(190); // 95 * 2
		});

		it('should use custom price when available', () => {
			const item = items[2]; // Item with custom price
			expect(orderItemPriceUndiscounted(item, 'main')).toBe(360); // 120 * 3
			expect(orderItemPriceUndiscounted(item, 'priceReference')).toBe(396); // 132 * 3
			expect(orderItemPriceUndiscounted(item, 'secondary')).toBe(324); // 108 * 3
			expect(orderItemPriceUndiscounted(item, 'accounting')).toBe(342); // 114 * 3
		});

		it('should account for free quantity', () => {
			const item = items[3]; // Item with free quantity
			// quantity: 5, freeQuantity: 2, so paid quantity = 3
			expect(orderItemPriceUndiscounted(item, 'main')).toBe(150); // 50 * 3
			expect(orderItemPriceUndiscounted(item, 'priceReference')).toBe(165); // 55 * 3
			expect(orderItemPriceUndiscounted(item, 'secondary')).toBe(135); // 45 * 3
			expect(orderItemPriceUndiscounted(item, 'accounting')).toBe(141); // 47 * 3
		});

		it('should calculate booking-based quantity', () => {
			const item = items[4]; // Booking item
			// 120 minutes / 30 minutes per slot = 4 slots
			expect(orderItemPriceUndiscounted(item, 'main')).toBe(300); // 75 * 4
			expect(orderItemPriceUndiscounted(item, 'priceReference')).toBe(328); // 82 * 4
			expect(orderItemPriceUndiscounted(item, 'secondary')).toBe(272); // 68 * 4
			expect(orderItemPriceUndiscounted(item, 'accounting')).toBe(284); // 71 * 4
		});

		it('should handle complex scenario with booking, and free quantity', () => {
			const item = items[5]; // Complex item
			// 90 minutes / 15 minutes per slot = 6 slots
			// freeQuantity: 1, so paid quantity = 5
			expect(orderItemPriceUndiscounted(item, 'main')).toBe(200); // 40 * 5
			expect(orderItemPriceUndiscounted(item, 'priceReference')).toBe(220); // 44 * 5
			expect(orderItemPriceUndiscounted(item, 'secondary')).toBe(180); // 36 * 5
			expect(orderItemPriceUndiscounted(item, 'accounting')).toBe(190); // 38 * 5
		});

		it('should throw error for missing currency snapshot', () => {
			const item = items[0];
			expect(() =>
				orderItemPriceUndiscounted(
					item,
					'nonexistent' as unknown as 'main' | 'priceReference' | 'secondary' | 'accounting'
				)
			).toThrow('Currency snapshot nonexistent not found');
		});
	});

	describe('orderItemPrice', () => {
		it('should return same as undiscounted when no discount', () => {
			const item = items[0]; // No discount
			expect(orderItemPrice(item, 'main')).toBe(orderItemPriceUndiscounted(item, 'main'));
			expect(orderItemPrice(item, 'priceReference')).toBe(
				orderItemPriceUndiscounted(item, 'priceReference')
			);
			expect(orderItemPrice(item, 'secondary')).toBe(orderItemPriceUndiscounted(item, 'secondary'));
			expect(orderItemPrice(item, 'accounting')).toBe(
				orderItemPriceUndiscounted(item, 'accounting')
			);
		});

		it('should apply discount percentage correctly', () => {
			const item = items[1]; // 20% discount
			const undiscountedMain = orderItemPriceUndiscounted(item, 'main'); // 200
			expect(orderItemPrice(item, 'main')).toBe(160); // 200 * 0.8
			expect(undiscountedMain).toBe(200);

			const undiscountedReference = orderItemPriceUndiscounted(item, 'priceReference'); // 220
			expect(orderItemPrice(item, 'priceReference')).toBe(176); // 220 * 0.8
			expect(undiscountedReference).toBe(220);
		});

		it('should apply discount to custom price', () => {
			const item = items[6]; // Custom price with 25% discount
			// Custom price: 80 * 2 = 160, with 25% discount = 160 * 0.75 = 120
			expect(orderItemPrice(item, 'main')).toBe(120);

			// Custom price: 88 * 2 = 176, with 25% discount = 176 * 0.75 = 132
			expect(orderItemPrice(item, 'priceReference')).toBe(132);
		});

		it('should apply discount to complex scenario', () => {
			const item = items[5]; // Complex item with 15% discount
			const undiscountedMain = orderItemPriceUndiscounted(item, 'main'); // 200
			expect(orderItemPrice(item, 'main')).toBe(170); // 200 * 0.85
			expect(undiscountedMain).toBe(200);

			const undiscountedReference = orderItemPriceUndiscounted(item, 'priceReference'); // 220
			expect(orderItemPrice(item, 'priceReference')).toBe(187); // 220 * 0.85
			expect(undiscountedReference).toBe(220);
		});

		it('should handle zero discount percentage', () => {
			const itemWithZeroDiscount = {
				...items[0],
				discountPercentage: 0
			};
			expect(orderItemPrice(itemWithZeroDiscount, 'main')).toBe(
				orderItemPriceUndiscounted(itemWithZeroDiscount, 'main')
			);
		});

		it('should handle 100% discount', () => {
			const itemWithFullDiscount = {
				...items[0],
				discountPercentage: 100
			};
			expect(orderItemPrice(itemWithFullDiscount, 'main')).toBe(0);
		});
	});

	describe('edge cases', () => {
		it('should handle free quantity greater than total quantity', () => {
			const item = {
				...items[0],
				quantity: 2,
				freeQuantity: 5 // More free than total
			};
			expect(orderItemPriceUndiscounted(item, 'main')).toBe(0);
			expect(orderItemPrice(item, 'main')).toBe(0);
		});

		it('should handle booking with zero duration', () => {
			const item = {
				...items[4],
				booking: {
					start: new Date('2025-01-01T10:00:00Z'),
					end: new Date('2025-01-01T10:00:00Z') // Same time
				}
			};
			expect(orderItemPriceUndiscounted(item, 'main')).toBe(0); // 0 slots
		});

		it('should handle very small booking durations', () => {
			const item = {
				...items[4],
				booking: {
					start: new Date('2025-01-01T10:00:00Z'),
					end: new Date('2025-01-01T10:10:00Z') // 10 minutes, less than slot size (30 min)
				}
			};
			// 10 minutes / 30 minutes per slot = 0.33... slots, but should be calculated as fractional
			expect(orderItemPriceUndiscounted(item, 'main')).toBe(25); // 75 * (10/30)
		});
	});
});
