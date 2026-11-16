import { registerProcessor, type PaymentProcessorDefinition } from './pp';
import { ALL_PAYMENT_PROCESSOR_SLUGS } from '$lib/types/paymentProcessors';

/**
 * Every processor registers itself: the ones with their own folder in `$lib/payment-processors`,
 * and the ones still written as `contrib/PP<Name>.ts`.
 *
 * The hand-written import list this replaces had two failure modes: dropping a line removed a
 * payment method from the shop with no error anywhere, and reordering lines silently changed
 * which processor took live traffic.
 *
 * The exclusion is required, not decorative: the test files sit in `contrib/` next to the
 * processors, and `PP*.ts` matches `PPBitcoinNodeless.test.ts`.
 */
const modules = import.meta.glob<{ default: PaymentProcessorDefinition }>(
	[
		'/src/lib/payment-processors/*/processor.server.ts',
		'./contrib/PP*.ts',
		'!./contrib/**/*.test.ts'
	],
	{ eager: true }
);

const rank = (pp: PaymentProcessorDefinition) =>
	ALL_PAYMENT_PROCESSOR_SLUGS.indexOf(pp.meta.processor);

// In the manifest's order, so that nothing depends on how the files happen to be named.
for (const pp of Object.values(modules)
	.map((module) => module.default)
	.sort((a, b) => rank(a) - rank(b))) {
	registerProcessor(pp);
}
