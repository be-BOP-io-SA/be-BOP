import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createServer as createHttpServer, type Server as HttpServer } from 'node:http';
import {
	connect,
	createServer as createTcpServer,
	type AddressInfo,
	type Server as TcpServer
} from 'node:net';
import { orderAddressLabel } from './bitcoind';
import { ObjectId } from 'mongodb';

describe('bitcoin', () => {
	it('should have labels', () => {
		expect(orderAddressLabel('orderId', new ObjectId('6577739b4feec6c5137a2202'))).toBe(
			'order:orderId:6577739b4feec6c5137a2202'
		);
	});
});

/** Unauthenticated SOCKS5 proxy that sends every CONNECT to 127.0.0.1, standing in for Tor. */
function startSocks5Proxy(requestedHosts: string[]): Promise<TcpServer> {
	const server = createTcpServer((client) => {
		let buffer = Buffer.alloc(0);
		let greeted = false;

		const onData = (chunk: Buffer) => {
			buffer = Buffer.concat([buffer, chunk]);

			if (!greeted) {
				if (buffer.length < 2 || buffer.length < 2 + buffer[1]) {
					return;
				}
				buffer = buffer.subarray(2 + buffer[1]);
				greeted = true;
				client.write(Buffer.from([0x05, 0x00]));
			}

			// CONNECT request with a DOMAINNAME address: VER CMD RSV ATYP LEN NAME PORT
			if (buffer.length < 5 || buffer.length < 7 + buffer[4]) {
				return;
			}
			if (buffer[1] !== 0x01 || buffer[3] !== 0x03) {
				client.end(Buffer.from([0x05, 0x08, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
				return;
			}
			const host = buffer.subarray(5, 5 + buffer[4]).toString();
			const port = buffer.readUInt16BE(5 + buffer[4]);
			const rest = buffer.subarray(7 + buffer[4]);
			client.off('data', onData);
			requestedHosts.push(host);

			const upstream = connect(port, '127.0.0.1', () => {
				client.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 127, 0, 0, 1, 0, 0]));
				if (rest.length) {
					upstream.write(rest);
				}
				client.pipe(upstream).pipe(client);
			});
			upstream.on('error', () => client.destroy());
		};

		client.on('data', onData);
		client.on('error', () => {});
	});
	return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function startFakeBitcoind(): Promise<HttpServer> {
	const server = createHttpServer((req, res) => {
		let body = '';
		req.on('data', (chunk) => (body += chunk));
		req.on('end', () => {
			const { id, method } = JSON.parse(body);
			res.setHeader('Content-Type', 'application/json');
			res.end(
				JSON.stringify(
					method === 'listwallets'
						? { result: ['shop'], error: null, id }
						: { result: null, error: { code: -32601, message: 'Method not found' }, id }
				)
			);
		});
	});
	return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

describe('bitcoinRpc with an .onion node behind a SOCKS5 Tor proxy', () => {
	const requestedHosts: string[] = [];
	let proxy: TcpServer;
	let node: HttpServer;

	beforeAll(async () => {
		proxy = await startSocks5Proxy(requestedHosts);
		node = await startFakeBitcoind();
	});

	afterAll(async () => {
		vi.doUnmock('$lib/server/env-config');
		node.closeAllConnections();
		await new Promise((resolve) => node.close(resolve));
		await new Promise((resolve) => proxy.close(resolve));
	});

	it('reaches the node through the proxy', async () => {
		const proxyPort = (proxy.address() as AddressInfo).port;
		const nodePort = (node.address() as AddressInfo).port;

		// bitcoind.ts picks its dispatcher at import time, so it must load after the env is mocked
		vi.resetModules();
		vi.doMock('$lib/server/env-config', async (importOriginal) => ({
			...(await importOriginal<typeof import('$lib/server/env-config')>()),
			BITCOIN_RPC_URL: `http://node.onion:${nodePort}`,
			BITCOIN_RPC_USER: 'user',
			BITCOIN_RPC_PASSWORD: 'password',
			TOR_PROXY_URL: `socks5://127.0.0.1:${proxyPort}`
		}));
		const { bitcoinRpc } = await import('./bitcoind');

		const response = await bitcoinRpc('listwallets', []);

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ result: ['shop'] });
		expect(requestedHosts).toEqual(['node.onion']);
	});
});
