import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { PHOENIXD_ENDPOINT_URL, PHOENIXD_HTTP_PASSWORD } from './env-config';
import { runtimeConfig } from './runtime-config';
import { persistConfigElement } from './utils/persistConfig';

export const isPhoenixdConfigured = () =>
	runtimeConfig.phoenixd.enabled && !!runtimeConfig.phoenixd.password;

export async function phoenixdInfo(): Promise<{
	nodeId: string;
	chain: 'mainnet' | 'testnet';
	channels: string[];
	version: string;
}> {
	const res = await fetch(`${runtimeConfig.phoenixd.url}/getinfo`, {
		headers: {
			Authorization: `Basic ${Buffer.from(`:${runtimeConfig.phoenixd.password}`).toString(
				'base64'
			)}`
		}
	});

	return await res.json();
}

export async function phoenixdBalance(): Promise<{ balanceSat: number; feeCreditSat: number }> {
	const res = await fetch(`${runtimeConfig.phoenixd.url}/getbalance`, {
		headers: {
			Authorization: `Basic ${Buffer.from(`:${runtimeConfig.phoenixd.password}`).toString(
				'base64'
			)}`
		}
	});

	return await res.json();
}

export async function phoenixdGetBolt12(): Promise<string> {
	const res = await fetch(`${runtimeConfig.phoenixd.url}/getoffer`, {
		headers: {
			Authorization: `Basic ${Buffer.from(`:${runtimeConfig.phoenixd.password}`).toString(
				'base64'
			)}`
		}
	});

	if (!res.ok) {
		throw error(500, `Error fetching Bolt12 offer: ${res.status} ${await res.text()}`);
	}

	return await res.text();
}

export async function phoenixdLnAddress(): Promise<string> {
	const res = await fetch(`${runtimeConfig.phoenixd.url}/getlnaddress`, {
		headers: {
			Authorization: `Basic ${Buffer.from(`:${runtimeConfig.phoenixd.password}`).toString(
				'base64'
			)}`
		}
	});
	if (!res.ok) {
		throw error(500, `Could not get lnaddress: ${res.status} ${await res.text()}`);
	}

	return await res.text();
}

export async function phoenixdDetected(url?: string): Promise<boolean> {
	return await Promise.race<boolean>([
		fetch(`${url || runtimeConfig.phoenixd.url}/getinfo`).then(
			() => true,
			() => false
		),
		new Promise((resolve) => setTimeout(() => resolve(false), 2000))
	]);
}

export async function attemptAutoconfigurePhoenixd() {
	if (PHOENIXD_ENDPOINT_URL && PHOENIXD_HTTP_PASSWORD) {
		if (
			PHOENIXD_ENDPOINT_URL === runtimeConfig.phoenixd.url &&
			PHOENIXD_HTTP_PASSWORD === runtimeConfig.phoenixd.password
		) {
			// Configuration already set
			return;
		} else if (await phoenixdDetected(PHOENIXD_ENDPOINT_URL)) {
			const prevConfig = { ...runtimeConfig.phoenixd };
			// “Temporarily” set the URL and password since they are required by
			// phoenixdLnAddress and phoenixdGetBolt12
			runtimeConfig.phoenixd.url = PHOENIXD_ENDPOINT_URL;
			runtimeConfig.phoenixd.password = PHOENIXD_HTTP_PASSWORD;

			try {
				const lnAddress = await phoenixdLnAddress();
				const bolt12Address = await phoenixdGetBolt12();
				runtimeConfig.phoenixd = {
					enabled: true,
					url: PHOENIXD_ENDPOINT_URL,
					password: PHOENIXD_HTTP_PASSWORD,
					lnAddress,
					bolt12Address
				};
				await persistConfigElement('phoenixd', runtimeConfig.phoenixd);
				console.log('Phoenixd configuration completed successfully');
			} catch (error) {
				// Restore previous configuration
				runtimeConfig.phoenixd = prevConfig;
				console.error('Unable to conclude phoenixd configuration:', error);
			}
		} else {
			console.error(
				'In the presence of a non-empty PHOENIXD_ENDPOINT_URL environment variable. ' +
					`I attempted to reach phoenixd at ${PHOENIXD_ENDPOINT_URL}, but failed. ` +
					`Please check the value of the PHOENIXD_ENDPOINT_URL variable`
			);
		}
	}
}

export async function phoenixdCreateInvoice(
	satoshis: number,
	description: string,
	externalId: string
): Promise<{ payment_request: string; r_hash: string; payment_address: string }> {
	const res = await fetch(`${runtimeConfig.phoenixd.url}/createinvoice`, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${Buffer.from(`:${runtimeConfig.phoenixd.password}`).toString(
				'base64'
			)}`,
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json'
		},
		body: new URLSearchParams({
			amountSat: satoshis.toString(),
			description,
			externalId
		})
	});

	if (!res.ok) {
		throw error(500, `Could not create invoice on PhoenixD: ${res.status} ${await res.text()}`);
	}

	const json = z
		.object({
			amountSat: z.number(),
			paymentHash: z.string(),
			serialized: z.string()
		})
		.parse(await res.json());

	return {
		payment_request: json.serialized,
		r_hash: json.paymentHash,
		payment_address: json.serialized
	};
}

export async function phoenixdLookupInvoice(paymentHash: string) {
	const res = await fetch(`${runtimeConfig.phoenixd.url}/payments/incoming/${paymentHash}`, {
		headers: {
			Authorization: `Basic ${Buffer.from(`:${runtimeConfig.phoenixd.password}`).toString(
				'base64'
			)}`
		}
	});

	if (!res.ok) {
		throw error(
			500,
			`Could not lookup invoice ${paymentHash} on PhoenixD: ${res.status} ${await res.text()}`
		);
	}
	const json = z
		.object({
			paymentHash: z.string(),
			preimage: z.string(),
			externalId: z.string().optional(),
			description: z.string().optional(),
			invoice: z.string(),
			isPaid: z.boolean(),
			receivedSat: z.number(),
			fees: z.number(),
			completedAt: z.number().optional(), // in MS
			createdAt: z.number() // in MS
		})
		.parse(await res.json());

	return {
		address: json.invoice,
		feesSat: json.fees,
		receivedSat: json.receivedSat,
		isPaid: json.isPaid,
		createdAt: new Date(json.createdAt),
		completedAt: json.completedAt ? new Date(json.completedAt) : null,
		externalId: json.externalId,
		description: json.description
	};
}

export async function phoenixdPayInvoice(paymentRequest: string, amountSat?: number) {
	const res = await fetch(`${runtimeConfig.phoenixd.url}/payinvoice`, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${Buffer.from(`:${runtimeConfig.phoenixd.password}`).toString(
				'base64'
			)}`,
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json'
		},
		body: new URLSearchParams({
			invoice: paymentRequest,
			...(amountSat ? { amountSat: amountSat.toString() } : {})
		})
	});

	if (!res.ok) {
		throw error(500, `Could not pay invoice on PhoenixD: ${res.status} ${await res.text()}`);
	}

	const json: {
		recipientAmountSat: number;
		routingFeeSat: number;
		paymentId: string;
		paymentHash: string;
		paymentPreimage: string;
		reason?: string;
	} = await res.json();

	// For some reason PhoenixD returns 200 in case of errors
	if (json.reason) {
		throw error(500, json.reason);
	}

	return json;
}

export async function phoenixdSendOnChain(amountSat: number, address: string, feeVbSat: number) {
	const res = await fetch(`${runtimeConfig.phoenixd.url}/sendtoaddress`, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${Buffer.from(`:${runtimeConfig.phoenixd.password}`).toString(
				'base64'
			)}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			amountSat: amountSat.toString(),
			address,
			feerateSatByte: feeVbSat.toString()
		})
	});

	if (!res.ok) {
		throw error(500, `Could not send on-chain on PhoenixD: ${res.status} ${await res.text()}`);
	}

	const transactionId = await res.text();

	// For some reason PhoenixD returns 200 in case of errors
	if (!/^[0-9a-f]{64}$/.test(transactionId)) {
		throw error(500, transactionId);
	}

	return {
		transactionId
	};
}
