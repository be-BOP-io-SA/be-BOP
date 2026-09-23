import type { Thing, WithContext } from 'schema-dts';

export type Schema = Thing | WithContext<Thing>;

export function serializeSchema(thing: Schema) {
	// JSON.stringify leaves `<` alone, so a product name holding `</script>` would close the
	// element early. `<` is the same character to a JSON parser, inert to an HTML one.
	const json = JSON.stringify(thing).replaceAll('<', '\\u003c');

	return `<script type="application/ld+json">${json}</script>`;
}
