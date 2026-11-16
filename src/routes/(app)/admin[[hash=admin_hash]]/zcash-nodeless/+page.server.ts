import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { collections } from '$lib/server/database';
import { saveConfirmationThresholds } from '$lib/payment-processors/zcash-nodeless/confirmations.server';
import { defaultConfig, runtimeConfig } from '$lib/server/runtime-config';
import { isUniqueConstraintError } from '$lib/server/utils/isUniqueConstraintError';
import {
	isValidAccountKey,
	MAX_NON_HARDENED_INDEX,
	networkOfKey,
	transparentAddress
} from '$lib/payment-processors/zcash-nodeless/addresses.server';
import {
	isAddressUsed,
	lightdInfo
} from '$lib/payment-processors/zcash-nodeless/lightwalletd.server';

/** Enough to check them against the receiving addresses the wallet shows. */
const PREVIEWED_ADDRESSES = 5;
const ADDRESS_CHECK_TIMEOUT_MS = 3000;

type AddressSupply = 'enough' | 'low' | 'last' | 'exhausted';

function addressSupplyOf(derivableCount: number): AddressSupply {
	if (derivableCount === 0) {
		return 'exhausted';
	}
	if (derivableCount === 1) {
		return 'last';
	}
	return derivableCount < PREVIEWED_ADDRESSES ? 'low' : 'enough';
}

// Never replaces a config that has a key: rewinding its stored index would reuse addresses.
async function storeNewConfig(data: typeof runtimeConfig.zcashNodeless): Promise<boolean> {
	const replaced = await collections.runtimeConfig.updateOne(
		{ _id: 'zcashNodeless', 'data.xpub': { $in: ['', null] } },
		{ $set: { data, updatedAt: new Date() } }
	);
	if (!replaced.matchedCount) {
		try {
			await collections.runtimeConfig.insertOne({
				_id: 'zcashNodeless',
				data,
				updatedAt: new Date()
			});
		} catch (err) {
			if (isUniqueConstraintError(err)) {
				return false;
			}
			throw err;
		}
	}
	runtimeConfig.zcashNodeless = data;
	return true;
}

/** Both servers must answer, on the network of the key. */
async function serversError(network: string, servers: string[]) {
	for (const server of servers.filter(Boolean)) {
		const chainName = await lightdInfo(server).then(
			(info) => info.chainName,
			() => null
		);
		if (chainName === null) {
			return { error: 'unreachable' as const, server };
		}
		if (chainName !== network) {
			return { error: 'otherNetwork' as const, server, chainName };
		}
	}
	return null;
}

export async function load() {
	const config = runtimeConfig.zcashNodeless;
	const thresholds = runtimeConfig.zcashConfirmationBlocksThresholds;

	if (!isValidAccountKey(config.xpub)) {
		return {
			zcashNodeless: config,
			nextAddresses: [],
			hasAlreadyUsedNextAddresses: false,
			addressSupply: 'enough' as AddressSupply,
			maxDerivationIndex: MAX_NON_HARDENED_INDEX,
			zcashConfirmationBlocksThresholds: thresholds
		};
	}

	const derivableCount = Math.max(
		0,
		Math.min(PREVIEWED_ADDRESSES, MAX_NON_HARDENED_INDEX - config.derivationIndex + 1)
	);
	const nextAddresses = await Promise.all(
		Array.from({ length: derivableCount }, async (_, i) => {
			const index = config.derivationIndex + i;
			const address = transparentAddress(config.xpub, index);
			const isUsed = await Promise.race([
				isAddressUsed(address),
				new Promise<false>((resolve) => setTimeout(() => resolve(false), ADDRESS_CHECK_TIMEOUT_MS))
			]);
			return { address, isUsed, index };
		})
	);

	return {
		zcashNodeless: config,
		nextAddresses,
		hasAlreadyUsedNextAddresses: nextAddresses.some((address) => address.isUsed),
		addressSupply: addressSupplyOf(derivableCount),
		maxDerivationIndex: MAX_NON_HARDENED_INDEX,
		zcashConfirmationBlocksThresholds: thresholds
	};
}

export const actions = {
	async initialize({ request }) {
		const formData = await request.formData();
		const settings = z
			.object({
				xpub: z.string().trim(),
				primaryServer: z.string().trim().min(1),
				backupServer: z.string().trim(),
				derivationIndex: z.number({ coerce: true }).int().min(0).max(MAX_NON_HARDENED_INDEX),
				skipUsedAddresses: z.boolean({ coerce: true }).default(false)
			})
			.parse(Object.fromEntries(formData));

		// A spending key (xprv) is refused here too: only a public account key is ever taken.
		const network = networkOfKey(settings.xpub);
		if (!network || !isValidAccountKey(settings.xpub)) {
			return fail(400, { ...settings, error: 'invalidKey' as const });
		}
		const serverError = await serversError(network, [
			settings.primaryServer,
			settings.backupServer
		]);
		if (serverError) {
			return fail(400, { ...settings, ...serverError });
		}

		if (!(await storeNewConfig(settings))) {
			return fail(409, { ...settings, alreadySetUp: true });
		}
	},

	async update({ request }) {
		const formData = await request.formData();
		const settings = z
			.object({
				primaryServer: z.string().trim().min(1),
				backupServer: z.string().trim(),
				skipUsedAddresses: z.boolean({ coerce: true }).default(false)
			})
			.parse(Object.fromEntries(formData));

		const network = networkOfKey(runtimeConfig.zcashNodeless.xpub);
		if (network) {
			const serverError = await serversError(network, [
				settings.primaryServer,
				settings.backupServer
			]);
			if (serverError) {
				return fail(400, { ...settings, ...serverError });
			}
		}

		// The stored index is left alone: writing back the one read here could rewind it past an
		// address a checkout reserved in the meantime.
		await collections.runtimeConfig.updateOne(
			{ _id: 'zcashNodeless' },
			{
				$set: {
					'data.primaryServer': settings.primaryServer,
					'data.backupServer': settings.backupServer,
					'data.skipUsedAddresses': settings.skipUsedAddresses,
					updatedAt: new Date()
				}
			}
		);
		runtimeConfig.zcashNodeless = { ...runtimeConfig.zcashNodeless, ...settings };
	},

	async delete() {
		await collections.runtimeConfig.deleteOne({ _id: 'zcashNodeless' });
		runtimeConfig.zcashNodeless = { ...defaultConfig.zcashNodeless };
	},

	async thresholds({ request }) {
		await saveConfirmationThresholds(await request.formData());
	}
};
