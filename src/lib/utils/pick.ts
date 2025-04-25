export function pick<T extends object, K extends keyof T | string>(
	o: T,
	toPick: K[]
): Pick<T, Extract<K, keyof T>> {
	return Object.fromEntries(Object.entries(o).filter(([key]) => toPick.includes(key as K))) as Pick<
		T,
		Extract<K, keyof T>
	>;
}
