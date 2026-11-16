import type { InlineText, LocalizedText } from '$lib/i18n';
import type { FieldsOf, ProcessorDeclaration } from './types';

/** Everything a processor shows, kept out of its declaration so the server never loads it. */
export interface Front<D extends ProcessorDeclaration = ProcessorDeclaration> {
	settings?: {
		fields: Record<keyof FieldsOf<D> & string, { label: InlineText }>;
	};
}

/** A text of a processor, under the translation key shops may already have overridden. */
export const tr = (key: string, text: LocalizedText): InlineText => ({ key, text });

const modules = import.meta.glob<{ front: Front }>('./*/Front.svelte');

export async function loadFront(slug: string): Promise<Front | undefined> {
	return (await modules[`./${slug}/Front.svelte`]?.())?.front;
}
