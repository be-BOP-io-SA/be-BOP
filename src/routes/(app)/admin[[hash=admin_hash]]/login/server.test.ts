import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcryptjs from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import { cleanDb } from '$lib/server/test-utils';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User';
import { actions } from './+page.server';

vi.mock('$lib/types/User', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/types/User')>()),
	checkPasswordPwnedTimes: async () => 0
}));

const PASSWORD = 'the-owner-password';
let ipCounter = 0;
const freshIp = () => `10.0.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;

type LoginEvent = Parameters<(typeof actions)['default']>[0];

async function attempt(login: string, password: string, clientIp: string) {
	const body = new FormData();
	body.set('login', login);
	body.set('password', password);
	body.set('memorize', '3600');
	const sessionId = new ObjectId().toHexString();
	await collections.sessions.insertOne({
		_id: new ObjectId(),
		sessionId,
		createdAt: new Date(),
		updatedAt: new Date(),
		expiresAt: new Date(Date.now() + 3600_000)
	});
	try {
		const result = await actions.default({
			locals: { clientIp, sessionId },
			request: new Request('http://x/admin/login', { method: 'POST', body }),
			cookies: { set: () => undefined, get: () => undefined, delete: () => undefined }
		} as unknown as LoginEvent);
		return (result as { status?: number })?.status ?? 200;
	} catch (thrown) {
		return (thrown as { status: number }).status;
	}
}

describe('admin login limit per account', () => {
	let login: string;

	beforeEach(async () => {
		await cleanDb();
		runtimeConfig.isAdminCreated = true;
		login = `owner-${new ObjectId().toHexString()}`;
		await collections.users.insertOne({
			_id: new ObjectId(),
			login,
			roleId: SUPER_ADMIN_ROLE_ID,
			password: await bcryptjs.hash(PASSWORD, 4),
			createdAt: new Date(),
			updatedAt: new Date()
		});
	});

	it('still lets the owner in from their own address after 30 failures from elsewhere', async () => {
		for (let i = 0; i < 30; i++) {
			expect(await attempt(login, 'wrong-password-guess', freshIp())).toBe(400);
		}

		expect(await attempt(login, PASSWORD, freshIp())).toBe(303);
	}, 60_000);

	it('once over the limit, refuses an address that already failed on the account, right password or not', async () => {
		for (let i = 0; i < 29; i++) {
			await attempt(login, 'wrong-password-guess', freshIp());
		}
		const sprayer = freshIp();
		expect(await attempt(login, 'wrong-password-guess', sprayer)).toBe(400);

		expect(await attempt(login, PASSWORD, sprayer)).toBe(429);
		expect(await attempt(login, 'another-guess-here', freshIp())).toBe(400);
	}, 60_000);
});
