import { openPosSession, getLastClosedSession } from '$lib/server/pos-sessions';
import { runtimeConfig } from '$lib/server/runtime-config';
import { error, redirect } from '@sveltejs/kit';

export const load = async () => {
	if (!runtimeConfig.posSession.enabled) {
		throw error(403, 'POS sessions are not enabled');
	}

	const lastSession = await getLastClosedSession();

	return {
		lastClosingAmount: lastSession?.cashClosing ?? null,
		currency: runtimeConfig.mainCurrency
	};
};

export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const amount = Number(formData.get('amount'));

		if (isNaN(amount) || amount < 0) {
			throw error(400, 'Invalid amount');
		}

		await openPosSession({
			cashOpening: {
				amount,
				currency: runtimeConfig.mainCurrency
			},
			user: {
				userId: locals.user._id,
				userLogin: locals.user.login,
				userAlias: locals.user.alias
			}
		});

		throw redirect(303, '/pos');
	}
};
