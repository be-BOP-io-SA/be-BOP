/**
 * Merge a per-locale override array onto a base array of identified records, matched by a stable
 * `id` — never by array position. This is the reusable building block for translating arrays of
 * admin-editable objects (nav links today; reuse for any future `{ id, … }[]` translatable field).
 *
 * Properties:
 *  - **Reorder / insert / delete safe:** overrides are looked up by `id`, so editing the base order
 *    or membership never re-maps or drops the wrong translation (unlike positional merging).
 *  - **Independent per-field fallback:** each field of a matched override is applied only when it is
 *    *truthy*; an empty string (or `undefined`) means "not translated" and the base value is kept.
 *    So a partial translation (e.g. label only, href left blank) works.
 *  - **Base drives the result:** the output has exactly the base's entries, in base order, with base
 *    `id`s preserved. Override entries whose `id` is not in the base are ignored.
 *
 * @param base      Canonical records (the untranslated source of truth), each with a unique `id`.
 * @param overrides The current locale's overrides, each carrying the `id` it translates. `undefined`
 *                  (no overrides for this locale) returns a shallow copy of `base`.
 */
export function mergeLocalizedById<T extends { id: string }>(
	base: ReadonlyArray<T>,
	overrides: ReadonlyArray<{ id: string } & Partial<T>> | undefined
): T[] {
	if (!overrides) {
		return base.map((entry) => ({ ...entry }));
	}
	return base.map((entry) => {
		const override = overrides.find((candidate) => candidate.id === entry.id);
		if (!override) {
			return { ...entry };
		}
		const merged: T = { ...entry };
		for (const key of Object.keys(entry) as Array<keyof T>) {
			if (key === 'id') {
				continue;
			}
			const value = override[key];
			if (value) {
				merged[key] = value as T[keyof T];
			}
		}
		return merged;
	});
}
