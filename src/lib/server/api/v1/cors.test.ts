import { beforeEach, describe, expect, it } from 'vitest';
import { runtimeConfig } from '$lib/server/runtime-config';
import {
	apiV1OptionsResponse,
	applyApiV1CorsHeaders,
	getApiV1AllowedOrigins,
	normalizeApiV1CorsOrigins,
	resolveApiV1CorsOrigin
} from './cors';

describe('api v1 cors', () => {
	beforeEach(() => {
		runtimeConfig.apiV1 = { corsOrigins: [] };
	});

	it('drops wildcard entries from the allowlist', () => {
		expect(normalizeApiV1CorsOrigins(['*', 'https://shop.example'])).toEqual([
			'https://shop.example'
		]);
		expect(normalizeApiV1CorsOrigins(['*'])).toEqual([]);
		expect(normalizeApiV1CorsOrigins(['*', ' https://a.example ', '', '*'])).toEqual([
			'https://a.example'
		]);
	});

	it('treats empty / unset allowlist as deny-all', () => {
		expect(normalizeApiV1CorsOrigins(undefined)).toEqual([]);
		expect(normalizeApiV1CorsOrigins(null)).toEqual([]);
		expect(normalizeApiV1CorsOrigins([])).toEqual([]);
		expect(normalizeApiV1CorsOrigins(['  ', ''])).toEqual([]);
		expect(getApiV1AllowedOrigins()).toEqual([]);
	});

	it('reads allowlist from runtimeConfig.apiV1.corsOrigins', () => {
		runtimeConfig.apiV1 = { corsOrigins: ['https://a.example', '*', 'https://b.example'] };
		expect(getApiV1AllowedOrigins()).toEqual(['https://a.example', 'https://b.example']);
	});

	it('allowlists configured origins only', () => {
		const allowed = normalizeApiV1CorsOrigins(['https://a.example', 'https://b.example']);
		expect(resolveApiV1CorsOrigin('https://a.example', allowed)).toBe('https://a.example');
		expect(resolveApiV1CorsOrigin('https://evil.example', allowed)).toBeNull();
		expect(resolveApiV1CorsOrigin('*', allowed)).toBeNull();

		const headers = new Headers();
		applyApiV1CorsHeaders(headers, 'https://b.example', allowed);
		expect(headers.get('Access-Control-Allow-Origin')).toBe('https://b.example');
		expect(headers.get('Access-Control-Allow-Origin')).not.toBe('*');
	});

	it('allows If-None-Match and exposes ETag so conditional GETs work cross-origin', () => {
		const headers = new Headers();
		applyApiV1CorsHeaders(headers, 'https://a.example', ['https://a.example']);
		expect(headers.get('Access-Control-Allow-Headers')).toContain('If-None-Match');
		expect(headers.get('Access-Control-Expose-Headers')).toContain('ETag');
	});

	it('sets no ACAO header when origin is not allowlisted', () => {
		const headers = new Headers();
		applyApiV1CorsHeaders(headers, 'https://evil.example', ['https://a.example']);
		expect(headers.get('Access-Control-Allow-Origin')).toBeNull();
	});

	it('sets no ACAO header when Origin is absent', () => {
		const headers = new Headers();
		applyApiV1CorsHeaders(headers, null, ['https://a.example']);
		expect(headers.get('Access-Control-Allow-Origin')).toBeNull();
		expect(resolveApiV1CorsOrigin(null, ['https://a.example'])).toBeNull();
	});

	it('OPTIONS preflight returns 204 and never echoes wildcard ACAO', () => {
		runtimeConfig.apiV1 = { corsOrigins: ['https://allowed.example'] };
		const denied = apiV1OptionsResponse(
			new Request('http://localhost/api/v1/orders', {
				method: 'OPTIONS',
				headers: { origin: 'https://nope.example' }
			})
		);
		expect(denied.status).toBe(204);
		expect(denied.headers.get('Access-Control-Allow-Origin')).toBeNull();

		const allowed = apiV1OptionsResponse(
			new Request('http://localhost/api/v1/orders', {
				method: 'OPTIONS',
				headers: { origin: 'https://allowed.example' }
			})
		);
		expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('https://allowed.example');
		expect(allowed.headers.get('Access-Control-Allow-Origin')).not.toBe('*');
	});
});
