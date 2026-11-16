import type { PaymentMethod } from '$lib/server/payment-methods';
import * as declarations from '$lib/payment-processors';
import {
	configDefaults,
	type ProcessorConfigs,
	type ProcessorDeclaration
} from '$lib/payment-processors/types';

/**
 * The static facts about every payment processor: what it is, what it serves, how it ranks,
 * and where its settings live.
 *
 * This file is a leaf on purpose. `adminLinks.ts` needs the list to build the back-office
 * navigation, and that file runs in the browser — it is imported by the admin layout and by
 * `Role.ts`, which keys the permission model off admin hrefs. So nothing here may import
 * `$lib/server/*` for a value; the one server import above is a type, erased at compile time,
 * the same way `types/Order.ts` already does it.
 */
type Declared = (typeof declarations)[keyof typeof declarations];

// Processors still written as `sdk/contrib/PP<Name>.ts`. One with its own folder in
// `$lib/payment-processors` is declared there instead.
const LEGACY = {
	// --- card ---
	sumup: { method: 'card', label: 'SumUp', priority: 10, configKey: 'sumUp' },
	stripe: { method: 'card', label: 'Stripe', priority: 20, configKey: 'stripe' },

	// --- lightning ---
	'btcpay-server': {
		method: 'lightning',
		label: 'BTCPay Server',
		priority: 20,
		configKey: 'btcpayServer'
	},
	phoenixd: {
		method: 'lightning',
		label: 'PhoenixD',
		priority: 30,
		configKey: 'phoenixd',
		customAdminPage: true
	},
	lnd: { method: 'lightning', label: 'Lightning LND node', priority: 40, customAdminPage: true },
	blink: { method: 'lightning', label: 'Blink', priority: 50, configKey: 'blink' },

	// --- bitcoin ---
	'bitcoin-nodeless': {
		method: 'bitcoin',
		label: 'Bitcoin nodeless',
		priority: 10,
		configKey: 'bitcoinNodeless',
		customAdminPage: true
	},
	bitcoind: { method: 'bitcoin', label: 'Bitcoin core node', priority: 20, customAdminPage: true },

	// --- one provider each ---
	paypal: { method: 'paypal', label: 'Paypal', priority: 10, configKey: 'paypal' },
	taler: { method: 'taler', label: 'Taler', priority: 10, configKey: 'taler' },
	osb: { method: 'osb', label: 'OSB', priority: 10, configKey: 'osb' },

	// --- settled by hand, so nothing to configure and nothing to poll ---
	'point-of-sale': { method: 'point-of-sale', label: 'Point of sale', priority: 10 },
	free: { method: 'free', label: 'Free', priority: 10 },
	'bank-transfer': { method: 'bank-transfer', label: 'Bank transfer', priority: 10 },
	custom: { method: 'custom', label: 'Custom', priority: 10 }
} as const satisfies Record<string, Omit<ProcessorDeclaration, 'slug' | 'config'>>;

export const PROCESSORS = {
	...LEGACY,
	...(Object.fromEntries(
		Object.values(declarations).map((declaration) => [declaration.slug, declaration])
	) as { [D in Declared as D['slug']]: D })
};

export type PaymentProcessorSlug = keyof typeof PROCESSORS;

// The admin lists processors method by method, in this order.
const METHOD_RANK: Record<PaymentMethod, number> = {
	card: 0,
	lightning: 1,
	bitcoin: 2,
	paypal: 3,
	taler: 4,
	osb: 5,
	'point-of-sale': 6,
	free: 7,
	'bank-transfer': 8,
	custom: 9
};

export const ALL_PAYMENT_PROCESSOR_SLUGS = (Object.keys(PROCESSORS) as PaymentProcessorSlug[]).sort(
	(a, b) =>
		METHOD_RANK[PROCESSORS[a].method] - METHOD_RANK[PROCESSORS[b].method] ||
		PROCESSORS[a].priority - PROCESSORS[b].priority
);

/** The default settings of every processor declared in its own folder, by `configKey`. */
export function processorConfigDefaults(): ProcessorConfigs<Declared> {
	return Object.fromEntries(
		Object.values(declarations).map((declaration) => [
			declaration.configKey,
			configDefaults(declaration.config.fields)
		])
	) as ProcessorConfigs<Declared>;
}

/** The admin page for a processor: its own if it has one, otherwise none yet. */
export function processorAdminHref(slug: PaymentProcessorSlug): string | undefined {
	const declaration = PROCESSORS[slug];
	if ('customAdminPage' in declaration || 'configKey' in declaration) {
		return `/admin/${slug}`;
	}
	return undefined;
}
