import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { WebSocketServer } from 'ws';

// The liveness timer ticks every 5s; a referenced one would reconnect within this window.
const AFTER_DROP_MS = 6_000;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForOutput(child: ChildProcess, text: string): Promise<void> {
	return new Promise((resolve, reject) => {
		let output = '';
		child.stdout?.on('data', (chunk) => {
			output += String(chunk);
			if (output.includes(text)) {
				resolve();
			}
		});
		child.once('exit', () => reject(new Error(`child exited before printing "${text}"`)));
	});
}

describe('mempool WebSocket and process exit', () => {
	it('holds the process through open sockets only, never through its liveness timer', async () => {
		const server = new WebSocketServer({ host: '127.0.0.1', port: 0, path: '/api/v1/ws' });
		await once(server, 'listening');
		let connections = 0;
		const received: unknown[] = [];
		server.on('connection', (socket) => {
			connections++;
			socket.on('message', (data) => received.push(JSON.parse(String(data))));
		});
		const child = spawn(
			process.execPath,
			[fileURLToPath(new URL('./bitcoin-nodeless-ws.exit-child.ts', import.meta.url))],
			{
				env: {
					...process.env,
					MEMPOOL_URL: `http://127.0.0.1:${(server.address() as AddressInfo).port}`
				},
				stdio: ['ignore', 'pipe', 'inherit']
			}
		);
		const exit = once(child, 'exit');

		try {
			await waitForOutput(child, 'watching');
			expect(received).toContainEqual({
				'track-addresses': ['bc1qexit0', 'bc1qexit1', 'bc1qexit2']
			});

			await sleep(3_000);
			// Node's WebSocket keeps a reference on its open socket: shutdown relies on the order loop closing them.
			expect(child.exitCode).toBeNull();

			for (const socket of server.clients) {
				socket.terminate();
			}
			const outcome = await Promise.race([exit, sleep(AFTER_DROP_MS).then(() => 'still running')]);
			expect(outcome).toEqual([0, null]);
			expect(connections).toBe(1);
		} finally {
			child.kill();
			server.close();
		}
	}, 20_000);
});
