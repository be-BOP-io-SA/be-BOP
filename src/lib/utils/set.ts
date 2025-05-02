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

	// Parse keys to handle both "." and "[]" operators
	const keys = key
		.replace(/\[([^\]]*)\]/g, '.$1') // Convert "[key]" to ".key"
		.split('.') as (keyof T)[];

	for (let i = 0; i < keys.length - 1; i++) {
		const k = (keys[i] === '' && Array.isArray(obj) ? obj.length : keys[i]) as keyof T;
		const subKey = keys[i + 1];
		const isArrayIndex = typeof subKey === 'string' && /^\d*$/.test(subKey);

		if (typeof obj[k] !== 'object' || obj[k] === null) {
			obj[k] = isArrayIndex ? ([] as T[keyof T]) : ({} as T[keyof T]);
		}
		obj = obj[k] as T;
	}

	const lastKey = (
		keys[keys.length - 1] === '' && Array.isArray(obj) ? obj.length : keys[keys.length - 1]
	) as keyof T;
	obj[lastKey] = value as T[keyof T];
}
