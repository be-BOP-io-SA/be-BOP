import { isObject } from './is-object.js';

/**
 * Deep clone an object.
 *
 * `structuredClone` would error on cloning functions
 */
export function deepClone<T>(obj: T): T {
	if (Array.isArray(obj)) {
		return obj.map(deepClone) as unknown as T;
	}
	if (isObject(obj)) {
		return Object.fromEntries(
			Object.entries(obj).map(([key, value]) => [key, deepClone(value)])
		) as T;
	}
	// todo: handle Set, Map, ...
	return obj;
}
