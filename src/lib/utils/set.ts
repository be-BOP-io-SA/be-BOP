import type { Paths } from 'type-fest';

export function set<T extends object, K extends Paths<T> | string>(
	obj: T,
	key: K,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	value: any // K extends string ? Get<T, K> : never
): void {
	if (typeof key !== 'string') {
		throw new TypeError('Expected a string as the key.');
	}

	const keys = key.split('.') as (keyof T)[];

	for (let i = 0; i < keys.length - 1; i++) {
		const k = keys[i];
		if (typeof obj[k] !== 'object') {
			obj[k] = {} as T[keyof T];
		}
		obj = obj[k] as T;
	}

	obj[keys[keys.length - 1]] = value as T[keyof T];
}
