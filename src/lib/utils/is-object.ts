export function isObject(value: unknown): value is Record<string, unknown> {
	if (value === undefined || value === null) {
		return false;
	}

	return Object.getPrototypeOf(value) === Object.prototype;
}
