export function binaryFindAround<T>(
	array: T[],
	target: T,
	comparator: (a: T, b: T) => number
): [T | undefined, T | undefined] {
	if (array.length === 0) {
		return [undefined, undefined];
	}

	let left = 0;
	let right = array.length - 1;

	while (left <= right) {
		const mid = Math.floor((left + right) / 2);
		const comparison = comparator(array[mid], target);

		if (comparison === 0) {
			return [array[mid], array[mid]];
		} else if (comparison < 0) {
			left = mid + 1;
		} else {
			right = mid - 1;
		}
	}

	const lowerBound = right >= 0 ? array[right] : undefined;
	const upperBound = left < array.length ? array[left] : undefined;

	return [lowerBound, upperBound];
}
