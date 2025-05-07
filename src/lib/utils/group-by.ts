/**
 * Splits an array into an obj of arrays
 */
export function groupBy<T, K extends string | number | symbol>(
	iterable: Iterable<T>,
	keyGetter: (elem: T) => K
): Partial<Record<K, T[]>> {
	const result: Partial<Record<K, T[]>> = {};

	for (const elem of iterable) {
		const key = keyGetter(elem);
		if (!result[key]) {
			result[key] = [];
		}
		result[key].push(elem);
	}

	return result;
}

export function groupByNonPartial<T, K extends string | number | symbol>(
	iterable: Iterable<T>,
	keyGetter: (elem: T) => K
): Record<K, T[]> {
	const result = groupBy(iterable, keyGetter);
	return result as Record<K, T[]>;
}
