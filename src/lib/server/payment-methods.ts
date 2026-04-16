import { env } from '$env/dynamic/private';
import { runtimeConfig } from './runtime-config';
import { getProcessorsForMethod } from './sdk/pp';

export const ALL_PAYMENT_METHODS = [
	'card',
	'bank-transfer',
	'bitcoin',
	'lightning',
	'point-of-sale',
	'free',
	'paypal',
	'taler',
	'osb'
] as const;
export type PaymentMethod = (typeof ALL_PAYMENT_METHODS)[number];

export const ALL_PAYMENT_PROCESSORS = [
	'bitcoin-nodeless',
	'bitcoind',
	'btcpay-server',
	'lnd',
	'paypal',
	'phoenixd',
	'stripe',
	'sumup',
	'swiss-bitcoin-pay',
	'taler',
	'osb'
] as const;
export type PaymentProcessor = (typeof ALL_PAYMENT_PROCESSORS)[number];

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
						case 'paypal':
						case 'bitcoin':
						case 'lightning':
						case 'taler':
						case 'osb':
							return getProcessorsForMethod(method).some((pp) => pp.isEnabled());
						case 'bank-transfer':
							return runtimeConfig.sellerIdentity?.bank;
						case 'point-of-sale':
							return opts?.hasPosOptions || opts?.includePOS;
						case 'free':
							return opts?.totalSatoshis === undefined;
					}
				}
		  );
