import { runtimeConfig } from '$lib/server/runtime-config';

/**
 * Whether the shop has switched the public API on.
 *
 * Only an explicit `true` counts: a stored setting that predates the switch has no field, and a
 * shop must never come out of an upgrade with an API it did not turn on.
 */
export function isApiV1Enabled(): boolean {
	return runtimeConfig.apiV1.enabled === true;
}
