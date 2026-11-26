import { requireOpenPosSession } from '$lib/server/pos-sessions';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	await requireOpenPosSession();
};
