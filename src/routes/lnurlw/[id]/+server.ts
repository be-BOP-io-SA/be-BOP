import { json } from '@sveltejs/kit';
import { collections } from '$lib/server/database';
import { checkWithdrawReadiness, withdrawUrls } from '$lib/server/lnurlWithdraw';

/**
 * What a wallet reads when it scans the code (LUD-03).
 *
 * Everything the protocol allows us to say goes through the same envelope: a refusal is
 * `{"status":"ERROR","reason":…}` with HTTP 200, because wallets treat a non-200 as the service
 * being down and show that instead of the reason.
 */
export const GET = async ({ params }) => {
	const withdraw = await collections.lnurlWithdrawals.findOne({ _id: params.id });

	if (!withdraw) {
		return json({ status: 'ERROR', reason: 'Unknown withdraw' });
	}
	if (withdraw.status === 'paid') {
		return json({ status: 'ERROR', reason: 'Withdraw is spent' });
	}
	if (withdraw.status === 'paying') {
		return json({ status: 'ERROR', reason: 'Withdraw is being paid' });
	}
	if (withdraw.expiresAt <= new Date()) {
		return json({ status: 'ERROR', reason: 'Withdraw has expired' });
	}

	// Asked again here: the node may have lost its channel or spent its balance since the code
	// was printed, and a wallet must not be handed a range the shop can no longer honour.
	const readiness = await checkWithdrawReadiness(withdraw.maxSat);
	if (!readiness.ready) {
		return json({ status: 'ERROR', reason: readiness.message });
	}

	const { url } = withdrawUrls(withdraw._id);

	return json({
		tag: 'withdrawRequest',
		callback: `${url}/cb`,
		k1: withdraw.k1,
		defaultDescription: withdraw.description,
		// The protocol counts in millisatoshis; the shop counts in sats.
		minWithdrawable: withdraw.minSat * 1000,
		maxWithdrawable: withdraw.maxSat * 1000
	});
};
