import { describe, expect, it } from 'vitest';
import { CART_ERROR_CODES } from '$lib/server/cart';
import { languages } from '$lib/translations';

describe('cart error codes', () => {
	it.each(Object.keys(languages))('every code the cart can refuse with reads in %s', (locale) => {
		const errors = languages[locale as keyof typeof languages].cart?.error ?? {};

		expect(CART_ERROR_CODES.filter((code) => !errors[code as keyof typeof errors])).toEqual([]);
	});
});
