export async function load({ data }) {
	return {
		...data,
		bodyClass: 'no-sticky-actions'
	};
}
