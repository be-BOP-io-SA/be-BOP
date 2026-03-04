import { requireOpenPosSession } from '$lib/server/pos-sessions';

export const load = async () => {
	await requireOpenPosSession();
};
