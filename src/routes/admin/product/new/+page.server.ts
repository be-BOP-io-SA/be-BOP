import { collections } from '$lib/server/database';
import { generatePicture } from '$lib/server/picture';
import { generateId } from '$lib/utils/generateId';
import type { Actions } from './$types';
import { pipeline } from 'node:stream/promises';
import busboy from 'busboy';
import { streamToBuffer } from '$lib/server/utils/streamToBuffer';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';

export const actions: Actions = {
	default: async ({ request }) => {
		const fields = {
			name: '',
			shortDescription: '',
			description: '',
			priceAmount: '',
			priceCurrency: '',
			type: 'resource',
			availableDate: undefined as undefined | string,
			preorder: undefined as undefined | string,
			shipping: undefined as undefined | string
		};

		// eslint-disable-next-line no-async-promise-executor
		const buffer = await new Promise<Buffer>(async (resolve, reject) => {
			try {
				const bb = busboy({
					headers: {
						'content-type': request.headers.get('content-type') ?? undefined
					}
				});
				bb.on('file', async (name, file, info) => {
					// const { filename, encoding, mimeType } = info;
					resolve(await streamToBuffer(file));
				});
				bb.on('field', (name, val) => {
					if (name in fields) {
						fields[name as keyof typeof fields] = val;
					}
				});

				await pipeline(request.body as unknown as AsyncIterable<Buffer>, bb);
			} catch (err) {
				reject(err);
			}
		});

		const productId = generateId(fields.name, false);

		if (!productId) {
			throw error(400, 'Could not generate product ID');
		}

		if (await collections.products.countDocuments({ _id: productId })) {
			throw error(409, 'Product with same slug already exists');
		}

		if (!fields.availableDate) {
			delete fields.availableDate;
		}

		const parsed = z
			.object({
				name: z.string().trim().min(1).max(100),
				description: z.string().trim().max(10_000),
				shortDescription: z.string().trim().max(250),
				priceCurrency: z.enum(['BTC']),
				priceAmount: z.string().regex(/^\d+(\.\d+)?$/),
				type: z.enum(['resource', 'donation', 'subscription']),
				availableDate: z.date({ coerce: true }).optional(),
				preorder: z.boolean({ coerce: true }).default(false),
				shipping: z.boolean({ coerce: true }).default(false)
			})
			.parse(fields);

		if (!parsed.availableDate) {
			parsed.preorder = false;
		}

		if (parsed.type !== 'resource') {
			delete parsed.availableDate;
			parsed.preorder = false;
		}

		if (parsed.type === 'donation') {
			parsed.shipping = false;
		}

		await generatePicture(buffer, fields.name, {
			productId,
			cb: async (session) => {
				await collections.products.insertOne(
					{
						_id: productId,
						createdAt: new Date(),
						updatedAt: new Date(),
						description: parsed.description.replaceAll('\r', ''),
						shortDescription: parsed.shortDescription.replaceAll('\r', ''),
						name: parsed.name,
						price: {
							currency: parsed.priceCurrency,
							amount: parseFloat(parsed.priceAmount)
						},
						type: parsed.type,
						availableDate: parsed.availableDate || undefined,
						preorder: parsed.preorder,
						shipping: parsed.shipping
					},
					{ session }
				);
			}
		});

		throw redirect(303, '/admin/product/' + productId);
	}
};
