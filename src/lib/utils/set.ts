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

// Not a regex: keys come from request form fields, and a bracket-matching regex rescans the
// rest of the key from every unclosed `[`, which is quadratic on "[[[[...".
function splitKey(key: string) {
	const keys: string[] = [];
	// A scan that finds no `]` sets this: the `[`s it ran past cannot close either
	let unclosedBefore = 0;
	let i = 0;

	while (i < key.length) {
		if (key[i] === '[' && i >= unclosedBefore) {
			const end = bracketContentEnd(key, i + 1);
			if (key[end] === ']') {
				keys.push(key.slice(i + 1, end));
				i = end + 1;
				continue;
			}
			unclosedBefore = end;
		}

		if (isKeyDelimiter(key[i])) {
			i++;
			continue;
		}

		let end = i + 1;
		while (end < key.length && !isKeyDelimiter(key[end])) {
			end++;
		}
		keys.push(key.slice(i, end));
		i = end;
	}

	return keys;
}

function isKeyDelimiter(char: string) {
	return char === '[' || char === '.' || char === ']';
}

const lineTerminators = '\n\r\u2028\u2029';

// A bracket cannot close across a line break, so "a[b\n.c]" still splits on its "."
function bracketContentEnd(key: string, start: number) {
	let end = start;
	while (end < key.length && key[end] !== ']' && !lineTerminators.includes(key[end])) {
		end++;
	}
	return end;
}
