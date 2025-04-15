/* eslint-disable @typescript-eslint/no-explicit-any */

import { typedEntries } from './typedEntries';

type IteratorFunc<T> = (value: T[keyof T], key: keyof T) => unknown;
// https://chat.openai.com/share/a4523641-2478-4066-bde9-3fede2815601
type FunctionWithArgs<T extends (...args: any[]) => any, U extends any[]> = (
	...args: U
) => ReturnType<T>;

/**
 * Like async map, but for objects. Asynchronously transform the value of each property in turn.
 */
export function mapObject<T extends Record<string, any>, U extends IteratorFunc<T>>(
	o: T,
	iteratee: U
): {
	[key in keyof T]: Awaited<ReturnType<FunctionWithArgs<typeof iteratee, [T[key], key]>>>;
} {
	const mappedEntries = typedEntries(o).map(([key, val]) => [key, iteratee(val, key as keyof T)]);

	return Object.fromEntries(mappedEntries);
}
