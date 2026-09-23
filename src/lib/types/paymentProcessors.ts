import type { PaymentMethod } from '$lib/server/payment-methods';

/**
 * The static facts about every payment processor: what it is, what it serves, how it ranks,
 * and where its settings live.
 *
 * This file is a leaf on purpose. `adminLinks.ts` needs the list to build the back-office
 * navigation, and that file runs in the browser — it is imported by the admin layout and by
 * `Role.ts`, which keys the permission model off admin hrefs. So nothing here may import
 * `$lib/server/*` for a value; the one server import below is a type, erased at compile time,
 * the same way `types/Order.ts` already does it.
 *
 * Behaviour stays in `sdk/contrib/PP<Name>.ts`. This is only the registration data that a
 * dozen other files used to keep their own copy of.
 */
export interface ProcessorDeclaration {
	/** The payment method this processor serves. Several may serve the same one. */
	method: PaymentMethod;
	/** Shown in the admin navigation and in the preferred-processor picker. */
	label: string;
	/**
	 * Rank within the method when the shop expressed no preference. Lower wins.
	 * This used to be the order of the import statements in `pp-registry.ts`, which meant
	 * reordering those lines silently changed which acquirer took live card payments.
	 * Gaps of ten leave room to slot a processor in without renumbering its neighbours.
	 */
	priority: number;
	/** Its `runtimeConfig` key, which is also its `runtimeConfig` collection `_id`.
	 *  Absent for processors configured by environment variables, and for the hand-settled
	 *  methods, which have no credentials of their own. */
	configKey?: string;
	/**
	 * Keeps a hand-written settings page: these carry real domain UI — wallet management,
	 * RPC consoles, derivation paths — that no shared form can express.
	 */
	customAdminPage?: true;
}

export const PROCESSORS = {
	// --- card ---
	sumup: { method: 'card', label: 'SumUp', priority: 10, configKey: 'sumUp' },
	stripe: { method: 'card', label: 'Stripe', priority: 20, configKey: 'stripe' },

	// --- lightning ---
	'swiss-bitcoin-pay': {
		method: 'lightning',
		label: 'Swiss Bitcoin Pay',
		priority: 10,
		configKey: 'swissBitcoinPay'
	},
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
} as const satisfies Record<string, ProcessorDeclaration>;

export type PaymentProcessorSlug = keyof typeof PROCESSORS;

export const ALL_PAYMENT_PROCESSOR_SLUGS = Object.keys(PROCESSORS) as PaymentProcessorSlug[];

/** The admin page for a processor: its own if it has one, otherwise none yet. */
export function processorAdminHref(slug: PaymentProcessorSlug): string | undefined {
	const declaration = PROCESSORS[slug];
	if ('customAdminPage' in declaration || 'configKey' in declaration) {
		return `/admin/${slug}`;
	}
	return undefined;
}
