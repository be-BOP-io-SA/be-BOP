import { fetchCatalog } from '$lib/server/catalog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => fetchCatalog(locals);
