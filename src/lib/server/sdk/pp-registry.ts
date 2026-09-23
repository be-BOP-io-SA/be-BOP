import { registerProcessor, type PaymentProcessorDefinition } from './pp';

/**
 * Every `contrib/PP<Name>.ts` registers itself. Priority comes from the manifest in
 * `types/paymentProcessors`, never from the order things load in, so there is nothing to
 * order here and nothing to forget.
 *
 * The hand-written import list this replaces had two failure modes: dropping a line removed a
 * payment method from the shop with no error anywhere, and reordering lines silently changed
 * which processor took live traffic.
 *
 * The exclusion is required, not decorative: the test files sit in `contrib/` next to the
 * processors, and `PP*.ts` matches `PPBitcoinNodeless.test.ts`.
 */
const modules = import.meta.glob<{ default: PaymentProcessorDefinition }>(
	['./contrib/PP*.ts', '!./contrib/**/*.test.ts'],
	{ eager: true }
);

for (const module of Object.values(modules)) {
	registerProcessor(module.default);
}
