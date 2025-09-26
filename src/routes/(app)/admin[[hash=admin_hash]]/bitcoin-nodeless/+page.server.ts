import {
	bip84Address,
	isBitcoinNodelessConfigured,
	isZPubValid,
	isAddressUsed
} from '$lib/server/bitcoin-nodeless.js';
import { collections } from '$lib/server/database.js';
import { defaultConfig, runtimeConfig } from '$lib/server/runtime-config';
import { error } from '@sveltejs/kit';
import { z } from 'zod';

export async function load() {
	if (!isBitcoinNodelessConfigured()) {
		return {
			bitcoinNodeless: runtimeConfig.bitcoinNodeless,
			nextAddresses: [],
			hasAlreadyUsedNextAddresses: false
		};
	}

	const ADDRESS_CHECK_TIMEOUT_MS = 3000;

	const nextAddresses = await Promise.all(
		Array.from({ length: 10 }, async (_, i) => {
			const index = runtimeConfig.bitcoinNodeless.derivationIndex + i;
			const address = bip84Address(runtimeConfig.bitcoinNodeless.publicKey, index);
			
			const isUsed = await Promise.race([
				isAddressUsed(address),
				new Promise<false>((resolve) => setTimeout(() => resolve(false), ADDRESS_CHECK_TIMEOUT_MS))
			]).catch(() => false);
			
			return { address, isUsed, index };
		})
	);

	return {
		bitcoinNodeless: runtimeConfig.bitcoinNodeless,
		nextAddresses,
		hasAlreadyUsedNextAddresses: nextAddresses.some(addr => addr.isUsed)
	};
}

export const actions = {
	async initialize({ request }) {
		const formData = await request.formData();

		const parsed = z
			.object({
				mempoolUrl: z.string().url(),
				derivationIndex: z.number({ coerce: true }),
				publicKey: z
					.string()
					.regex(
						/^(zpub|vpub)/,
						'Public key must start with zpub (mainnet) or vpub (testnet) in accordance with BIP84'
					)
			})
			.parse(Object.fromEntries(formData));

		if (!isZPubValid(parsed.publicKey)) {
			throw error(400, 'Invalid public key');
		}

		const data = {
			...parsed,
			derivationPath: "m/84'/0'/0'" as const,
			format: 'bip84' as const
		};

		runtimeConfig.bitcoinNodeless = data;

		await collections.runtimeConfig.updateOne(
			{ _id: 'bitcoinNodeless' },
			{
				$set: {
					data,
					updatedAt: new Date()
				}
			},
			{ upsert: true }
		);
	},
	async update({ request }) {
		const formData = await request.formData();

		const parsed = z
			.object({
				mempoolUrl: z.string().url()
			})
			.parse(Object.fromEntries(formData));

		runtimeConfig.bitcoinNodeless.mempoolUrl = parsed.mempoolUrl;

		await collections.runtimeConfig.updateOne(
			{ _id: 'bitcoinNodeless' },
			{
				$set: {
					'data.mempoolUrl': parsed.mempoolUrl,
					updatedAt: new Date()
				}
			}
		);
	},
	async delete() {
		runtimeConfig.bitcoinNodeless = defaultConfig.bitcoinNodeless;
		await collections.runtimeConfig.deleteOne({ _id: 'bitcoinNodeless' });
	}
};
