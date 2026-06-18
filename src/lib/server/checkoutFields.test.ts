import { describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import { collectCheckoutFieldValues } from './checkoutFields';
import type { CheckoutFieldConfig } from '$lib/types/CheckoutFieldConfig';

function makeField(overrides: Partial<CheckoutFieldConfig> = {}): CheckoutFieldConfig {
	return {
		_id: new ObjectId(),
		slug: 'field',
		name: 'field',
		label: 'Field',
		type: 'free',
		sortOrder: 0,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	};
}

function expectHttpError(fn: () => unknown, status: number) {
	try {
		fn();
		expect.fail('expected to throw');
	} catch (e) {
		expect((e as { status?: number }).status).toBe(status);
	}
}

describe('collectCheckoutFieldValues', () => {
	it('skips optional free field when missing', () => {
		const field = makeField({ slug: 'note', type: 'free', required: false });
		expect(collectCheckoutFieldValues([field], {})).toEqual([]);
	});

	it('throws 400 when required free field is missing', () => {
		const field = makeField({ slug: 'note', type: 'free', required: true });
		expectHttpError(() => collectCheckoutFieldValues([field], {}), 400);
	});

	it('collects a free text value', () => {
		const field = makeField({ slug: 'note', type: 'free', required: true });
		const result = collectCheckoutFieldValues([field], { checkoutField: { note: 'Hello' } });
		expect(result).toEqual([
			{
				fieldId: field._id.toString(),
				slug: 'note',
				name: 'field',
				label: 'Field',
				type: 'free',
				value: 'Hello'
			}
		]);
	});

	it('rejects non-numeric value for number-format free field', () => {
		const field = makeField({
			slug: 'code',
			type: 'free',
			required: true,
			free: { format: 'number' }
		});
		expectHttpError(
			() => collectCheckoutFieldValues([field], { checkoutField: { code: 'abc' } }),
			400
		);
	});

	it('accepts numeric value for number-format free field', () => {
		const field = makeField({
			slug: 'code',
			type: 'free',
			required: true,
			free: { format: 'number' }
		});
		const result = collectCheckoutFieldValues([field], { checkoutField: { code: '42' } });
		expect(result[0]).toMatchObject({ slug: 'code', value: '42' });
	});

	it('rejects value not matching alphanumeric format', () => {
		const field = makeField({
			slug: 'ref',
			type: 'free',
			required: true,
			free: { format: 'alphanumeric' }
		});
		expectHttpError(
			() => collectCheckoutFieldValues([field], { checkoutField: { ref: 'ab-12' } }),
			400
		);
	});

	it('rejects value exceeding maxLength', () => {
		const field = makeField({
			slug: 'note',
			type: 'free',
			required: true,
			free: { maxLength: 3 }
		});
		expectHttpError(
			() => collectCheckoutFieldValues([field], { checkoutField: { note: 'toolong' } }),
			400
		);
	});

	it('collects a valid option', () => {
		const field = makeField({
			slug: 'size',
			type: 'options',
			required: true,
			options: ['S', 'M', 'L']
		});
		const result = collectCheckoutFieldValues([field], { checkoutField: { size: 'M' } });
		expect(result[0]).toMatchObject({ slug: 'size', value: 'M' });
	});

	it('rejects an option not in the allowed list', () => {
		const field = makeField({
			slug: 'size',
			type: 'options',
			required: true,
			options: ['S', 'M', 'L']
		});
		expectHttpError(
			() => collectCheckoutFieldValues([field], { checkoutField: { size: 'XXL' } }),
			400
		);
	});

	it('skips optional address when not submitted', () => {
		const field = makeField({ slug: 'shipping', type: 'address', required: false });
		expect(collectCheckoutFieldValues([field], {})).toEqual([]);
	});

	it('throws 400 (not 500) on partial address', () => {
		const field = makeField({ slug: 'shipping', type: 'address', required: false });
		expectHttpError(
			() =>
				collectCheckoutFieldValues([field], {
					checkoutFieldAddress: { shipping: { firstName: 'John' } }
				}),
			400
		);
	});

	it('collects a valid address', () => {
		const field = makeField({ slug: 'shipping', type: 'address', required: true });
		const result = collectCheckoutFieldValues([field], {
			checkoutFieldAddress: {
				shipping: {
					firstName: 'John',
					lastName: 'Doe',
					address: '1 Street',
					city: 'Paris',
					zip: '75001',
					country: 'FR'
				}
			}
		});
		expect(result[0]).toMatchObject({ slug: 'shipping', type: 'address' });
		expect(result[0].address).toMatchObject({
			firstName: 'John',
			lastName: 'Doe',
			country: 'FR',
			isCompany: false
		});
		expect(result[0].address?.companyName).toBeUndefined();
	});

	it('requires companyName when isCompany is true', () => {
		const field = makeField({ slug: 'billing', type: 'address', required: true });
		expectHttpError(
			() =>
				collectCheckoutFieldValues([field], {
					checkoutFieldAddress: {
						billing: {
							firstName: 'John',
							lastName: 'Doe',
							address: '1 Street',
							city: 'Paris',
							zip: '75001',
							country: 'FR',
							isCompany: true
						}
					}
				}),
			400
		);
	});

	it('keeps companyName when isCompany is true', () => {
		const field = makeField({ slug: 'billing', type: 'address', required: true });
		const result = collectCheckoutFieldValues([field], {
			checkoutFieldAddress: {
				billing: {
					firstName: 'John',
					lastName: 'Doe',
					address: '1 Street',
					city: 'Paris',
					zip: '75001',
					country: 'FR',
					isCompany: true,
					companyName: 'Acme'
				}
			}
		});
		expect(result[0].address).toMatchObject({ isCompany: true, companyName: 'Acme' });
	});

	it('propagates isPersonalData=true into the collected snapshot', () => {
		const field = makeField({
			slug: 'dob',
			type: 'free',
			required: true,
			isPersonalData: true
		});
		const result = collectCheckoutFieldValues([field], {
			checkoutField: { dob: '1990-01-01' }
		});
		expect(result[0].isPersonalData).toBe(true);
	});

	it('omits isPersonalData when the config does not set it', () => {
		const field = makeField({ slug: 'note', type: 'free', required: true });
		const result = collectCheckoutFieldValues([field], {
			checkoutField: { note: 'Hello' }
		});
		expect(result[0].isPersonalData).toBeUndefined();
	});
});
