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
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unnecessary-condition
	return (key
		.split('.')
		.reduce<unknown>(
			(acc, k) =>
				acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[k] : undefined,
			d
		) ?? fallback) as Path extends string ? Get<T, Path> : never;
}
