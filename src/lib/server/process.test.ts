import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { afterEach, describe, expect, it } from 'vitest';

const processModuleUrl = new URL('./process.ts', import.meta.url).href;

// Like the production server: adapter-node's SIGTERM listener never exits, and timers keep it alive.
const childScript = `
process.on('SIGTERM', () => {});
await import(${JSON.stringify(processModuleUrl)});
setInterval(() => {}, 1000);
console.log('ready');
`;

let child: ChildProcess | undefined;

afterEach(() => {
	if (child && child.exitCode === null && child.signalCode === null) {
		child.kill('SIGKILL');
	}
	child = undefined;
});

describe('process', () => {
	it('exits right away on SIGTERM even when another listener keeps the process alive', async () => {
		child = spawn(process.execPath, ['--input-type=module', '-e', childScript], {
			stdio: ['ignore', 'pipe', 'inherit']
		});
		const exited = once(child, 'exit') as Promise<[number | null, NodeJS.Signals | null]>;

		await new Promise<void>((resolve, reject) => {
			child?.stdout?.on('data', (chunk: Buffer) => {
				if (chunk.toString().includes('ready')) {
					resolve();
				}
			});
			exited.then(() => reject(new Error('child exited before being ready')));
		});

		child.kill('SIGTERM');
		const [code, signal] = await once(child, 'exit', { signal: AbortSignal.timeout(1000) });

		expect({ code, signal }).toEqual({ code: 0, signal: null });
	}, 10_000);
});
