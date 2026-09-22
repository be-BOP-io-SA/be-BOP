import { collections } from '$lib/server/database';
import { withdrawQrCodeSvg } from '$lib/server/lnurlWithdraw';
import { error } from '@sveltejs/kit';

/**
 * The withdraw's `LNURL1…` address as a scannable code, for a screen or a printer.
 *
 * Nothing is cached: a withdraw is spent once, and a code kept alive in a proxy would keep
 * offering sats that are no longer there.
 */
export const GET = async ({ params }) => {
	const withdraw = await collections.lnurlWithdrawals.findOne(
		{ _id: params.id },
		{ projection: { _id: 1 } }
	);

	if (!withdraw) {
		throw error(404, 'Withdraw not found');
	}

	return new Response(await withdrawQrCodeSvg(withdraw._id), {
		headers: {
			'content-type': 'image/svg+xml',
			'cache-control': 'no-store'
		}
	});
};
