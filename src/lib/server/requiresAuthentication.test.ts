import { describe, it, expect } from 'vitest';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import { productsRequiringAuthentication } from './requiresAuthentication';

const GATED = { _id: 'gated', name: 'Members only', requiresAuthentication: true };
const OPEN = { _id: 'open', name: 'Anyone', requiresAuthentication: false };

describe('productsRequiringAuthentication', () => {
	it('lets an anonymous cart through when no product asks for it', () => {
		expect(productsRequiringAuthentication([{ product: OPEN }], { sessionId: 'anon' })).toEqual([]);
	});

	it('names the product an anonymous customer cannot order', () => {
		expect(
			productsRequiringAuthentication([{ product: OPEN }, { product: GATED }], {
				sessionId: 'anon'
			})
		).toEqual(['Members only']);
	});

	it('names each product once, however many lines it has', () => {
		expect(
			productsRequiringAuthentication([{ product: GATED }, { product: GATED }], {
				sessionId: 'anon'
			})
		).toEqual(['Members only']);
	});

	it('accepts an e-mail session', () => {
		expect(
			productsRequiringAuthentication([{ product: GATED }], {
				sessionId: 'anon',
				email: 'alice@example.com'
			})
		).toEqual([]);
	});

	it('accepts a nostr session — a npub is a login, not a notification target', () => {
		expect(
			productsRequiringAuthentication([{ product: GATED }], { sessionId: 'anon', npub: 'npub1x' })
		).toEqual([]);
	});

	it('accepts an SSO session', () => {
		expect(
			productsRequiringAuthentication([{ product: GATED }], {
				sessionId: 'anon',
				ssoIds: ['google:42']
			})
		).toEqual([]);
	});

	it('exempts an employee — at the counter the session is the seller, not the buyer', () => {
		expect(
			productsRequiringAuthentication([{ product: GATED }], {
				sessionId: 'anon',
				userRoleId: 'employee'
			})
		).toEqual([]);
	});

	it('does not exempt a customer role', () => {
		expect(
			productsRequiringAuthentication([{ product: GATED }], {
				sessionId: 'anon',
				userRoleId: CUSTOMER_ROLE_ID
			})
		).toEqual(['Members only']);
	});

	it('refuses when there is no identity at all', () => {
		expect(productsRequiringAuthentication([{ product: GATED }], undefined)).toEqual([
			'Members only'
		]);
	});
});
