import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { defineProcessor } from '$lib/payment-processors/types';
import { runtimeConfig, type RuntimeConfig } from '$lib/server/runtime-config';
import { definePaymentProcessor } from './pp';

const declaration = defineProcessor({
	slug: 'swiss-bitcoin-pay',
	method: 'lightning',
	label: 'Fixture',
	priority: 10,
	configKey: 'swissBitcoinPay',
	config: { fields: { apiKey: { kind: 'secret' } } }
});

const implementation = {
	settlementCurrency: () => 'SAT' as const,
	createPayment: async () => ({ processor: 'swiss-bitcoin-pay' as const })
};

describe('definePaymentProcessor', () => {
	const saved = runtimeConfig.swissBitcoinPay;

	afterEach(() => {
		runtimeConfig.swissBitcoinPay = saved;
	});

	it('reads the slug and the method from the declaration', () => {
		expect(definePaymentProcessor(declaration, implementation).meta).toEqual({
			processor: 'swiss-bitcoin-pay',
			method: 'lightning'
		});
	});

	it('is enabled once every declared field is filled in', () => {
		const pp = definePaymentProcessor(declaration, implementation);

		runtimeConfig.swissBitcoinPay = { apiKey: '' };
		expect(pp.isEnabled()).toBe(false);

		runtimeConfig.swissBitcoinPay = { apiKey: 'key' };
		expect(pp.isEnabled()).toBe(true);
	});

	it('lets a processor decide for itself when it is enabled', () => {
		const pp = definePaymentProcessor(declaration, { ...implementation, isEnabled: () => true });

		runtimeConfig.swissBitcoinPay = { apiKey: '' };
		expect(pp.isEnabled()).toBe(true);
	});

	it('saves the declared fields only, and refuses an empty one', () => {
		const schema = definePaymentProcessor(declaration, implementation).configSchema;

		expect(schema?.parse({ apiKey: 'key', other: 'dropped' })).toEqual({ apiKey: 'key' });
		expect(schema?.safeParse({ apiKey: '' }).success).toBe(false);
		expect(schema?.safeParse({}).success).toBe(false);
	});

	it('blanks the secret fields for a role that may only read the settings', () => {
		expect(definePaymentProcessor(declaration, implementation).secretConfigFields).toEqual([
			'apiKey'
		]);
	});

	it('types the stored settings from the declared fields', () => {
		expectTypeOf<RuntimeConfig['swissBitcoinPay']>().toEqualTypeOf<{ apiKey: string }>();
	});
});
