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
	const keys = splitKey(key);

	for (let i = 0; i < keys.length - 1; i++) {
		const k = (keys[i] === '' && Array.isArray(obj) ? obj.length : keys[i]) as keyof T;
		const subKey = keys[i + 1];
		const isArrayIndex = typeof subKey === 'string' && /^\d*$/.test(subKey);

		const prop = Object.getOwnPropertyDescriptor(obj, k);

		if (typeof prop?.value !== 'object' || prop?.value === null) {
			Object.defineProperty(obj, k, {
				value: isArrayIndex ? [] : {},
				writable: true,
				enumerable: true,
				configurable: true
			});
		}
		obj = obj[k] as T;
	}

	const lastKey = (
		keys[keys.length - 1] === '' && Array.isArray(obj) ? obj.length : keys[keys.length - 1]
	) as keyof T;
	Object.defineProperty(obj, lastKey, {
		value: value as T[keyof T],
		writable: true,
		enumerable: true,
		configurable: true
	});
}

function splitKey(key: string) {
	let start = 0;

	const ret = [];

	while (1) {
		const dot = key.indexOf('.', start);
		const bracket = key.indexOf('[', start);
		const endBracket = key.indexOf(']', bracket);
		if (dot === -1 && bracket === -1) {
			break;
		}

		if (bracket !== -1 && (dot === -1 || (bracket < dot && endBracket !== -1))) {
			ret.push(key.slice(start, bracket));
			ret.push(key.slice(bracket + 1, endBracket));
			start = endBracket + 1;
		} else {
			ret.push(key.substring(start, dot));
			start = dot + 1;
		}
	}

	if (start < key.length) {
		ret.push(key.slice(start));
	}
	return ret;
}
