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
		const targetVal = target[key];

		if (sourceVal === undefined) {
			continue;
		}

		if (!isObject(sourceVal)) {
			target[key] = sourceVal;
		} else if (!isObject(targetVal)) {
			target[key] = isObject(sourceVal) ? deepClone(sourceVal) : sourceVal;
		} else {
			merge(targetVal, sourceVal);
		}
	}

	return target as Return;
}
