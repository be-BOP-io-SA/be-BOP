import { error } from '@sveltejs/kit';

export async function load({ parent, params }) {
	const parentData = await parent();

	const slug = params.id;
	const oauth = parentData.oauth.find((o) => o.slug === slug);

	if (!oauth) {
		throw error(404, 'OAuth provider not found: ' + slug);
	}

	return {
		...parentData,
		provider: oauth,
		bodyClass: 'max-w-7xl mx-auto'
	};
}
