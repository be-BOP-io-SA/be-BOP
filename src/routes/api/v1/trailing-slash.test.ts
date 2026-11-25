import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { trailingSlash } from '$lib/server/api/v1/trailing-slash';

/** Every +server.ts under a folder, however deep. */
function endpointsUnder(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			return endpointsUnder(path);
		}
		return entry.name === '+server.ts' ? [path] : [];
	});
}

const REEXPORT = "export { trailingSlash } from '$lib/server/api/v1/trailing-slash';";
const endpoints = endpointsUnder(__dirname);

describe('the trailing slash of the API endpoints', () => {
	it('is ignored, so that SvelteKit never redirects before the API middleware has answered', () => {
		expect(trailingSlash).toBe('ignore');
	});

	it('finds the endpoints', () => {
		expect(endpoints.length).toBeGreaterThanOrEqual(17);
	});

	// A route added later without it would answer 308 where the others answer 404 when the API is off.
	it.each(endpoints.map((path) => [path.slice(__dirname.length + 1), path]))(
		'is set by %s',
		(_, path) => {
			expect(readFileSync(path, 'utf8')).toContain(REEXPORT);
		}
	);
});
