import { randomBytes } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';

/** The Esplora fields be-BOP reads, in the shape mempool.space returns them. */
export type EsploraTx = {
	txid: string;
	vout: Array<{ scriptpubkey_address: string; value: number }>;
	status: { confirmed: false } | { confirmed: true; block_height: number; block_time: number };
};

type Route = 'txs' | 'address' | 'tipHeight';

type Client = {
	socket: WebSocket;
	wantsBlocks: boolean;
	addresses: Set<string>;
	silent: boolean;
};

const GENESIS_TIP = 800_000;
const WS_PATH = '/api/v1/ws';

/**
 * A mempool.space stand-in: the HTTP routes be-BOP polls, the WebSocket it subscribes to, and
 * controls a spec drives in-process to make payments, blocks, outages and rate limits happen.
 */
export async function startFakeMempool(port: number) {
	let tipHeight = GENESIS_TIP;
	let txs: EsploraTx[] = [];
	let httpFailure: number | null = null;
	let maxTrackedAddresses: number | null = null;
	let requests: Record<Route, number> = { txs: 0, address: 0, tipHeight: 0 };
	let txsRequestTimes = new Map<string, number[]>();
	let connections = 0;
	const clients = new Set<Client>();

	function nowSeconds(): number {
		return Math.floor(Date.now() / 1000);
	}

	function txsPaying(address: string): EsploraTx[] {
		return txs.filter((tx) => tx.vout.some((vout) => vout.scriptpubkey_address === address));
	}

	function blockAt(height: number) {
		return { id: randomBytes(32).toString('hex'), height, timestamp: nowSeconds(), tx_count: 1 };
	}

	function send(client: Client, message: unknown): void {
		if (!client.silent) {
			client.socket.send(JSON.stringify(message));
		}
	}

	/** Same grouping as mempool's websocket handler: per tracked address, what entered the mempool or a block. */
	function addressActivity(client: Client, changed: EsploraTx[], kind: 'mempool' | 'confirmed') {
		const activity: Record<string, { mempool: EsploraTx[]; confirmed: EsploraTx[]; removed: [] }> =
			{};
		for (const address of client.addresses) {
			const paying = changed.filter((tx) =>
				tx.vout.some((vout) => vout.scriptpubkey_address === address)
			);
			if (paying.length) {
				activity[address] = {
					mempool: kind === 'mempool' ? paying : [],
					confirmed: kind === 'confirmed' ? paying : [],
					removed: []
				};
			}
		}
		return Object.keys(activity).length ? { 'multi-address-transactions': activity } : {};
	}

	function onHttp(req: IncomingMessage, res: ServerResponse): void {
		const path = new URL(req.url ?? '/', 'http://fake').pathname;
		const txsMatch = /^\/api\/address\/([^/]+)\/txs$/.exec(path);
		const addressMatch = /^\/api\/address\/([^/]+)$/.exec(path);
		const route: Route | undefined = txsMatch
			? 'txs'
			: addressMatch
			? 'address'
			: path === '/api/blocks/tip/height'
			? 'tipHeight'
			: undefined;
		if (!route) {
			res.writeHead(404).end('Not found');
			return;
		}
		requests[route]++;
		if (txsMatch) {
			txsRequestTimes.set(txsMatch[1], [...(txsRequestTimes.get(txsMatch[1]) ?? []), Date.now()]);
		}
		if (httpFailure !== null) {
			res.writeHead(httpFailure, { 'content-type': 'text/plain' }).end('Fake mempool failure');
			return;
		}
		if (txsMatch) {
			json(res, txsPaying(txsMatch[1]).reverse());
		} else if (addressMatch) {
			const paying = txsPaying(addressMatch[1]);
			json(res, {
				address: addressMatch[1],
				chain_stats: { tx_count: paying.filter((tx) => tx.status.confirmed).length },
				mempool_stats: { tx_count: paying.filter((tx) => !tx.status.confirmed).length }
			});
		} else {
			res.writeHead(200, { 'content-type': 'text/plain' }).end(String(tipHeight));
		}
	}

	function json(res: ServerResponse, body: unknown): void {
		res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
	}

	function onMessage(client: Client, raw: string): void {
		// A silent socket still holds the TCP connection open, like a half-open one would.
		if (client.silent) {
			return;
		}
		let message: Record<string, unknown>;
		try {
			message = JSON.parse(raw);
		} catch {
			return;
		}
		if (message.action === 'ping') {
			send(client, { pong: true });
		}
		if (
			message.action === 'want' &&
			Array.isArray(message.data) &&
			message.data.includes('blocks')
		) {
			client.wantsBlocks = true;
			send(client, {
				blocks: Array.from({ length: 8 }, (_, i) => blockAt(tipHeight - 7 + i))
			});
		}
		const tracked = message['track-addresses'];
		if (Array.isArray(tracked)) {
			if (maxTrackedAddresses !== null && tracked.length > maxTrackedAddresses) {
				client.addresses = new Set();
				send(client, {
					'track-addresses-error': `too many addresses requested, this connection supports tracking a maximum of ${maxTrackedAddresses} addresses`
				});
			} else {
				client.addresses = new Set(tracked.map(String));
			}
		}
	}

	const server = createServer(onHttp);
	const wss = new WebSocketServer({ server, path: WS_PATH });
	wss.on('connection', (socket) => {
		connections++;
		const client: Client = { socket, wantsBlocks: false, addresses: new Set(), silent: false };
		clients.add(client);
		socket.on('message', (data) => onMessage(client, data.toString()));
		socket.on('close', () => clients.delete(client));
	});
	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(port, '127.0.0.1', resolve);
	});

	return {
		url: `http://localhost:${port}`,

		/** Broadcasts a transaction paying `address`, or lands it in the current tip block when `confirmed`. */
		addTx(address: string, sats: number, opts: { confirmed?: boolean } = {}): EsploraTx {
			const tx: EsploraTx = {
				txid: randomBytes(32).toString('hex'),
				vout: [{ scriptpubkey_address: address, value: sats }],
				status: opts.confirmed
					? { confirmed: true, block_height: tipHeight, block_time: nowSeconds() }
					: { confirmed: false }
			};
			txs.push(tx);
			for (const client of clients) {
				const activity = addressActivity(client, [tx], opts.confirmed ? 'confirmed' : 'mempool');
				if (Object.keys(activity).length) {
					send(client, activity);
				}
			}
			return tx;
		},

		/** Mines `n` blocks; every unconfirmed transaction lands in the first one. */
		mine(n = 1): number {
			const firstHeight = tipHeight + 1;
			tipHeight += n;
			const confirmed = txs.filter((tx) => !tx.status.confirmed);
			for (const tx of confirmed) {
				tx.status = { confirmed: true, block_height: firstHeight, block_time: nowSeconds() };
			}
			for (const client of clients) {
				const activity = addressActivity(client, confirmed, 'confirmed');
				if (client.wantsBlocks) {
					send(client, { block: blockAt(tipHeight), ...activity });
				} else if (Object.keys(activity).length) {
					send(client, activity);
				}
			}
			return tipHeight;
		},

		/** Answers every HTTP route with this status until called with `null`. */
		failHttp(status: number | null): void {
			httpFailure = status;
		},

		dropSockets(): void {
			for (const client of clients) {
				client.socket.terminate();
			}
		},

		/** Open sockets stop answering and pushing anything, pings included, without closing; new ones work. */
		silenceSockets(): void {
			for (const client of clients) {
				client.silent = true;
			}
		},

		setMaxTrackedAddresses(max: number | null): void {
			maxTrackedAddresses = max;
		},

		requests(): Readonly<Record<Route, number>> {
			return { ...requests };
		},

		/** When each `/api/address/:address/txs` request arrived, in milliseconds since the epoch. */
		txsRequestTimes(address: string): number[] {
			return txsRequestTimes.get(address) ?? [];
		},

		/** WebSocket connections accepted since the last reset. */
		connections(): number {
			return connections;
		},

		/** Addresses whose activity reaches be-BOP, so silent sockets are left out. */
		trackedAddresses(): string[] {
			return [...clients].flatMap((client) => (client.silent ? [] : [...client.addresses]));
		},

		/** Sockets currently tracking at least one address. */
		trackingSockets(): number {
			return [...clients].filter((client) => !client.silent && client.addresses.size).length;
		},

		/** Clears transactions, failures and counters; open sockets stay open. */
		reset(): void {
			txs = [];
			httpFailure = null;
			maxTrackedAddresses = null;
			requests = { txs: 0, address: 0, tipHeight: 0 };
			txsRequestTimes = new Map();
			connections = 0;
		},

		async close(): Promise<void> {
			for (const client of clients) {
				client.socket.terminate();
			}
			await new Promise<void>((resolve) => wss.close(() => resolve()));
			await new Promise<void>((resolve) => server.close(() => resolve()));
		}
	};
}

export type FakeMempool = Awaited<ReturnType<typeof startFakeMempool>>;
