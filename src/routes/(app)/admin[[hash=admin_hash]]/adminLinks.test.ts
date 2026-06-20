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
});
