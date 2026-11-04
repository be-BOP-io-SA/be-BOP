/**
 * Constants shared between the admin UI (`/admin/be-bop`) and the production
 * pre-import shim (`scripts/env-override-preimport.mjs`).
 *
 * The actual boot-time override mechanism lives in the .mjs shim, which is
 * invoked by `node --import` before the SvelteKit bundle evaluates. See the
 * README "Production / Running" section for the launch command.
 *
 * Keep these constants in sync with the shim. If you change one, update the
 * other.
 */

export const OVERRIDE_FILE_KEY = '_bebop/override.env';
export const FAILED_MARKER_KEY = '_bebop/override.failed';
export const FALLBACK_FLAG_ID = 'envOverrideFailed';

export const OVERRIDE_ALLOWED_KEYS = [
	'MONGODB_URL',
	'MONGODB_DB',
	'MONGODB_DIRECT_CONNECTION',
	'MONGODB_IP_FAMILY'
] as const;
