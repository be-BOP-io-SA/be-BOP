import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { collections } from '$lib/server/database';
import { defaultConfig, runtimeConfig } from '$lib/server/runtime-config';
import {
	isValidAccountKey,
	networkOfKey,
	transparentAddress
} from '$lib/payment-processors/zcash-nodeless/addresses.server';
import { lightdInfo } from '$lib/payment-processors/zcash-nodeless/lightwalletd.server';

/** Enough to check them against the receiving addresses the wallet shows. */
const PREVIEWED_ADDRESSES = 5;

export async function load() {
	const config = runtimeConfig.zcashNodeless;

	return {
		zcashNodeless: config,
		nextAddresses: isValidAccountKey(config.xpub)
			? Array.from({ length: PREVIEWED_ADDRESSES }, (_, i) => ({
					index: config.derivationIndex + i,
					address: transparentAddress(config.xpub, config.derivationIndex + i)
			  }))
			: []
	};
}

export const actions = {
	async save({ request }) {
		const settings = z
			.object({
				xpub: z.string().trim(),
				primaryServer: z.string().trim().min(1),
				backupServer: z.string().trim()
			})
			.parse(Object.fromEntries(await request.formData()));

		// A spending key (xprv) is refused here too: only a public account key is ever taken.
		const network = networkOfKey(settings.xpub);
		if (!network || !isValidAccountKey(settings.xpub)) {
			return fail(400, { ...settings, error: 'invalidKey' as const });
		}

		for (const server of [settings.primaryServer, settings.backupServer].filter(Boolean)) {
			const chainName = await lightdInfo(server).then(
				(info) => info.chainName,
				() => null
			);
			if (chainName === null) {
				return fail(400, { ...settings, error: 'unreachable' as const, server });
			}
			if (chainName !== network) {
				return fail(400, { ...settings, error: 'otherNetwork' as const, server, chainName });
			}
		}

		if (settings.xpub === runtimeConfig.zcashNodeless.xpub) {
			// The same key keeps its stored index: writing back the one read here could rewind it
			// past an address a checkout reserved in the meantime.
			await collections.runtimeConfig.updateOne(
				{ _id: 'zcashNodeless' },
				{
					$set: {
						'data.primaryServer': settings.primaryServer,
						'data.backupServer': settings.backupServer,
						updatedAt: new Date()
					}
				}
			);
			runtimeConfig.zcashNodeless = { ...runtimeConfig.zcashNodeless, ...settings };
		} else {
			// Another key derives other addresses: its first one cannot have been given out yet.
			const data = { ...settings, derivationIndex: 0 };
			await collections.runtimeConfig.updateOne(
				{ _id: 'zcashNodeless' },
				{ $set: { data, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
				{ upsert: true }
			);
			runtimeConfig.zcashNodeless = data;
		}

		return { saved: true };
	},

	async delete() {
		await collections.runtimeConfig.deleteOne({ _id: 'zcashNodeless' });
		runtimeConfig.zcashNodeless = { ...defaultConfig.zcashNodeless };
	}
};
