import { afterEach, describe, expect, it, vi } from 'vitest';
import { phoenixdLookupInvoice } from './phoenixd';

describe('phoenixdLookupInvoice', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('reports the fee in satoshis, phoenixd sends millisatoshis', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					new Response(
						JSON.stringify({
							paymentHash: 'hash',
							preimage: 'preimage',
							invoice: 'lnbc1example',
							isPaid: true,
							receivedSat: 9_990,
							fees: 10_500,
							createdAt: 0
						})
					)
			)
		);

		const invoice = await phoenixdLookupInvoice('hash');

		expect(invoice).toMatchObject({ receivedSat: 9_990, feesSat: 10.5 });
	});
});
