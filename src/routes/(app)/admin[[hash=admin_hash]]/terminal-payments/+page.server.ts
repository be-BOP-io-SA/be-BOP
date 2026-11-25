import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { collections } from '$lib/server/database';
import { setExternalRef } from '$lib/server/pos-payments';
import { employeeFromLocals } from '$lib/server/accounting-log';

/** The payments taken on terminals, newest first. */
export async function load({ url }) {
	const filter = url.searchParams.get('noRef') === '1' ? { noExternalRef: true } : {};
	const payments = await collections.posPayments
		.find(filter)
		.sort({ createdAt: -1 })
		.limit(200)
		.toArray();

	return {
		onlyNoRef: url.searchParams.get('noRef') === '1',
		payments: payments.map((p) => ({
			_id: p._id,
			number: p.number,
			// The public receipt of the payment, the ticket the customer scans.
			receiptPath: `/pos-receipt/${p.receiptToken}`,
			createdAt: p.createdAt,
			amount: p.amount,
			tip: p.tip,
			method: p.payment.method,
			processor: p.payment.processor,
			status: p.payment.status,
			externalRef: p.externalRef,
			noExternalRef: !!p.noExternalRef,
			externalRefHistory: p.externalRefHistory ?? [],
			overpayment: p.overpayment,
			device: p.device.name
		}))
	};
}

export const actions = {
	async setRef({ request, locals }) {
		const parsed = z
			.object({ id: z.string(), ref: z.string().trim().min(1).max(100) })
			.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) {
			throw error(400, 'Invalid reference');
		}
		await setExternalRef(
			parsed.data.id,
			parsed.data.ref,
			locals.user?.login,
			employeeFromLocals(locals).employee
		);
	}
};
