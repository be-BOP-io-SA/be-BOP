import { describe, expect, it } from 'vitest';
import type { Role } from '$lib/types/Role';
import { withWebhookSecretForEditors } from './paid-order-webhook-secret';

function role(permissions: Partial<Role['permissions']>): Role {
	return {
		_id: 'test',
		name: 'test',
		createdAt: new Date(),
		updatedAt: new Date(),
		permissions: { read: [], write: [], forbidden: [], ...permissions }
	};
}

function product(_id: string) {
	return {
		_id,
		paidOrderWebhook: { apiRoute: 'https://example.com/hook', secret: 'a'.repeat(16) }
	};
}

describe('withWebhookSecretForEditors', () => {
	it('keeps the secret for a role that can write products', () => {
		const result = withWebhookSecretForEditors(
			product('mug'),
			role({ write: ['/admin/product/*'] })
		);
		expect(result.paidOrderWebhook.secret).toBe('a'.repeat(16));
	});

	it('blanks the secret for a read-only role but keeps the route', () => {
		const result = withWebhookSecretForEditors(
			product('mug'),
			role({ read: ['/admin/product/*'] })
		);
		expect(result.paidOrderWebhook).toEqual({ apiRoute: 'https://example.com/hook', secret: '' });
	});

	it('blanks the secret when there is no role', () => {
		expect(withWebhookSecretForEditors(product('mug'), undefined).paidOrderWebhook.secret).toBe('');
	});

	it('does not let write on a fixed admin page unlock a product slugged like it', () => {
		const result = withWebhookSecretForEditors(
			product('prices'),
			role({ write: ['/admin/product/prices'] })
		);
		expect(result.paidOrderWebhook.secret).toBe('');
	});

	it('leaves products without a webhook untouched', () => {
		const plain = { _id: 'mug' };
		expect(withWebhookSecretForEditors(plain, undefined)).toBe(plain);
	});
});
