export async function load({ parent }) {
	const parentData = await parent();
	return {
		...parentData,
		bodyClass: 'max-w-7xl mx-auto'
	};
}
