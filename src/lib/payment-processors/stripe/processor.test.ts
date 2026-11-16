import { afterEach, describe, expect, it } from 'vitest';
import { runtimeConfig } from '$lib/server/runtime-config';
import type { Order } from '$lib/types/Order';
import PPStripe from './processor.server';

const payment = { clientSecret: 'pi_1_secret_2' } as Order['payments'][number];

describe('what the Stripe payment form receives', () => {
	const saved = { ...runtimeConfig.stripe };

	afterEach(() => {
		runtimeConfig.stripe = { ...saved };
	});

	it('is the public key of the shop and the client secret of the payment', () => {
		runtimeConfig.stripe = { ...saved, secretKey: 'sk_test', publicKey: 'pk_test' };

		expect(PPStripe.payData(payment)).toEqual({
			publicKey: 'pk_test',
			clientSecret: 'pi_1_secret_2'
		});
	});

	// The form opens on a public key: a payment made without the secret key would never settle.
	it('carries no public key once the shop removed its secret key', () => {
		runtimeConfig.stripe = { ...saved, secretKey: '', publicKey: 'pk_test' };

		expect(PPStripe.payData(payment).publicKey).toBe('');
	});
});
