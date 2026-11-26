/**
 * Run after `vite build`: makes the built server read a `BODY_SIZE_LIMIT` of 0 as if it were
 * not set, so 512K.
 *
 * SvelteKit 2 reads 0 as 0 bytes and refuses every request with a body, which is never what
 * a shop wants. adapter-node reads the variable before be-BOP's own code is loaded, so the
 * only place to change it is its `env.js`, which every module of the server imports before
 * reading the limit.
 *
 * Usage: node scripts/patch-body-size-limit.mjs [path to env.js, build/env.js by default]
 */

import fs from 'node:fs';

const MARKER = '// be-BOP: a BODY_SIZE_LIMIT of 0 means the default limit';

// Values adapter-node would read as 0 bytes: 0, 0K, an empty value…
const PATCH = `
${MARKER}, see scripts/patch-body-size-limit.mjs.
const be_bop_body_size_limit = process.env[env_prefix + 'BODY_SIZE_LIMIT'];
if (be_bop_body_size_limit !== undefined && /^\\s*0*[KMG]?\\s*$/i.test(be_bop_body_size_limit)) {
	delete process.env[env_prefix + 'BODY_SIZE_LIMIT'];
}
`;

const envFile = process.argv[2] ?? 'build/env.js';

function fail(reason) {
	console.error(`patch-body-size-limit: ${reason}`);
	process.exit(1);
}

if (!fs.existsSync(envFile)) {
	fail(`${envFile} not found. Run it after vite build.`);
}

const source = fs.readFileSync(envFile, 'utf8');

if (source.includes(MARKER)) {
	process.exit(0);
}

// A new adapter-node may have moved the code this relies on: stop the build rather than ship
// a server that refuses every form again.
if (!source.includes('function env(') || !source.includes('const env_prefix')) {
	fail(
		`${envFile} no longer looks like adapter-node's env.js. Check where it reads BODY_SIZE_LIMIT.`
	);
}

fs.appendFileSync(envFile, PATCH);
