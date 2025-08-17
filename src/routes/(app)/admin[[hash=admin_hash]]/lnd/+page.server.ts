import {
	lndActivateAutopilot,
	lndAutopilotActive,
	lndChannelsBalance,
	lndGetInfo,
	lndListChannels,
	lndRpc,
	lndWalletBalance
} from '$lib/server/lnd';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { updateLightningInvoiceDescription } from '$lib/server/actions.js';
import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';

import { env } from '$env/dynamic/private';
const ALLOW_LND_RPC = env.ALLOW_LND_RPC;

export async function load() {
	return {
		info: lndGetInfo(),
		lightningInvoiceDescription: runtimeConfig.lightningQrCodeDescription,
		walletBalance: lndWalletBalance(),
		channelsBalance: lndChannelsBalance(),
		channels: lndListChannels(),
		autopilotActive: lndAutopilotActive(),
		rpc: ALLOW_LND_RPC === 'true' || ALLOW_LND_RPC === '1'
	};
}

export const actions = {
	activateAutopilot: async function () {
		await lndActivateAutopilot();
	},
	rpc: async function ({ request }) {
		if (ALLOW_LND_RPC !== 'true' && ALLOW_LND_RPC !== '1') {
			throw error(403, 'Forbidden');
		}
		const formData = await request.formData();

		const parsed = z
			.object({ url: z.string(), method: z.enum(['GET', 'POST']), params: z.string() })
			.parse(Object.fromEntries(formData));

		const resp = await lndRpc(parsed.url, {
			method: parsed.method,
			body: parsed.params
		});

		if (!resp.ok) {
			return fail(400, {
				rpcFail: ((await resp.json()) as { message: string; details: unknown }).message
			});
		}
		return {
			rpcSuccess: await resp.json()
		};
	},
	updateLightningInvoiceDescription
};
