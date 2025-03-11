import { error } from '@sveltejs/kit';
import { collections } from '$lib/server/database';
import type { Leaderboard } from '$lib/types/Leaderboard';
import type { Product } from '$lib/types/Product';

export const load = async ({ params, locals }) => {
	const leaderboard = await collections.leaderboards.findOne<
		Pick<Leaderboard, '_id' | 'name' | 'progress' | 'endsAt' | 'mode' | 'beginsAt'>
	>(
		{ _id: params.id },
		{
			projection: {
				_id: 1,
				name: 1,
				progress: 1,
				endsAt: 1,
				beginsAt: 1,
				mode: 1
			}
		}
	);

	if (!leaderboard) {
		throw error(404, 'leaderboard not found');
	}
	const products = await collections.products
		.find({
			_id: { $in: [...leaderboard.progress.map((prog) => prog.productId)] }
		})
		.project<Pick<Product, '_id' | 'name' | 'shortDescription'>>({
			name: locals.language ? { $ifNull: [`$translations.${locals.language}.name`, '$name'] } : 1,
			shortDescription: locals.language
				? { $ifNull: [`$translations.${locals.language}.shortDescription`, '$shortDescription'] }
				: 1
		})
		.toArray();
	const pictures = await collections.pictures
		.find({
			productId: { $in: [...products.map((product) => product._id)] }
		})
		.sort({ createdAt: 1 })
		.toArray();
	return {
		leaderboard,
		products,
		pictures
	};
};
