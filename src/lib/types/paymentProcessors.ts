import type { PaymentMethod } from '$lib/server/payment-methods';
import * as declarations from '$lib/payment-processors';
import { configDefaults, type ProcessorConfigs } from '$lib/payment-processors/types';

/**
 * The static facts about every payment processor: what it is, what it serves, how it ranks,
 * and where its settings live. Each is read from the declaration in the processor's folder.
 *
 * This file is a leaf on purpose. `adminLinks.ts` needs the list to build the back-office
 * navigation, and that file runs in the browser — it is imported by the admin layout and by
 * `Role.ts`, which keys the permission model off admin hrefs. So nothing here may import
 * `$lib/server/*` for a value; the one server import above is a type, erased at compile time,
 * the same way `types/Order.ts` already does it.
 */
type Declared = (typeof declarations)[keyof typeof declarations];

export const PROCESSORS = Object.fromEntries(
	Object.values(declarations).map((declaration) => [declaration.slug, declaration])
) as { [D in Declared as D['slug']]: D };

export type PaymentProcessorSlug = keyof typeof PROCESSORS;

// The admin lists processors method by method, in this order.
const METHOD_RANK: Record<PaymentMethod, number> = {
	card: 0,
	lightning: 1,
	bitcoin: 2,
	// Right after bitcoin, without renumbering the others.
	zcash: 2.5,
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

/** The default settings of every processor that declares its fields, by `configKey`. */
export function processorConfigDefaults(): ProcessorConfigs<Declared> {
	return Object.fromEntries(
		Object.values(declarations).flatMap((declaration) =>
			'config' in declaration
				? [[declaration.configKey, configDefaults(declaration.config.fields)]]
				: []
		)
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
