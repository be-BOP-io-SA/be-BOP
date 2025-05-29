import { env } from '$env/dynamic/private';
import { isBitcoinConfigured as isBitcoindConfigured } from './bitcoind';
import { isLndConfigured } from './lnd';
import { isPhoenixdConfigured } from './phoenixd';
import { runtimeConfig } from './runtime-config';
import { isSumupEnabled } from './sumup';
import { isStripeEnabled } from './stripe';
import { isPaypalEnabled } from './paypal';
import { isBitcoinNodelessConfigured } from './bitcoin-nodeless';
import { isSwissBitcoinPayConfigured } from './swiss-bitcoin-pay';

const ALL_PAYMENT_METHODS = [
	'card',
	'bank-transfer',
	'bitcoin',
	'lightning',
	'point-of-sale',
	'free',
	'paypal'
] as const;
export type PaymentMethod = (typeof ALL_PAYMENT_METHODS)[number];

export type PaymentProcessor =
	| 'sumup'
	| 'bitcoind'
	| 'lnd'
	| 'phoenixd'
	| 'swiss-bitcoin-pay'
	| 'stripe'
	| 'paypal'
	| 'bitcoin-nodeless';

export const paymentMethods = (opts?: {
	hasPosOptions?: boolean;
	includePOS?: boolean;
	includeDisabled?: boolean;
	totalSatoshis?: number;
}) =>
	env.VITEST
		? [...ALL_PAYMENT_METHODS]
		: [...new Set([...runtimeConfig.paymentMethods.order, ...ALL_PAYMENT_METHODS])].filter(
				(method) => {
					if (!opts?.includeDisabled && runtimeConfig.paymentMethods.disabled.includes(method)) {
						return false;
					}
					if (opts?.totalSatoshis !== undefined && opts.totalSatoshis === 0) {
						return method === 'free';
					}
					switch (method) {
						case 'card':
							return isSumupEnabled() || isStripeEnabled() || isPaypalEnabled();
						case 'paypal':
							return isPaypalEnabled();
						case 'bank-transfer':
							return runtimeConfig.sellerIdentity?.bank;
						case 'bitcoin':
							return isBitcoindConfigured || isBitcoinNodelessConfigured();
						case 'lightning':
							return isSwissBitcoinPayConfigured() || isLndConfigured() || isPhoenixdConfigured();
						case 'point-of-sale':
							return opts?.hasPosOptions || opts?.includePOS;
						case 'free':
							return opts?.totalSatoshis === undefined;
					}
				}
		  );
