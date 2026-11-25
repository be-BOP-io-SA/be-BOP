import { error } from '@sveltejs/kit';
import { POS_OPERATOR_COOKIE, terminalKeyOf } from '$lib/server/api/pos-terminal';
import { operatorOfSession } from '$lib/server/arm-pos';
import { ORIGIN } from '$lib/server/env-config';
import { terminalPaymentMethods } from '$lib/server/pos-payments';
import { runtimeConfig } from '$lib/server/runtime-config';
import { PUBLIC_VERSION } from '$env/static/public';

/** The build, the server and the configuration of this terminal: what to quote when reporting an issue. */
export async function load(event) {
	const apiKey = await terminalKeyOf(event);
	if (!apiKey) {
		throw error(401, 'This device is not paired with the shop, or it was revoked.');
	}
	const operator = await operatorOfSession(event.cookies.get(POS_OPERATOR_COOKIE), apiKey._id);
	if (!operator) {
		throw error(403, 'Sign in on the terminal first.');
	}

	const methods = terminalPaymentMethods();

	return {
		server: {
			version: PUBLIC_VERSION ? PUBLIC_VERSION.slice(0, 7) : '—',
			name: runtimeConfig.brandName,
			host: new URL(ORIGIN).host
		},
		terminal: { name: apiKey.name, operator: operator.alias },
		config: {
			currency: runtimeConfig.mainCurrency,
			methods,
			sessions: runtimeConfig.posSession.enabled,
			sessionRequired:
				runtimeConfig.posSession.enabled && runtimeConfig.posSession.forbidTouchWhenSessionClosed
		}
	};
}
