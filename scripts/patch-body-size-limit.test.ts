import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterAll, describe, expect, it } from 'vitest';

const SCRIPT = path.resolve('scripts/patch-body-size-limit.mjs');
const adapterFiles = path.join(
	path.dirname(createRequire(import.meta.url).resolve('@sveltejs/adapter-node/package.json')),
	'files'
);

const dirs: string[] = [];

afterAll(() => {
	for (const dir of dirs) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

/** The env.js adapter-node writes into build/, without an env prefix, as be-BOP builds it. */
function builtEnvFile() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'body-size-limit-'));
	dirs.push(dir);
	const template = fs.readFileSync(path.join(adapterFiles, 'env.js'), 'utf8');
	fs.writeFileSync(path.join(dir, 'env.js'), template.replace(/\bENV_PREFIX\b/g, '""'));
	// Reads the limit the way adapter-node's handler does once env.js has run.
	fs.writeFileSync(
		path.join(dir, 'limit.mjs'),
		`import { env } from './env.js';
import { parse_as_bytes } from ${JSON.stringify(path.join(adapterFiles, 'utils.js'))};
console.log(parse_as_bytes(env('BODY_SIZE_LIMIT', '512K')));
`
	);
	return dir;
}

function patch(envFile: string) {
	return spawnSync('node', [SCRIPT, envFile], { encoding: 'utf8' });
}

function limitWith(dir: string, value: string | undefined) {
	const env = { ...process.env };
	delete env.BODY_SIZE_LIMIT;
	if (value !== undefined) {
		env.BODY_SIZE_LIMIT = value;
	}
	return execFileSync('node', [path.join(dir, 'limit.mjs')], { env, encoding: 'utf8' }).trim();
}

describe('patch-body-size-limit', () => {
	const patched = builtEnvFile();
	const untouched = builtEnvFile();

	it('patches the env.js of the installed adapter-node', () => {
		expect(patch(path.join(patched, 'env.js')).status).toBe(0);
	});

	it.each([
		['not set', undefined, '524288'],
		['0', '0', '524288'],
		['0K', '0K', '524288'],
		['empty', '', '524288'],
		['Infinity', 'Infinity', 'Infinity'],
		['20000000', '20000000', '20000000'],
		['1M', '1M', '1048576']
	])('reads a limit %s as %s bytes', (_, value, bytes) => {
		expect(limitWith(patched, value)).toBe(bytes);
	});

	it('reads 0 as 0 bytes without it', () => {
		expect(limitWith(untouched, '0')).toBe('0');
	});

	it('adds its lines once when run twice', () => {
		const envFile = path.join(patched, 'env.js');
		const once = fs.readFileSync(envFile, 'utf8');

		expect(patch(envFile).status).toBe(0);

		expect(fs.readFileSync(envFile, 'utf8')).toBe(once);
	});

	it('stops the build when env.js is missing', () => {
		const result = patch(path.join(untouched, 'missing.js'));

		expect(result.status).toBe(1);
		expect(result.stderr).toContain('not found');
	});

	it('stops the build when env.js no longer looks like adapter-node', () => {
		const envFile = path.join(untouched, 'other.js');
		fs.writeFileSync(envFile, 'export const env = (name) => process.env[name];\n');

		const result = patch(envFile);

		expect(result.status).toBe(1);
		expect(fs.readFileSync(envFile, 'utf8')).not.toContain('BODY_SIZE_LIMIT');
	});
});
