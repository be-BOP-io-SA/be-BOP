import { describe, expect, it } from 'vitest';
import { adminLinks } from './adminLinks';

describe('adminLinks integrity', () => {
	const allLinks = adminLinks.flatMap((s) => s.links);

	it('has at least one section', () => {
		expect(adminLinks.length).toBeGreaterThan(0);
	});

	it('every section has an icon and at least one link', () => {
		for (const section of adminLinks) {
			expect(section.icon, `section "${section.section}" must have an icon`).toBeTruthy();
			expect(
				section.links.length,
				`section "${section.section}" must have at least one link`
			).toBeGreaterThan(0);
		}
	});

	it('every link href starts with /admin/', () => {
		for (const link of allLinks) {
			expect(link.href, `"${link.label}" href`).toMatch(/^\/admin\//);
		}
	});

	it('no link href contains whitespace', () => {
		for (const link of allLinks) {
			expect(link.href).not.toMatch(/\s/);
		}
	});

	it('link hrefs are unique', () => {
		const hrefs = allLinks.map((l) => l.href);
		expect(new Set(hrefs).size).toBe(hrefs.length);
	});

	it('every link has a non-empty label', () => {
		for (const link of allLinks) {
			expect(link.label.trim().length, `href ${link.href}`).toBeGreaterThan(0);
		}
	});

	// A new processor takes its place among these without being listed here.
	it('keeps the payment settings shop owners know in the order they know', () => {
		const known = [
			['/admin/sumup', 'SumUp'],
			['/admin/stripe', 'Stripe'],
			['/admin/swiss-bitcoin-pay', 'Swiss Bitcoin Pay'],
			['/admin/btcpay-server', 'BTCPay Server'],
			['/admin/phoenixd', 'PhoenixD'],
			['/admin/lnd', 'Lightning LND node'],
			['/admin/blink', 'Blink'],
			['/admin/bitcoin-nodeless', 'Bitcoin nodeless'],
			['/admin/bitcoind', 'Bitcoin core node'],
			['/admin/paypal', 'Paypal'],
			['/admin/taler', 'Taler'],
			['/admin/osb', 'OSB'],
			['/admin/pos-payments', 'PoS Payments'],
			['/admin/custom-payments', 'Custom payment methods']
		];
		const payment = adminLinks.find((section) => section.section === 'Payment Settings');

		expect(
			payment?.links
				.map((link) => [link.href, link.label])
				.filter(([href]) => known.some(([knownHref]) => knownHref === href))
		).toEqual(known);
	});
});

describe('posAdminLinks', () => {
	it('only holds entries of the full menu, so the role permissions cover it', async () => {
		const { adminLinks, posAdminLinks } = await import('./adminLinks');
		const fullHrefs = new Set(adminLinks.flatMap((s) => s.links.map((l) => l.href)));
		for (const section of posAdminLinks) {
			expect(section.links.length, `section "${section.section}"`).toBeGreaterThan(0);
			for (const link of section.links) {
				expect(fullHrefs.has(link.href), link.href).toBe(true);
			}
		}
	});
});
