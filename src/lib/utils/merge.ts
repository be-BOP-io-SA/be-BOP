import type { IterableElement, UnionToIntersection } from 'type-fest';
import { isObject } from './is-object.js';
import { deepClone } from './deep-clone.js';

/**
 * Convert [A, B, C] to A & B & C
 */
type ArrayIntersection<T> = UnionToIntersection<IterableElement<T>>;

/**
 * Recursively merge sources into target and returns modified target.
 *
 * Only recursively merge object properties, all others (maps, arrays, sets, ...) are overwritten.
 */
export function merge<Target, Sources extends unknown[]>(
	_target: Target,
	...sources: Sources
): ArrayIntersection<[Target, ...Sources]> {
	const target = (_target ?? {}) as Record<string, unknown>;
	type Return = ArrayIntersection<[Target, ...Sources]>;

	if (sources.length > 1) {
		return merge(merge(target, sources[0]), ...sources.slice(1)) as ArrayIntersection<
			[Target, ...Sources]
		>;
	}

	const [source] = sources;

	if (!source) {
		return target as Return;
	}

	for (const [key, sourceVal] of Object.entries(source as typeof target)) {
		const targetVal = Object.getOwnPropertyDescriptor(target, key)?.value;

		if (sourceVal === undefined) {
			continue;
		}

		if (!isObject(sourceVal)) {
			Object.defineProperty(target, key, {
				value: sourceVal,
				writable: true,
				enumerable: true,
				configurable: true
			});
		} else if (!isObject(targetVal)) {
			Object.defineProperty(target, key, {
				value: isObject(sourceVal) ? deepClone(sourceVal) : sourceVal,
				writable: true,
				enumerable: true,
				configurable: true
			});
		} else {
			merge(targetVal, sourceVal);
		}
	}

	return target as Return;
}
