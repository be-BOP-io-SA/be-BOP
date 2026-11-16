import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { configDefaults, defineProcessor, payData } from '$lib/payment-processors/types';
import { runtimeConfig, type RuntimeConfig } from '$lib/server/runtime-config';
import type { Currency } from '$lib/types/Currency';
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
		expectTypeOf<RuntimeConfig['stripe']>().toEqualTypeOf<{
			secretKey: string;
			publicKey: string;
			currency: Currency;
		}>();
	});
});

describe('a processor that shows its own payment form', () => {
	const withForm = defineProcessor({ ...declaration, pay: payData<{ token: string }>() });

	it('sends the form what the declaration says it takes', () => {
		const pp = definePaymentProcessor(withForm, {
			...implementation,
			payData: (payment) => ({ token: payment.checkoutId ?? '' })
		});

		expectTypeOf(pp.payData).returns.toEqualTypeOf<{ token: string }>();
	});

	it('refuses, at compile time, a form left without its data', () => {
		// @ts-expect-error `pay` is declared, so pnpm check fails without `payData`
		const pp = definePaymentProcessor(withForm, implementation);

		expect(pp.payData).toBeUndefined();
	});

	it('refuses, at compile time, data for a form that is not declared', () => {
		const pp = definePaymentProcessor(declaration, {
			...implementation,
			// @ts-expect-error no `pay` in the declaration, so nothing would ever read this
			payData: () => ({ token: '' })
		});

		expect(pp.meta.processor).toBe('swiss-bitcoin-pay');
	});
});

describe('a processor that settles in a currency the shop picks', () => {
	const card = defineProcessor({
		slug: 'stripe',
		method: 'card',
		label: 'Fixture',
		priority: 10,
		configKey: 'stripe',
		config: {
			fields: {
				secretKey: { kind: 'secret', prefix: 'sk_' },
				currency: { kind: 'currency', default: 'CHF' }
			}
		}
	});
	const pp = definePaymentProcessor(card, {
		createPayment: async () => ({ processor: 'stripe' as const })
	});
	const saved = { ...runtimeConfig.stripe };

	afterEach(() => {
		runtimeConfig.stripe = { ...saved };
	});

	it('starts on the declared currency, with its other fields empty', () => {
		expect(configDefaults(card.config.fields)).toEqual({ secretKey: '', currency: 'CHF' });
	});

	it('settles in the currency the shop picked', () => {
		runtimeConfig.stripe.currency = 'USD';

		expect(pp.settlementCurrency()).toBe('USD');
	});

	it('is not enabled by its currency alone, which is never empty', () => {
		runtimeConfig.stripe = { ...saved, secretKey: '', currency: 'CHF' };
		expect(pp.isEnabled()).toBe(false);

		runtimeConfig.stripe.secretKey = 'sk_test';
		expect(pp.isEnabled()).toBe(true);
	});

	it('refuses a key without the declared prefix, and a currency that is not fiat', () => {
		const schema = pp.configSchema;

		expect(schema?.safeParse({ secretKey: 'sk_test', currency: 'USD' }).success).toBe(true);
		expect(schema?.safeParse({ secretKey: 'pk_test', currency: 'USD' }).success).toBe(false);
		expect(schema?.safeParse({ secretKey: 'sk_test', currency: 'SAT' }).success).toBe(false);
		expect(schema?.safeParse({ secretKey: 'sk_test' }).success).toBe(false);
	});
});

describe('a processor with a checkbox, an optional field and a server address', () => {
	const hosted = defineProcessor({
		slug: 'taler',
		method: 'taler',
		label: 'Fixture',
		priority: 10,
		configKey: 'taler',
		config: {
			fields: {
				backendUrl: { kind: 'text', stripTrailingSlashes: true },
				signingKey: { kind: 'secret', optional: true },
				sandbox: { kind: 'boolean' }
			}
		}
	});
	const pp = definePaymentProcessor(hosted, {
		settlementCurrency: () => 'CHF' as const,
		createPayment: async () => ({ processor: 'taler' as const })
	});
	const saved = { ...runtimeConfig.taler };

	afterEach(() => {
		runtimeConfig.taler = { ...saved };
	});

	it('starts with the box unchecked', () => {
		expect(configDefaults(hosted.config.fields)).toEqual({
			backendUrl: '',
			signingKey: '',
			sandbox: false
		});
	});

	// A browser posts nothing for an unchecked box, and nothing must not read as an error.
	it('reads a missing checkbox as unchecked, and a missing optional field as empty', () => {
		expect(pp.configSchema?.parse({ backendUrl: 'https://taler.example' })).toEqual({
			backendUrl: 'https://taler.example',
			signingKey: '',
			sandbox: false
		});
		expect(
			pp.configSchema?.parse({ backendUrl: 'https://taler.example', sandbox: 'true' })
		).toMatchObject({ sandbox: true });
	});

	it('stores a server address without its trailing slashes', () => {
		expect(pp.configSchema?.parse({ backendUrl: 'https://taler.example//' })).toMatchObject({
			backendUrl: 'https://taler.example'
		});
	});

	it('is enabled without its optional field, whatever the checkbox says', () => {
		Object.assign(runtimeConfig.taler, { backendUrl: '', signingKey: 'key', sandbox: true });
		expect(pp.isEnabled()).toBe(false);

		Object.assign(runtimeConfig.taler, { backendUrl: 'https://taler.example', signingKey: '' });
		expect(pp.isEnabled()).toBe(true);
	});

	it('types a checkbox as a boolean', () => {
		expectTypeOf<RuntimeConfig['paypal']>().toEqualTypeOf<{
			clientId: string;
			secret: string;
			sandbox: boolean;
			currency: Currency;
		}>();
	});
});
