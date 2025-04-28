export function deepEquals(a: unknown, b: unknown): boolean {
	if (a === b) {
		return true;
	}

	if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
		return false;
	}

	const keysA = new Set(Object.keys(a));
	const keysB = new Set(Object.keys(b));

	if (keysA.size !== keysB.size) {
		return false;
	}

	for (const key of keysA) {
		if (!keysB.has(key)) {
			return false;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
		if (!deepEquals((a as any)[key], (b as any)[key])) {
			return false;
		}
	}

	return true;
}
