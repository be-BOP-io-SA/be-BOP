import { describe, expect, it } from 'vitest';
import type { Role } from '$lib/types/Role';
import { canConfigureTelemetry } from './telemetry-helpers';

function role(permissions: Partial<Role['permissions']>): Role {
	return {
		_id: 'test',
		name: 'test',
		createdAt: new Date(),
		updatedAt: new Date(),
		permissions: { read: [], write: [], forbidden: [], ...permissions }
	};
}

describe('canConfigureTelemetry', () => {
	it('allows a role that can write the SEO settings', () => {
		expect(canConfigureTelemetry(role({ write: ['/admin/seo'] }))).toBe(true);
		expect(canConfigureTelemetry(role({ write: ['/admin/*'] }))).toBe(true);
	});

	it('refuses a role that can only read the SEO settings', () => {
		expect(canConfigureTelemetry(role({ read: ['/admin/seo'] }))).toBe(false);
	});

	it('refuses a role with no rights on the SEO settings, like a POS account', () => {
		expect(canConfigureTelemetry(role({ write: ['/pos/*'], read: ['/admin/order/*'] }))).toBe(
			false
		);
	});

	it('refuses a role that is forbidden the SEO settings', () => {
		expect(canConfigureTelemetry(role({ write: ['/admin/*'], forbidden: ['/admin/seo'] }))).toBe(
			false
		);
	});

	it('refuses a missing role', () => {
		expect(canConfigureTelemetry(undefined)).toBe(false);
	});
});
