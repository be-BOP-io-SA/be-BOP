import { describe, expect, it } from 'vitest';
import { mergeLocalizedById } from './mergeLocalizedById';

type Link = { id: string; label: string; href: string };

const base: Link[] = [
	{ id: 'a', label: 'Home', href: '/home' },
	{ id: 'b', label: 'Blog', href: '/blog' }
];

describe('mergeLocalizedById', () => {
	it('returns a shallow copy of base when there are no overrides', () => {
		const out = mergeLocalizedById(base, undefined);
		expect(out).toEqual(base);
		expect(out).not.toBe(base);
		expect(out[0]).not.toBe(base[0]);
	});

	it('applies a matching override, keeping base id and order', () => {
		const out = mergeLocalizedById(base, [{ id: 'a', label: 'Accueil', href: '/accueil' }]);
		expect(out).toEqual([
			{ id: 'a', label: 'Accueil', href: '/accueil' },
			{ id: 'b', label: 'Blog', href: '/blog' }
		]);
	});

	it('falls back per-field: an empty (or missing) override field keeps the base value', () => {
		const out = mergeLocalizedById(base, [
			{ id: 'a', label: 'Accueil', href: '' }, // href blank → keep base href
			{ id: 'b', href: '/blogue' } // label missing → keep base label
		]);
		expect(out).toEqual([
			{ id: 'a', label: 'Accueil', href: '/home' },
			{ id: 'b', label: 'Blog', href: '/blogue' }
		]);
	});

	it('matches by id regardless of override order (reorder-safe)', () => {
		const out = mergeLocalizedById(base, [
			{ id: 'b', label: 'Blogue', href: '/blogue' },
			{ id: 'a', label: 'Accueil', href: '/accueil' }
		]);
		expect(out).toEqual([
			{ id: 'a', label: 'Accueil', href: '/accueil' },
			{ id: 'b', label: 'Blogue', href: '/blogue' }
		]);
	});

	it('ignores overrides whose id is not in the base (delete-safe / orphan overrides)', () => {
		const out = mergeLocalizedById(base, [
			{ id: 'a', label: 'Accueil', href: '/accueil' },
			{ id: 'ghost', label: 'Gone', href: '/gone' }
		]);
		expect(out).toEqual([
			{ id: 'a', label: 'Accueil', href: '/accueil' },
			{ id: 'b', label: 'Blog', href: '/blog' }
		]);
	});

	it('leaves a newly-inserted base entry untranslated (insert-safe)', () => {
		const withNew: Link[] = [...base, { id: 'c', label: 'Contact', href: '/contact' }];
		const out = mergeLocalizedById(withNew, [{ id: 'a', label: 'Accueil', href: '/accueil' }]);
		expect(out[2]).toEqual({ id: 'c', label: 'Contact', href: '/contact' });
	});

	it('does not mutate base or overrides', () => {
		const overrides = [{ id: 'a', label: 'Accueil', href: '/accueil' }];
		const baseSnapshot = structuredClone(base);
		const overridesSnapshot = structuredClone(overrides);
		mergeLocalizedById(base, overrides);
		expect(base).toEqual(baseSnapshot);
		expect(overrides).toEqual(overridesSnapshot);
	});

	it('works for arbitrary identified shapes, not just links', () => {
		type Item = { id: string; title: string; body: string };
		const items: Item[] = [{ id: 'x', title: 'Hi', body: 'World' }];
		const out = mergeLocalizedById(items, [{ id: 'x', title: 'Salut' }]);
		expect(out).toEqual([{ id: 'x', title: 'Salut', body: 'World' }]);
	});
});
