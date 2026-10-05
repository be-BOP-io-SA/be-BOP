import { describe, expect, it } from 'vitest';
import { discountAlertHtml } from './orders';

const base = {
	amount: '10%',
	discountInSats: 1500,
	orderId: 'order-1',
	orderNumber: 42,
	total: '30000SAT'
};

describe('discountAlertHtml', () => {
	it('keeps the staff-typed fields from adding markup', () => {
		const html = discountAlertHtml({
			...base,
			userLogin: 'eve"><b>',
			justification: '<style>*{display:none}</style><a href="https://evil.test">pay here</a>'
		});

		expect(html).not.toContain('<style>');
		expect(html).not.toContain('<b>');
		expect(html).not.toContain('<a href="https://evil.test"');
		expect(html).toContain('&lt;style&gt;');
		expect(html).toContain('eve&quot;&gt;&lt;b&gt;');
	});

	it('keeps the link to the order', () => {
		const html = discountAlertHtml({
			...base,
			userLogin: 'seller',
			justification: 'regular client'
		});

		expect(html).toContain('/order/order-1">order 42</a>');
		expect(html).toContain('applied by seller. Justification: regular client');
	});

	it('shows a dash when there is no justification', () => {
		expect(discountAlertHtml({ ...base, userLogin: 'seller' })).toContain('Justification: - ');
	});
});
