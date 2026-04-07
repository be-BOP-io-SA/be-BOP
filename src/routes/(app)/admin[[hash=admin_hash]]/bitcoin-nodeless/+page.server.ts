import {
	bip48Address,
	generateNodelessAddress,
	isBitcoinNodelessConfigured,
	isZPubValid,
	isAddressUsed
} from '$lib/server/bitcoin-nodeless.js';
import { collections } from '$lib/server/database.js';
import { defaultConfig, runtimeConfig } from '$lib/server/runtime-config';
import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions } from './$types';
import { set } from '$lib/utils/set';
import type { JsonObject } from 'type-fest';

type FieldErrors = Record<string, string>;

// Array paths become `field[N]` keys (e.g. ['xpubs', 2] → 'xpubs[2]') to match
// the `name="xpubs[{i}]"` input attribute for inline rendering under each input.
function zodIssuesToFieldErrors(issues: z.ZodIssue[]): FieldErrors {
	return Object.fromEntries(
		issues
			.filter((issue) => issue.path.length > 0)
			.map((issue) => [
				issue.path
					.map((seg, i) => (typeof seg === 'number' ? `[${seg}]` : i === 0 ? seg : `.${seg}`))
					.join(''),
				issue.message
			])
	);
}

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
		Array.from({ length: 5 }, async (_, i) => {
			const index = runtimeConfig.bitcoinNodeless.derivationIndex + i;
			const address = generateNodelessAddress(index);

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
		hasAlreadyUsedNextAddresses: nextAddresses.some((addr) => addr.isUsed)
	};
}

export const actions: Actions = {
	async initialize({ request }) {
		const formData = await request.formData();
		const json: JsonObject = {};

		for (const [key, value] of formData) {
			set(json, key, value);
		}

		const baseSchema = z.object({
			mempoolUrl: z.string().url(),
			derivationIndex: z.number({ coerce: true }).min(0),
			format: z.enum(['bip84', 'bip48']),
			skipUsedAddresses: z.boolean({ coerce: true }).default(false)
		});

		const BIP84_KEY_REGEX = /^(xpub|zpub|tpub|vpub)/;
		const BIP84_KEY_ERROR = 'Public key must start with xpub/zpub (mainnet) or tpub/vpub (testnet)';

		// Lowercase single-sig prefixes rejected to prevent mis-derivation from wrong-path keys.
		const BIP48_KEY_REGEX = /^(xpub|tpub|Ypub|Zpub|Upub|Vpub)/;
		const BIP48_KEY_ERROR =
			'Cosigner public key must start with xpub/tpub or Zpub/Vpub (mainnet/testnet P2WSH) or Ypub/Upub (P2SH-P2WSH)';

		const bip84Schema = baseSchema.extend({
			format: z.literal('bip84'),
			publicKey: z.string().regex(BIP84_KEY_REGEX, BIP84_KEY_ERROR)
		});

		const bip48Schema = baseSchema.extend({
			format: z.literal('bip48'),
			m: z.number({ coerce: true }).min(1).max(15),
			n: z.number({ coerce: true }).min(2).max(15),
			xpubs: z.array(z.string().regex(BIP48_KEY_REGEX, BIP48_KEY_ERROR)).min(2).max(15)
		});

		const result = z.discriminatedUnion('format', [bip84Schema, bip48Schema]).safeParse(json);
		if (!result.success) {
			return fail(400, { errors: zodIssuesToFieldErrors(result.error.issues) });
		}
		const parsed = result.data;

		if (parsed.format === 'bip84') {
			if (!isZPubValid(parsed.publicKey)) {
				return fail(400, { errors: { publicKey: 'Invalid public key' } as FieldErrors });
			}

			const data = {
				...parsed,
				derivationPath: "m/84'/0'/0'" as const
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
		} else {
			if (parsed.xpubs.length !== parsed.n) {
				return fail(400, {
					errors: {
						n: `Expected ${parsed.n} cosigner xpubs, got ${parsed.xpubs.length}. Fill all fields.`
					} as FieldErrors
				});
			}
			if (parsed.xpubs.some((x) => !x.trim())) {
				return fail(400, {
					errors: { xpubs: 'All cosigner xpubs must be filled' } as FieldErrors
				});
			}
			if (new Set(parsed.xpubs).size !== parsed.xpubs.length) {
				return fail(400, {
					errors: { xpubs: 'Duplicate xpubs detected' } as FieldErrors
				});
			}
			if (parsed.m > parsed.n) {
				return fail(400, {
					errors: { m: 'M cannot exceed N (Total signatures)' } as FieldErrors
				});
			}
			try {
				bip48Address(parsed.m, parsed.xpubs, 0);
			} catch {
				return fail(400, {
					errors: {
						xpubs: 'Invalid xpubs — cannot derive multisig address'
					} as FieldErrors
				});
			}

			const data = {
				mempoolUrl: parsed.mempoolUrl,
				format: parsed.format,
				publicKey: '',
				derivationIndex: parsed.derivationIndex,
				skipUsedAddresses: parsed.skipUsedAddresses,
				m: parsed.m,
				xpubs: parsed.xpubs,
				derivationPath: "m/48'/0'/0'/2'" as const
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
		}
	},
	async update({ request }) {
		const formData = await request.formData();
		const json: JsonObject = {};

		for (const [key, value] of formData) {
			set(json, key, value);
		}

		const result = z
			.object({
				mempoolUrl: z.string().url(),
				skipUsedAddresses: z.boolean({ coerce: true }).default(false)
			})
			.safeParse(json);

		if (!result.success) {
			return fail(400, { errors: zodIssuesToFieldErrors(result.error.issues) });
		}
		const parsed = result.data;

		runtimeConfig.bitcoinNodeless.mempoolUrl = parsed.mempoolUrl;
		runtimeConfig.bitcoinNodeless.skipUsedAddresses = parsed.skipUsedAddresses;

		await collections.runtimeConfig.updateOne(
			{ _id: 'bitcoinNodeless' },
			{
				$set: {
					'data.mempoolUrl': parsed.mempoolUrl,
					'data.skipUsedAddresses': parsed.skipUsedAddresses,
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
