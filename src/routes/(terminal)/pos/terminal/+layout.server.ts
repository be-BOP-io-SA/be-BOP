import { POS_OPERATOR_COOKIE, terminalKeyOf } from '$lib/server/api/pos-terminal';
import { operatorOfSession } from '$lib/server/arm-pos';
import { runtimeConfig } from '$lib/server/runtime-config';

/** What the menu of a terminal needs: who is signed in, and which screens they may open. */
export async function load(event) {
	const apiKey = await terminalKeyOf(event);
	const operator =
		apiKey && (await operatorOfSession(event.cookies.get(POS_OPERATOR_COOKIE), apiKey._id));
	if (!apiKey || !operator) {
		return { menu: null };
	}

	return {
		menu: {
			who: `${apiKey.name} · ${operator.alias}`,
			session: runtimeConfig.posSession.enabled && operator.actions.includes('zReport'),
			statusTicket: operator.actions.includes('xReport'),
			locales: runtimeConfig.languages
		}
	};
}
