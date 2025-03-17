import { collections } from '$lib/server/database.js';
import { lookup as dnsLookup } from 'node:dns/promises';
import { setTimeout } from 'node:timers/promises';
import {
	isPhoenixdConfigured,
	phoenixdBalance,
	phoenixdDetected,
	phoenixdGetBolt12,
	phoenixdInfo,
	phoenixdLnAddress,
	phoenixdPayInvoice,
	phoenixdSendOnChain
} from '$lib/server/phoenixd.js';
import { runtimeConfig } from '$lib/server/runtime-config';
import { fail } from '@sveltejs/kit';
import { z } from 'zod';

export const load = async () => {
	if (!isPhoenixdConfigured()) {
		const dockerIp = await Promise.race([
			dnsLookup('host.docker.internal').catch(() => null),
			setTimeout(2000).then(() => null)
		]);

		return {
			phoenixd: runtimeConfig.phoenixd,
			dockerIp: dockerIp?.address
		};
	}

	try {
		const nodeInfo = await phoenixdInfo();
		const balance = await phoenixdBalance();
		const bolt12Address = await phoenixdGetBolt12();
		return {
			phoenixd: runtimeConfig.phoenixd,
			nodeInfo,
			balance,
			bolt12Address
		};
	} catch (err) {
		return {
			phoenixd: runtimeConfig.phoenixd,
			nodeInfo: null,
			balance: null,
			bolt12Address: null
		};
	}
};

export const actions = {
	async detect(event) {
		const formData = Object.fromEntries(await event.request.formData());

		const url = z.object({ url: z.string().url() }).parse(formData).url;
		const res = await phoenixdDetected(url);

		if (res) {
			runtimeConfig.phoenixd.enabled = true;
			runtimeConfig.phoenixd.url = url;
			await collections.runtimeConfig.updateOne(
				{ _id: 'phoenixd' },
				{
					$set: { data: runtimeConfig.phoenixd, updatedAt: new Date() },
					$setOnInsert: { createdAt: new Date() }
				},
				{ upsert: true }
			);
		} else {
			return fail(404, {
				message: `No response when interrogating ${url}, PhoenixD server not detected`
			});
		}
	},
	async update(event) {
		const parsed = z
			.object({
				password: z.string().min(1)
			})
			.parse(Object.fromEntries(await event.request.formData()));

		runtimeConfig.phoenixd.password = parsed.password;
		runtimeConfig.phoenixd.lnAddress = await phoenixdLnAddress();
		runtimeConfig.phoenixd.bolt12Address = await phoenixdGetBolt12();
		await collections.runtimeConfig.updateOne(
			{ _id: 'phoenixd' },
			{
				$set: { data: runtimeConfig.phoenixd, updatedAt: new Date() },
				$setOnInsert: { createdAt: new Date() }
			},
			{ upsert: true }
		);
	},
	async disable() {
		runtimeConfig.phoenixd.enabled = false;
		runtimeConfig.phoenixd.password = '';
		await collections.runtimeConfig.updateOne(
			{ _id: 'phoenixd' },
			{
				$set: { data: runtimeConfig.phoenixd, updatedAt: new Date() },
				$setOnInsert: { createdAt: new Date() }
			},
			{ upsert: true }
		);
	},
	async withdraw(event) {
		const formData = Object.fromEntries(await event.request.formData());

		const withdrawMode = z
			.object({
				withdrawMode: z.enum(['bolt11', 'bitcoin'])
			})
			.parse(formData).withdrawMode;

		if (withdrawMode === 'bolt11') {
			if (!formData.amount) {
				delete formData.amount;
			}
			const data = z
				.object({
					address: z.string().min(1),
					amount: z.number({ coerce: true }).int().min(1).optional()
				})
				.parse(formData);

			return await phoenixdPayInvoice(data.address, data.amount);
		} else {
			const data = z
				.object({
					address: z.string().min(1),
					amount: z.number({ coerce: true }).int().min(1),
					feeRate: z.number({ coerce: true }).int().min(1)
				})
				.parse(formData);

			return await phoenixdSendOnChain(data.amount, data.address, data.feeRate);
		}
	}
};
