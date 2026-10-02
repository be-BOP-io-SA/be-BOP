import { describe, expect, it } from 'vitest';
import { error } from '@sveltejs/kit';
import { mapDomainError } from './mapErrors';

describe('mapDomainError', () => {
	it('maps stock HttpError to STOCK_UNAVAILABLE', () => {
		try {
			error(400, 'Not enough stock for product: Espresso, only 0 left');
		} catch (err) {
			expect(mapDomainError(err)).toMatchObject({
				code: 'STOCK_UNAVAILABLE',
				details: { httpStatus: 400 }
			});
		}
	});

	it('maps other HttpError to DOMAIN_ERROR', () => {
		try {
			error(400, 'Shipping address is required');
		} catch (err) {
			expect(mapDomainError(err)).toMatchObject({
				code: 'DOMAIN_ERROR',
				message: 'Shipping address is required'
			});
		}
	});

	it('maps generic Error to INTERNAL_ERROR without leaking message', () => {
		expect(mapDomainError(new Error('boom secret stack'))).toEqual({
			code: 'INTERNAL_ERROR',
			message: 'Internal server error'
		});
	});
});
