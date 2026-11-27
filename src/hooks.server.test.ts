import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runtimeConfig } from '$lib/server/runtime-config';

// Importing the hook starts what the server starts at boot: neither is wanted here.
vi.mock('$lib/server/locks', () => ({}));
vi.mock('$lib/server/phoenixd', () => ({ attemptAutoconfigurePhoenixd: () => undefined }));
// SvelteKit's `sequence` needs the request store of a running server: chain the handlers plainly.
vi.mock('@sveltejs/kit/hooks', () => ({
	sequence:
		(...handlers: Array<(input: never) => Promise<Response>>) =>
		(input: { event: unknown; resolve: (event: unknown) => Promise<Response> }) => {
			const run = (index: number, event: unknown): Promise<Response> =>
				index === handlers.length
					? input.resolve(event)
					: handlers[index]({
							event,
							resolve: (next: unknown) => run(index + 1, next ?? event)
					  } as never);
			return run(0, input.event);
		}
}));

import { handle } from './hooks.server';

/** What the router hands the hook: the address as it was received, encoded characters and all. */
function eventFor(path: string) {
	return {
		request: new Request(`http://localhost${path}`),
		url: new URL(`http://localhost${path}`),
		locals: {} as Record<string, unknown>,
		getClientAddress: () => '203.0.113.9',
		cookies: {
			get: () => undefined,
			getAll: () => [],
			set: () => undefined,
			delete: () => undefined
		}
	};
}

describe('the hook, for an /api/v1 address written with encoded characters', () => {
	let before: typeof runtimeConfig.apiV1;

	beforeEach(() => {
		before = runtimeConfig.apiV1;
		runtimeConfig.apiV1 = { ...before, enabled: false };
	});

	afterEach(() => {
		runtimeConfig.apiV1 = before;
	});

	// The router decodes these to /api/v1/..., so the switch must be applied to them as to the plain one.
	it.each(['/api/v1/zzz', '/api/v%31/zzz', '/%61pi/v1/zzz', '/ap%69/%76%31/health'])(
		'answers %s with the switch of the API, a plain JSON 404, when it is off',
		async (path) => {
			const resolve = vi.fn(async () => new Response('the page of the site'));

			const res = await handle({ event: eventFor(path) as never, resolve });

			expect(resolve).not.toHaveBeenCalled();
			expect(res.status).toBe(404);
			await expect(res.json()).resolves.toEqual({
				error: { code: 'NOT_FOUND', message: 'Not found' }
			});
		}
	);
});
