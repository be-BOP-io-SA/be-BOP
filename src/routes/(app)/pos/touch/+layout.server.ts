import { runtimeConfig } from '$lib/server/runtime-config';
import { getCurrentPosSession } from '$lib/server/pos-sessions';
import { redirect } from '@sveltejs/kit';

export const load = async () => {
	if (runtimeConfig.posSession.forbidTouchWhenSessionClosed) {
		const session = await getCurrentPosSession();
		if (!session) {
			throw redirect(303, '/pos?errorMessage=pos-touch-session-required');
		}
	}
};
