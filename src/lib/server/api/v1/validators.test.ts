import { describe, expect, it } from 'vitest';
import {
	buildStrongETag,
	ifMatchSatisfied,
	ifNoneMatchMatchesCurrent,
	parseEntityTag,
	parseIfMatch,
	parseIfNoneMatch,
	strongMatch,
	weakMatch
} from './validators';

describe('buildStrongETag', () => {
	it('returns quoted opaque sha256 hex', () => {
		const etag = buildStrongETag('hello');
		expect(etag).toMatch(/^"[a-f0-9]{64}"$/);
		expect(etag).toBe(buildStrongETag('hello'));
		expect(etag).not.toBe(buildStrongETag('world'));
	});

	it('accepts Buffer / Uint8Array', () => {
		const a = buildStrongETag(Buffer.from('x'));
		const b = buildStrongETag(new Uint8Array([0x78]));
		expect(a).toBe(b);
	});
});

describe('parseEntityTag / parseIfMatch / parseIfNoneMatch', () => {
	it('parses strong, weak, and star', () => {
		expect(parseEntityTag('"abc"')).toEqual({ kind: 'strong', value: 'abc', raw: '"abc"' });
		expect(parseEntityTag('W/"abc"')).toEqual({ kind: 'weak', value: 'abc', raw: 'W/"abc"' });
		expect(parseEntityTag('*')).toEqual({ kind: 'star' });
		expect(parseEntityTag('not-a-tag')).toBeNull();
	});

	it('parses comma-separated If-Match lists', () => {
		const tags = parseIfMatch('"a", W/"b", *');
		expect(tags).toHaveLength(3);
		expect(tags?.[0]).toMatchObject({ kind: 'strong', value: 'a' });
		expect(tags?.[1]).toMatchObject({ kind: 'weak', value: 'b' });
		expect(tags?.[2]).toEqual({ kind: 'star' });
	});

	it('returns null for absent/empty/malformed headers', () => {
		expect(parseIfNoneMatch(null)).toBeNull();
		expect(parseIfNoneMatch('')).toBeNull();
		expect(parseIfMatch('abc')).toBeNull();
	});
});

describe('strongMatch / weakMatch', () => {
	it('strongMatch requires both strong and equal opaque tag', () => {
		const s = parseEntityTag('"abc"');
		const w = parseEntityTag('W/"abc"');
		const s2 = parseEntityTag('"abc"');
		const star = parseEntityTag('*');
		expect(s).not.toBeNull();
		expect(w).not.toBeNull();
		expect(s2).not.toBeNull();
		expect(star).not.toBeNull();
		if (!s || !w || !s2 || !star) {
			throw new Error('expected entity tags');
		}
		expect(strongMatch(s, s2)).toBe(true);
		expect(strongMatch(s, w)).toBe(false);
		expect(weakMatch(s, w)).toBe(true);
		expect(weakMatch(star, s)).toBe(true);
	});
});

describe('ifMatchSatisfied / ifNoneMatchMatchesCurrent', () => {
	const current = buildStrongETag('repr');
	const weakEquivalent = `W/${current}`; // W/"<hash>"

	it('ifMatchSatisfied: absent header passes; matching strong tag or * passes; weak-only does not', () => {
		expect(ifMatchSatisfied(current, null)).toBe(true);
		expect(ifMatchSatisfied(current, current)).toBe(true);
		expect(ifMatchSatisfied(current, '*')).toBe(true);
		expect(ifMatchSatisfied(current, weakEquivalent)).toBe(false);
		expect(ifMatchSatisfied(current, '"deadbeef"')).toBe(false);
	});

	it('ifNoneMatchMatchesCurrent uses weak comparison including *', () => {
		expect(ifNoneMatchMatchesCurrent(current, null)).toBe(false);
		expect(ifNoneMatchMatchesCurrent(current, current)).toBe(true);
		expect(ifNoneMatchMatchesCurrent(current, weakEquivalent)).toBe(true);
		expect(ifNoneMatchMatchesCurrent(current, '*')).toBe(true);
		expect(ifNoneMatchMatchesCurrent(current, '"nope"')).toBe(false);
	});
});
