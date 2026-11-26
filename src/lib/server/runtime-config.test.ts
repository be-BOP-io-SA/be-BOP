import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { collections } from '$lib/server/database';
import { defaultConfig, runtimeConfig } from '$lib/server/runtime-config';
import { cleanDb } from '$lib/server/test-utils';
import { persistConfigElement } from '$lib/server/utils/persistConfig';

type HeldRead = { release: () => void; done: Promise<void> };

// The change stream's first read of `key` is listed once it has read, then waits for release.
function holdReadsOf(key: string): HeldRead[] {
	const find = collections.runtimeConfig.find.bind(collections.runtimeConfig);
	const held: HeldRead[] = [];
	vi.spyOn(collections.runtimeConfig, 'find').mockImplementation(((
		...args: Parameters<typeof find>
	) => {
		if (args[0]?._id !== key) {
			return find(...args);
		}
		const released = Promise.withResolvers<void>();
		const done = Promise.withResolvers<void>();
		const read = find(...args).toArray();
		read.then(() => held.push({ release: released.resolve, done: done.promise }));
		const heldRead = async () => {
			try {
				const documents = await read;
				await released.promise;
				return documents;
			} finally {
				done.resolve();
			}
		};
		// Enough of a cursor for refresh, whether it reads all at once or document by document.
		return {
			toArray: heldRead,
			async *[Symbol.asyncIterator]() {
				yield* await heldRead();
			}
		};
	}) as unknown as typeof collections.runtimeConfig.find);
	return held;
}

// Long enough for the refresh released before to read again and copy.
const settle = () => new Promise((resolve) => setTimeout(resolve, 200));

describe('runtime config refresh', () => {
	let held: HeldRead[] = [];

	beforeEach(async () => {
		await cleanDb();
		runtimeConfig.logo = { ...defaultConfig.logo };
		runtimeConfig.phoenixd = { ...defaultConfig.phoenixd };
		runtimeConfig.websiteTitle = defaultConfig.websiteTitle;
	});

	afterEach(async () => {
		held.forEach((read) => read.release());
		await Promise.all(held.map((read) => read.done));
		held = [];
		vi.restoreAllMocks();
		await settle();
	});

	it('keeps a setting saved again while its former value was being read', async () => {
		held = holdReadsOf('logo');
		await persistConfigElement('logo', { ...defaultConfig.logo, pictureId: 'former' });
		await vi.waitFor(() => expect(held).toHaveLength(1));

		const saved = { ...defaultConfig.logo, pictureId: 'saved' };
		await persistConfigElement('logo', saved);
		runtimeConfig.logo = saved;
		held[0].release();
		await settle();

		expect(runtimeConfig.logo).toEqual(saved);
	});

	it('keeps a setting changed in place while its former value was being read', async () => {
		held = holdReadsOf('phoenixd');
		await persistConfigElement('phoenixd', { ...defaultConfig.phoenixd, url: 'http://former' });
		await vi.waitFor(() => expect(held).toHaveLength(1));

		await persistConfigElement('phoenixd', { ...runtimeConfig.phoenixd, url: 'http://saved' });
		runtimeConfig.phoenixd.url = 'http://saved';
		held[0].release();
		await settle();

		expect(runtimeConfig.phoenixd.url).toBe('http://saved');
	});

	it('ends on the saved value when memory takes an older one during the read', async () => {
		held = holdReadsOf('websiteTitle');
		await persistConfigElement('websiteTitle', 'Saved last');
		await vi.waitFor(() => expect(held).toHaveLength(1));

		runtimeConfig.websiteTitle = 'Saved before';
		held[0].release();

		await vi.waitFor(() => expect(runtimeConfig.websiteTitle).toBe('Saved last'));
	});
});
