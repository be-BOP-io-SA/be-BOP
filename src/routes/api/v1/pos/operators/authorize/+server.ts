import { json, type RequestHandler } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { apiV1Handler, apiV1OptionsHandler } from '$lib/server/api/v1/handler';
import { requireApiKey } from '$lib/server/api/v1/auth';
import { apiError } from '$lib/server/api/v1/errors';
import { operatorFromBadge, operatorFromPin } from '$lib/server/arm-pos';
import { POS_ACTIONS } from '$lib/types/PosAction';

export const OPTIONS: RequestHandler = apiV1OptionsHandler;

/**
 * Whether the operator behind a badge, or a PIN, may take an action: leaving the locked service
 * mode, or a manager's badge allowing what the signed-in operator may not.
 */
export const POST: RequestHandler = apiV1Handler(async (event) => {
	const apiKeyOrError = await requireApiKey(event, 'pos:read');
	if (apiKeyOrError instanceof Response) {
		return apiKeyOrError;
	}

	const parsed = z
		.union([
			z.object({ action: z.enum(POS_ACTIONS), badge: z.string().min(1).max(100) }),
			z.object({
				action: z.enum(POS_ACTIONS),
				operatorId: z.string().refine((id) => ObjectId.isValid(id)),
				pin: z.string().max(8)
			})
		])
		.safeParse(await event.request.json().catch(() => null));
	if (!parsed.success) {
		return apiError(
			400,
			'VALIDATION_ERROR',
			'Send an action with a badge, or an operatorId and a pin'
		);
	}

	const operator =
		'badge' in parsed.data
			? await operatorFromBadge(parsed.data.badge)
			: await operatorFromPin(new ObjectId(parsed.data.operatorId), parsed.data.pin);
	if (!operator) {
		return apiError(401, 'UNAUTHORIZED', 'Unknown or suspended badge, or wrong PIN');
	}
	if (!operator.actions.includes(parsed.data.action)) {
		return apiError(403, 'FORBIDDEN', `This operator may not ${parsed.data.action}`);
	}

	return json({
		allowed: true,
		operator: { id: operator._id.toHexString(), alias: operator.alias }
	});
});
