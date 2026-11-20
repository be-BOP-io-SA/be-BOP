import { registerProcessor, type PaymentProcessorDefinition } from './pp';
import { ALL_PAYMENT_PROCESSOR_SLUGS } from '$lib/types/paymentProcessors';

/**
 * Every processor registers itself from its folder in `$lib/payment-processors`.
 *
 * The hand-written import list this replaces had two failure modes: dropping a line removed a
 * payment method from the shop with no error anywhere, and reordering lines silently changed
 * which processor took live traffic.
 */
const modules = import.meta.glob<{ default: PaymentProcessorDefinition }>(
	'/src/lib/payment-processors/*/processor.server.ts',
	{ eager: true }
);

const rank = (pp: PaymentProcessorDefinition) =>
	ALL_PAYMENT_PROCESSOR_SLUGS.indexOf(pp.meta.processor);

// In the manifest's order, so that nothing depends on how the folders happen to be named.
for (const pp of Object.values(modules)
	.map((module) => module.default)
	.sort((a, b) => rank(a) - rank(b))) {
	registerProcessor(pp);
}
