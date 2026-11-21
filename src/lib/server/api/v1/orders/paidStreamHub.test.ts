import { describe, expect, it, vi } from 'vitest';
import type { ChangeStreamDocument } from 'mongodb';
import type { Order } from '$lib/types/Order';

vi.mock('$lib/server/database', () => ({ collections: { orders: {} } }));

import { changeKind } from './paidStreamHub';

function update(
	updatedFields: Record<string, unknown>,
	removedFields: string[] = []
): ChangeStreamDocument<Order> {
	return {
		operationType: 'update',
		updateDescription: { updatedFields, removedFields }
	} as unknown as ChangeStreamDocument<Order>;
}

describe('changeKind', () => {
	it('reads a new order as a change of the order', () => {
		expect(changeKind({ operationType: 'insert' } as ChangeStreamDocument<Order>)).toBe('order');
	});

	it('reads a payment written on the order as a change of the order', () => {
		expect(changeKind(update({ 'payments.0.status': 'paid', status: 'paid' }))).toBe('order');
	});

	it('reads a note, a label or an erasure as an annotation', () => {
		expect(changeKind(update({ 'notes.2': {}, annotatedAt: new Date() }))).toBe('annotation');
		expect(changeKind(update({ orderLabelIds: ['vip'], annotatedAt: new Date() }))).toBe(
			'annotation'
		);
		expect(
			changeKind(
				update({
					dataAnonymized: true,
					annotatedAt: new Date(),
					shippingAddress: { country: 'CH', zip: '1000' },
					'customCheckoutFields.0.value': ''
				})
			)
		).toBe('annotation');
		expect(changeKind(update({ annotatedAt: new Date() }, ['orderLabelIds']))).toBe('annotation');
	});

	it('reads a write that touches the sale as well as a note as a change of the order', () => {
		expect(changeKind(update({ 'notes.0': {}, updatedAt: new Date() }))).toBe('order');
	});
});
