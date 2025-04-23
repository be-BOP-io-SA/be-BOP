export function omit<T extends object, K extends keyof T>(
	o: T,
	toOmit: K[] | K
): Pick<T, Exclude<keyof T, K>> {
	const arr = Array.isArray(toOmit) ? toOmit : [toOmit];
	return Object.fromEntries(Object.entries(o).filter(([key]) => !arr.includes(key as K))) as Pick<
		T,
		Exclude<keyof T, K>
	>;
}
