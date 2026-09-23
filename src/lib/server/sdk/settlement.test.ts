import { describe, expect, it } from 'vitest';
import { assertSettlementCovers, SettlementMismatch } from './settlement';

const sat = (amount: number) => ({ amount, currency: 'SAT' as const });
const btc = (amount: number) => ({ amount, currency: 'BTC' as const });
const eur = (amount: number) => ({ amount, currency: 'EUR' as const });

describe('assertSettlementCovers', () => {
	it('accepts a settlement in the currency the payment was priced in', () => {
		expect(() => assertSettlementCovers(sat(50_000), sat(50_000))).not.toThrow();
		expect(() => assertSettlementCovers(eur(12), eur(12))).not.toThrow();
		expect(() => assertSettlementCovers(eur(12), eur(15))).not.toThrow();
	});

	// The two bitcoin processors price in BTC and report in SAT. Demanding the same currency
	// here made every on-chain order fail to settle while the shop held the funds.
	it('reconciles a BTC price settled in SAT', () => {
		expect(() => assertSettlementCovers(btc(0.0005), sat(50_000))).not.toThrow();
		expect(() => assertSettlementCovers(btc(0.0005), sat(60_000))).not.toThrow();
	});

	it('still refuses a short settlement across that pair', () => {
		expect(() => assertSettlementCovers(btc(0.0005), sat(40_000))).toThrow(SettlementMismatch);
	});

	it('refuses a short settlement', () => {
		expect(() => assertSettlementCovers(eur(12), eur(11.99))).toThrow(SettlementMismatch);
		expect(() => assertSettlementCovers(sat(50_000), sat(49_999))).toThrow(SettlementMismatch);
	});

	it('refuses a settlement denominated in an unrelated currency', () => {
		expect(() => assertSettlementCovers(eur(12), sat(50_000))).toThrow(SettlementMismatch);
		expect(() => assertSettlementCovers(btc(0.0005), eur(12))).toThrow(SettlementMismatch);
	});

	// phoenixd nets its channel fee out of what it reports, so the fee counts toward the credit.
	it('counts a separately reported fee toward the credit', () => {
		expect(() => assertSettlementCovers(sat(50_000), sat(49_000), sat(1_000))).not.toThrow();
		expect(() => assertSettlementCovers(sat(50_000), sat(48_000), sat(1_000))).toThrow(
			SettlementMismatch
		);
	});
});
