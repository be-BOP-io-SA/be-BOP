import { json, type RequestHandler } from '@sveltejs/kit';
import { apiV1Handler, apiV1OptionsHandler } from '$lib/server/api/v1/handler';
import { requireApiKey } from '$lib/server/api/v1/auth';
import { terminalOperators } from '$lib/server/arm-pos';

export const OPTIONS: RequestHandler = apiV1OptionsHandler;

/** The arm-pos profiles a terminal loads: who may sign in on it, and what each may do. */
export const GET: RequestHandler = apiV1Handler(async (event) => {
	const apiKeyOrError = await requireApiKey(event, 'pos:read');
	if (apiKeyOrError instanceof Response) {
		return apiKeyOrError;
	}

	return json({
		operators: (await terminalOperators()).map((operator) => ({
			id: operator._id.toHexString(),
			alias: operator.alias,
			actions: operator.actions
		}))
	});
});
