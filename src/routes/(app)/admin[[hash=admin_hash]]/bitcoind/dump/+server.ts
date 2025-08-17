import { dumpWalletInfo } from '$lib/server/bitcoind';
import { error } from '@sveltejs/kit';
import { z } from 'zod';

import { env } from '$env/dynamic/private';
const ALLOW_DUMPING_WALLET = env.ALLOW_DUMPING_WALLET;

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
