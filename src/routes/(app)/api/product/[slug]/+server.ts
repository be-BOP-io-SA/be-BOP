import { collections } from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ORIGIN } from '$lib/server/env-config';

export const GET: RequestHandler = async ({ params }) => {
	const { slug } = params;

	const product = await collections.products.findOne(
		{ _id: slug, 'actionSettings.eShop.visible': true },
		{
			projection: {
				_id: 1,
				name: 1,
				shortDescription: 1,
				price: 1
			}
		}
	);

	if (!product) {
		throw error(404, 'Product not found');
	}

	// Get pictures by productId (not from product.pictures field)
	const pictures = await collections.pictures
		.find({ productId: product._id })
		.sort({ order: 1, createdAt: 1 })
		.toArray();

	// Add full URLs to picture formats for cross-instance access
	const picturesWithUrls = pictures.map((picture) => ({
		...picture,
		storage: {
			...picture.storage,
			original: {
				...picture.storage.original,
				url: `${ORIGIN}/picture/raw/${picture._id}/format/${picture.storage.original.width}`
			},
			formats: picture.storage.formats.map((format) => ({
				...format,
				url: `${ORIGIN}/picture/raw/${picture._id}/format/${format.width}`
			}))
		}
	}));

	return json(
		{
			_id: product._id,
			name: product.name,
			shortDescription: product.shortDescription,
			price: product.price,
			pictures: picturesWithUrls
		},
		{
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',
				'Cache-Control': 'public, max-age=300' // 5 minutes cache
			}
		}
	);
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type'
		}
	});
};
