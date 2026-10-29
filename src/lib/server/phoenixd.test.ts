import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanDb } from './test-utils';
import { resetConfig, runtimeConfig } from './runtime-config';
import { warnOnAlmostFullChannels } from './phoenixd';

const { queueEmail } = vi.hoisted(() => ({ queueEmail: vi.fn() }));

vi.mock('./email', async (importOriginal) => ({
	...(await importOriginal<typeof import('./email')>()),
	queueEmail
}));

function nodeWithChannel(capacitySat: number, inboundLiquiditySat: number) {
	vi.stubGlobal(
		'fetch',
		vi.fn(
			async () =>
				new Response(
					JSON.stringify({
						nodeId: 'node',
						chain: 'mainnet',
						channels: [{ state: 'Normal', channelId: 'abc', capacitySat, inboundLiquiditySat }]
					})
				)
		)
	);
}

describe('warnOnAlmostFullChannels', () => {
	beforeEach(async () => {
		await cleanDb();
		queueEmail.mockClear();
		runtimeConfig.phoenixd = {
			...runtimeConfig.phoenixd,
			channelFillWarningPercent: 70,
			capacityWarningSentAt: null
		};
		runtimeConfig.sellerIdentity = {
			contact: { email: 'shop@example.com' }
		} as typeof runtimeConfig.sellerIdentity;
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		resetConfig();
	});

	it('sends one e-mail while a channel stays past the level', async () => {
		nodeWithChannel(1_000_000, 200_000);

		await warnOnAlmostFullChannels();
		await warnOnAlmostFullChannels();

		expect(queueEmail).toHaveBeenCalledTimes(1);
		expect(queueEmail.mock.calls[0][0]).toBe('shop@example.com');
		expect(queueEmail.mock.calls[0][2]).toMatchObject({ fillPercentage: '80' });
	});

	it('sends again once the channels have gone back under the level and past it again', async () => {
		nodeWithChannel(1_000_000, 200_000);
		await warnOnAlmostFullChannels();

		nodeWithChannel(1_000_000, 900_000);
		await warnOnAlmostFullChannels();
		expect(runtimeConfig.phoenixd.capacityWarningSentAt).toBeNull();

		nodeWithChannel(1_000_000, 200_000);
		await warnOnAlmostFullChannels();

		expect(queueEmail).toHaveBeenCalledTimes(2);
	});

	it('sends nothing when the warning is off', async () => {
		runtimeConfig.phoenixd.channelFillWarningPercent = 0;
		nodeWithChannel(1_000_000, 0);

		await warnOnAlmostFullChannels();

		expect(queueEmail).not.toHaveBeenCalled();
	});
});
