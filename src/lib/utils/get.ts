import type { Get, Paths } from 'type-fest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-redundant-type-constituents
export function get<T, Path extends Paths<T> | any>(
	dict: T,
	key: Path,
	fallback?: Path extends string ? Get<T, Path> : never
): Path extends string ? Get<T, Path> : never {
	if (typeof key !== 'string') {
		throw new TypeError('Expected a string as the key.');
	}
	if (!dict) {
		return fallback as Path extends string ? Get<T, Path> : never;
	}
	const d = dict;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unsafe-member-access
	return (key.split('.').reduce((acc, k) => (acc as any)[k as any], d) ??
		fallback) as Path extends string ? Get<T, Path> : never;
}
