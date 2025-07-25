import { ALLOW_DUMPING_WALLET } from '$lib/server/env-config';
import { dumpWalletInfo } from '$lib/server/bitcoind';
import { error } from '@sveltejs/kit';
import { z } from 'zod';

export const POST = async (params) => {
	const { wallet } = z.object({ wallet: z.string() }).parse(await params.request.json());

	if (ALLOW_DUMPING_WALLET !== 'true') {
		throw error(403, 'Set ALLOW_DUMPING_WALLET to "true" in .env.local to enable this feature');
	}

	return new Response(JSON.stringify(await dumpWalletInfo(wallet), null, 2), {
		headers: {
			'Content-Type': 'application/json',
			'Content-Dispostion': 'attachment; filename=wallet.json'
		}
	});
};
