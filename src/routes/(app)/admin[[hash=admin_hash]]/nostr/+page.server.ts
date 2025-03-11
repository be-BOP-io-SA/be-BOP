import { ORIGIN } from '$env/static/private';
import { collections } from '$lib/server/database';
import { isLightningConfigured, lndGetInfo } from '$lib/server/lnd';
import {
	nostrPrivateKey,
	nostrPublicKey,
	nostrRelays,
	nostrToHex,
	zodNpub
} from '$lib/server/nostr';
import { runtimeConfig } from '$lib/server/runtime-config';
import { ObjectId } from 'mongodb';
import { RelayPool } from 'nostr-relaypool';
import { Kind } from 'nostr-tools';
import { z } from 'zod';
import { setTimeout } from 'node:timers/promises';
import type { Event } from 'nostr-tools';
import { uniqBy } from '$lib/utils/uniqBy';
import { NOSTR_PROTOCOL_VERSION } from '$lib/server/locks/handle-messages';
import { isPhoenixdConfigured, phoenixdLnAddress } from '$lib/server/phoenixd';

export function load() {
	return {
		origin: ORIGIN,
		nostrPrivateKey: nostrPrivateKey,
		nostrPublicKey: nostrPublicKey,
		nostrRelays: runtimeConfig.nostrRelays,
		disableNostrBotIntro: runtimeConfig.disableNostrBotIntro,
		receivedMessages: collections.nostrReceivedMessages
			.find({})
			.sort({ createdAt: -1 })
			.limit(100)
			.toArray()
	};
}

export const actions = {
	certify: async () => {
		const domainName = new URL(ORIGIN).hostname;

		const picture = runtimeConfig.logo
			? await collections.pictures.findOne({ _id: runtimeConfig.logo.pictureId })
			: null;
		const pictureUrl = picture
			? `${ORIGIN}/picture/raw/${picture._id}/format/${picture.storage.formats.find(
					(f) => f.width <= 512 || f.height <= 512
			  )?.width}`
			: null;

		const lndInfo = isLightningConfigured ? await lndGetInfo() : null;
		const lnAddress =
			lndInfo?.uris?.[0] ??
			(isPhoenixdConfigured() ? await phoenixdLnAddress().catch(() => null) : null);

		await collections.nostrNotifications.insertOne({
			_id: new ObjectId(),
			content: JSON.stringify({
				name: runtimeConfig.brandName,
				display_name: runtimeConfig.brandName,
				website: ORIGIN,
				...(lnAddress && { lud16: `ln@${domainName}` }),
				// about: '',
				...(runtimeConfig.logo && { picture: pictureUrl }),
				nip05: `_@${domainName}`,
				bootikVersion: NOSTR_PROTOCOL_VERSION
			}),
			createdAt: new Date(),
			updatedAt: new Date(),
			kind: Kind.Metadata
		});

		return {
			success:
				'Nostr Certification queued. When changing logo / brand name / ..., please certify again.'
		};
	},
	sendMessage: async ({ request }) => {
		const form = await request.formData();

		const { npub, message } = z
			.object({
				npub: zodNpub(),
				message: z.string().trim().min(1)
			})
			.parse(Object.fromEntries(form));

		await collections.nostrNotifications.insertOne({
			_id: new ObjectId(),
			kind: Kind.EncryptedDirectMessage,
			content: message,
			dest: npub,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		return {
			success: 'Nostr Message queued'
		};
	},
	getMetadata: async ({ request }) => {
		const relayPool = new RelayPool(nostrRelays);

		const { npub } = z
			.object({
				npub: zodNpub()
			})
			.parse(Object.fromEntries(await request.formData()));

		let metadata: Event[] = [];

		try {
			relayPool.subscribe(
				[
					{
						authors: [nostrToHex(npub)],
						kinds: [Kind.Metadata]
					}
				],
				nostrRelays,
				(event) => {
					metadata.push(event);
				}
			);

			await setTimeout(10_000);

			metadata = uniqBy(metadata, (event) => event.id);

			return {
				success: 'Nostr Metadata fetched',
				events: metadata
			};
		} finally {
			relayPool.close();
		}
	},
	updateRelays: async ({ request }) => {
		const formData = await request.formData();

		const relays = z.string().array().parse(formData.getAll('relays'));
		await collections.runtimeConfig.updateOne(
			{
				_id: 'nostrRelays'
			},
			{
				$set: {
					data: relays.filter((rel) => rel.startsWith('wss://')),
					updatedAt: new Date()
				}
			}
		);
		runtimeConfig.nostrRelays = relays.filter((rel) => rel.startsWith('wss://'));
		return {
			success: 'Relay list updated sucessfully !'
		};
	},
	disableIntro: async ({ request }) => {
		const formData = await request.formData();
		const disableNostrBotIntro = z
			.boolean({ coerce: true })
			.parse(formData.get('disableNostrBotIntro'));
		await collections.runtimeConfig.updateOne(
			{
				_id: 'disableNostrBotIntro'
			},
			{ $set: { data: disableNostrBotIntro, updatedAt: new Date() } },
			{
				upsert: true
			}
		);

		runtimeConfig.disableNostrBotIntro = disableNostrBotIntro;
		return {
			success: `Nostr-bot intro message ${disableNostrBotIntro ? 'disabled !' : 'enabled !'}`
		};
	}
};
