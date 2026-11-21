import { json, type RequestHandler } from '@sveltejs/kit';
import { apiV1Handler, apiV1OptionsHandler } from '$lib/server/api/v1/handler';
import { requireApiKey } from '$lib/server/api/v1/auth';
import { apiError } from '$lib/server/api/v1/errors';
import { runtimeConfig } from '$lib/server/runtime-config';
import { createConnectionToken, isStripeTerminalReady } from '$lib/server/stripe-terminal';

export const OPTIONS: RequestHandler = apiV1OptionsHandler;

/**
 * A connection token for the Stripe Terminal SDK of a be-BOP-pos terminal, made from the shop's
 * Stripe settings, with the Stripe Location the terminal connects to.
 */
export const POST: RequestHandler = apiV1Handler(async (event) => {
	const apiKeyOrError = await requireApiKey(event, 'pos:write');
	if (apiKeyOrError instanceof Response) {
		return apiKeyOrError;
	}
	if (!isStripeTerminalReady()) {
		return apiError(501, 'NOT_IMPLEMENTED', 'Stripe Terminal is not set up on this shop');
	}

	return json({
		secret: await createConnectionToken(),
		location: runtimeConfig.stripeTerminalLocationId
	});
});
