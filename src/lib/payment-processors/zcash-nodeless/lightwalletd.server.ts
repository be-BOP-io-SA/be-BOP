import { connect } from 'node:http2';
import { runtimeConfig } from '$lib/server/runtime-config';

/**
 * A minimal client for lightwalletd, the public light-client server of Zcash: native gRPC over
 * TLS, which is HTTP/2, so `node:http2` is enough and the stack gains no dependency. Only the
 * few messages be-BOP sends and reads are encoded, from the canonical protos
 * (https://github.com/zcash/lightwallet-protocol, walletrpc/service.proto and
 * walletrpc/compact_formats.proto).
 */

const SERVICE = '/cash.z.wallet.sdk.rpc.CompactTxStreamer/';
const CALL_TIMEOUT_MS = 30_000;
/** PoolType.TRANSPARENT, to receive only the transparent parts of the transactions. */
const TRANSPARENT = 1;

// --- protobuf ---

function varint(value: number): Buffer {
	const bytes: number[] = [];
	let rest = BigInt(value);
	do {
		let byte = Number(rest & 0x7fn);
		rest >>= 7n;
		if (rest) {
			byte |= 0x80;
		}
		bytes.push(byte);
	} while (rest);
	return Buffer.from(bytes);
}

const varintField = (field: number, value: number) =>
	Buffer.concat([varint(field << 3), varint(value)]);
const bytesField = (field: number, value: Buffer) =>
	Buffer.concat([varint((field << 3) | 2), varint(value.length), value]);

type Fields = Map<number, Array<bigint | Buffer>>;

function decode(message: Buffer): Fields {
	const fields: Fields = new Map();
	let offset = 0;

	const readVarint = () => {
		let value = 0n;
		let shift = 0n;
		for (;;) {
			const byte = message[offset++];
			if (byte === undefined) {
				throw new Error('Truncated protobuf message');
			}
			value |= BigInt(byte & 0x7f) << shift;
			if (!(byte & 0x80)) {
				return value;
			}
			shift += 7n;
		}
	};

	while (offset < message.length) {
		const key = Number(readVarint());
		const wireType = key & 7;
		let value: bigint | Buffer;
		if (wireType === 0) {
			value = readVarint();
		} else if (wireType === 2) {
			const length = Number(readVarint());
			value = message.subarray(offset, offset + length);
			offset += length;
		} else if (wireType === 1 || wireType === 5) {
			const length = wireType === 1 ? 8 : 4;
			value = message.subarray(offset, offset + length);
			offset += length;
		} else {
			throw new Error(`Unsupported protobuf wire type ${wireType}`);
		}
		const field = key >> 3;
		fields.set(field, [...(fields.get(field) ?? []), value]);
	}

	return fields;
}

const numberOf = (fields: Fields, field: number) => Number(fields.get(field)?.[0] ?? 0n);
const bufferOf = (fields: Fields, field: number) =>
	(fields.get(field)?.[0] as Buffer | undefined) ?? Buffer.alloc(0);
const buffersOf = (fields: Fields, field: number) => (fields.get(field) ?? []) as Buffer[];

const blockId = (height: number) => varintField(1, height);
const blockRange = (start: number, end: number, transparentOnly: boolean) =>
	Buffer.concat([
		bytesField(1, blockId(start)),
		bytesField(2, blockId(end)),
		...(transparentOnly ? [bytesField(3, varint(TRANSPARENT))] : [])
	]);

// --- gRPC ---

/** One call, unary or server-streaming: the messages the server sent, once it ends with status 0. */
function call(server: string, method: string, request: Buffer): Promise<Buffer[]> {
	return new Promise((resolve, reject) => {
		const session = connect(`https://${server}`);
		const messages: Buffer[] = [];
		let pending = Buffer.alloc(0);
		let status: string | undefined;
		let statusMessage: string | undefined;
		let settled = false;

		const finish = (err?: Error) => {
			if (settled) {
				return;
			}
			settled = true;
			clearTimeout(timer);
			session.close();
			if (err) {
				reject(err);
			} else {
				resolve(messages);
			}
		};
		const timer = setTimeout(() => {
			session.destroy();
			finish(new Error(`lightwalletd ${server} ${method}: no answer after ${CALL_TIMEOUT_MS} ms`));
		}, CALL_TIMEOUT_MS);

		session.on('error', (err) => finish(err));

		const stream = session.request({
			':method': 'POST',
			':path': SERVICE + method,
			'content-type': 'application/grpc',
			te: 'trailers'
		});

		const readStatus = (headers: Record<string, unknown>) => {
			if (headers['grpc-status'] !== undefined) {
				status = String(headers['grpc-status']);
				statusMessage = decodeURIComponent(String(headers['grpc-message'] ?? ''));
			}
		};

		stream.on('response', (headers) => {
			if (headers[':status'] !== 200) {
				finish(new Error(`lightwalletd ${server} ${method}: HTTP ${headers[':status']}`));
				return;
			}
			// A call that fails at once answers with headers only, status included.
			readStatus(headers);
		});
		stream.on('trailers', readStatus);
		stream.on('data', (chunk: Buffer) => {
			pending = Buffer.concat([pending, chunk]);
			// Each message: a compression flag, a 4-byte length, then the message itself.
			while (pending.length >= 5 && pending.length >= 5 + pending.readUInt32BE(1)) {
				const length = pending.readUInt32BE(1);
				messages.push(pending.subarray(5, 5 + length));
				pending = pending.subarray(5 + length);
			}
		});
		stream.on('end', () =>
			finish(
				status === undefined || status === '0'
					? undefined
					: new Error(`lightwalletd ${server} ${method}: grpc-status ${status} ${statusMessage}`)
			)
		);
		stream.on('error', (err) => finish(err));

		const frame = Buffer.alloc(5);
		frame.writeUInt32BE(request.length, 1);
		stream.end(Buffer.concat([frame, request]));
	});
}

// --- methods ---

export async function lightdInfo(server: string): Promise<{ chainName: string; height: number }> {
	const [message] = await call(server, 'GetLightdInfo', Buffer.alloc(0));
	const fields = decode(message ?? Buffer.alloc(0));
	return { chainName: bufferOf(fields, 4).toString('utf8'), height: numberOf(fields, 7) };
}

export async function latestHeight(server: string): Promise<number> {
	const [message] = await call(server, 'GetLatestBlock', Buffer.alloc(0));
	return numberOf(decode(message ?? Buffer.alloc(0)), 1);
}

/** The heights at which `address` appears, mined transactions only: lightwalletd never returns the mempool here. */
export async function addressTransactionHeights(
	server: string,
	address: string,
	start: number,
	end: number
): Promise<number[]> {
	const request = Buffer.concat([
		bytesField(1, Buffer.from(address, 'utf8')),
		bytesField(2, blockRange(start, end, false))
	]);
	const heights = (await call(server, 'GetTaddressTxids', request))
		.map((message) => numberOf(decode(message), 2))
		.filter((height) => height > 0);
	return [...new Set(heights)];
}

export interface TransparentTransaction {
	/** As explorers and wallets show it: the protocol bytes reversed, in hex. */
	txid: string;
	outputs: Array<{ zatoshis: bigint; script: Buffer }>;
}

function transparentTransaction(message: Buffer): TransparentTransaction {
	const fields = decode(message);
	return {
		txid: Buffer.from(bufferOf(fields, 2)).reverse().toString('hex'),
		outputs: buffersOf(fields, 8).map((output) => {
			const outputFields = decode(output);
			return {
				zatoshis: (outputFields.get(1)?.[0] as bigint | undefined) ?? 0n,
				script: bufferOf(outputFields, 2)
			};
		})
	};
}

/** The transactions of the block at `height`, with their transparent outputs. */
export async function transparentTransactionsAt(
	server: string,
	height: number
): Promise<TransparentTransaction[]> {
	const blocks = await call(server, 'GetBlockRange', blockRange(height, height, true));
	return blocks.flatMap((block) => buffersOf(decode(block), 7).map(transparentTransaction));
}

/** The mempool's transactions that carry transparent parts. */
export async function mempoolTransparentTransactions(
	server: string
): Promise<TransparentTransaction[]> {
	const messages = await call(server, 'GetMempoolTx', bytesField(3, varint(TRANSPARENT)));
	return messages.map(transparentTransaction);
}

/**
 * Runs `request` on the primary server and, if it fails, on the backup: two operators, so that
 * one server down does not stop payments. The error of the last server tried is the one thrown.
 */
export async function onLightwalletd<T>(request: (server: string) => Promise<T>): Promise<T> {
	const { primaryServer, backupServer } = runtimeConfig.zcashNodeless;
	const servers = [primaryServer, backupServer].filter((server, i, all) => {
		return !!server && all.indexOf(server) === i;
	});

	let lastError: unknown = new Error('No lightwalletd server configured');
	for (const server of servers) {
		try {
			return await request(server);
		} catch (err) {
			lastError = err;
			console.warn(`[zcash-nodeless] ${server} failed:`, err instanceof Error ? err.message : err);
		}
	}
	throw lastError;
}

/** Whether a transaction already paid `address`, as bitcoin nodeless asks mempool.space. */
export async function isAddressUsed(address: string): Promise<boolean> {
	try {
		return await onLightwalletd(async (server) => {
			const tip = await latestHeight(server);
			return (await addressTransactionHeights(server, address, 1, tip)).length > 0;
		});
	} catch {
		return false;
	}
}
