export function isEmptyObject(obj: unknown): boolean {
	if (typeof obj !== 'object' || obj === null) {
		return false;
	}
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			return false;
		}
	}
	return true;
}
