/**
 * Unique product secret from storefront `?key=` (#2688).
 * Fail-closed: invalid values are dropped, never persisted.
 */
export const UNIQUE_KEY_MAX_LENGTH = 128;
export const UNIQUE_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;

export function parseUniqueKey(raw: unknown): string | undefined {
	if (typeof raw !== 'string') {
		return undefined;
	}
	const value = raw.trim();
	if (!value || value.length > UNIQUE_KEY_MAX_LENGTH) {
		return undefined;
	}
	if (!UNIQUE_KEY_PATTERN.test(value)) {
		return undefined;
	}
	return value;
}
