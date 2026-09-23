import { env } from '$env/dynamic/private';
import { runtimeConfig } from './runtime-config';
import { getProcessorsForMethod } from './sdk/pp';
import {
	ALL_PAYMENT_PROCESSOR_SLUGS,
	type PaymentProcessorSlug
} from '$lib/types/paymentProcessors';

export const ALL_PAYMENT_METHODS = [
	'card',
	'bank-transfer',
	'bitcoin',
	'lightning',
	'point-of-sale',
	'free',
	'paypal',
	'taler',
	'osb',
	'custom'
] as const;
export type PaymentMethod = (typeof ALL_PAYMENT_METHODS)[number];

/**
 * The processors, from the manifest that already has to list them for its method, label and
 * rank. Keeping a second list here meant adding a provider in two places and hoping.
 * The hand-settled methods are processors too: they declare their currency, their expiry
 * and how they present, they simply have nothing to poll.
 */
export const ALL_PAYMENT_PROCESSORS = ALL_PAYMENT_PROCESSOR_SLUGS;
export type PaymentProcessor = PaymentProcessorSlug;

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
						// Availability is request-scoped for these two, so no processor can answer it.
						case 'point-of-sale':
							return opts?.hasPosOptions || opts?.includePOS;
						case 'free':
							return opts?.totalSatoshis === undefined;
						default:
							return getProcessorsForMethod(method).some((pp) => pp.isEnabled());
					}
				}
		  );
