import { getProcessor } from './pp';

const TEST_TIMEOUT_MS = 15_000;

/**
 * Lightweight PSP connectivity check used by the "Test connection" admin button on
 * each PSP configuration page (#2546).
 *
 * Calls the same `createPayment` SDK entrypoint a customer checkout would hit, but
 * with synthetic params (1 EUR, identifiable `orderId`/`paymentId`, `orderNumber: 0`).
 * No order or payment is persisted in our DB — the PSP-side artifact (Stripe
 * PaymentIntent, PayPal order, etc.) is left to expire on its own.
 *
 * The check therefore exercises the real network path + credentials. A success means
 * the configuration is good enough to take real payments; a failure tells the shopowner
 * to verify their credentials — we deliberately do NOT echo the raw provider error
 * back to the UI. Several PSPs reply with the submitted credential in their error body
 * (Stripe: "Invalid API Key provided: sk_..."), so a generic message is the only
 * future-proof way to avoid leaking secrets — we can't whitelist every PSP's format.
 * The raw error is still logged server-side via console.error for operator debugging.
 *
 * A hard 15s timeout protects against PSP SDKs that don't enforce their own (we hit
 * this on Swiss Bitcoin Pay where a bad API key just made the call hang indefinitely).
 */
export async function testProcessorConnection(
	processorName: string
): Promise<{ ok: boolean; reason?: string }> {
	const pp = getProcessor(processorName);
	if (!pp) {
		return { ok: false, reason: `Unknown processor: ${processorName}` };
	}
	if (!pp.isEnabled()) {
		return { ok: false, reason: 'Processor is not configured (missing credentials).' };
	}
	const testId = `be-bop-connection-test-${Date.now()}`;
	try {
		await Promise.race([
			pp.createPayment({
				orderId: testId,
				orderNumber: 0,
				paymentId: testId,
				toPay: { amount: 1, currency: 'EUR' }
			}),
			new Promise<never>((_, reject) =>
				setTimeout(
					() =>
						reject(
							new Error(
								`Test timed out after ${TEST_TIMEOUT_MS / 1000}s — provider did not respond`
							)
						),
					TEST_TIMEOUT_MS
				)
			)
		]);
		return { ok: true };
	} catch (err) {
		console.error(`testProcessorConnection(${processorName}) raw error:`, err);
		const isTimeout = err instanceof Error && err.message.startsWith('Test timed out');
		return {
			ok: false,
			reason: isTimeout
				? `The provider did not respond within ${TEST_TIMEOUT_MS / 1000}s. Please try again later.`
				: 'Connection failed. Please verify the saved credentials and try again.'
		};
	}
}
