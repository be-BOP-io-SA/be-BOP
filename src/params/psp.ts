import { PROCESSORS } from '$lib/types/paymentProcessors';

/**
 * A payment processor whose settings the shared page can render: it has credentials to edit,
 * and it has not claimed a hand-written page of its own.
 *
 * The matcher is what keeps `/admin/config`, `/admin/orders` and every other static admin
 * route out of the generic one. SvelteKit already prefers a static segment over a matched
 * dynamic one, so this is the second lock rather than the first.
 */
export function match(param: string): boolean {
	const declaration = PROCESSORS[param as keyof typeof PROCESSORS];

	return !!declaration && 'configKey' in declaration && !('customAdminPage' in declaration);
}
