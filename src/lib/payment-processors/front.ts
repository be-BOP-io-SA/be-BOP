import type { ComponentType } from 'svelte';
import type { InlineText, LocalizedText } from '$lib/i18n';
import type { FieldsOf, ProcessorDeclaration } from './types';

/** Everything a processor shows, kept out of its declaration so the server never loads it. */
export interface Front<D extends ProcessorDeclaration = ProcessorDeclaration> {
	/** Its mark, as the inside of an `<svg>` drawn in the colour of the text around it. */
	logo?: { viewBox: string; body: string };
	settings?: {
		fields: Record<keyof FieldsOf<D> & string, { label: InlineText; placeholder?: string }>;
	};
}

/**
 * A loaded `Front.svelte`. Its component is the payment form of a processor declaring `pay`:
 * it receives `data`, what `payData` returned, and `orderPath`, where a buyer who paid goes.
 */
export type LoadedFront = Front & { PayForm: ComponentType };

/** A text of a processor, under the translation key shops may already have overridden. */
export const tr = (key: string, text: LocalizedText): InlineText => ({ key, text });

const modules = import.meta.glob<{ front: Front; default: ComponentType }>('./*/Front.svelte');

export async function loadFront(slug: string): Promise<LoadedFront | undefined> {
	const module = await modules[`./${slug}/Front.svelte`]?.();

	return module && { ...module.front, PayForm: module.default };
}

/** Runs `mount` once the provider's script is there, adding it to the page when it is not. */
export function withProviderScript(src: string, loaded: boolean, mount: () => void) {
	if (loaded) {
		mount();
		return;
	}

	document.head.append(
		Object.assign(document.createElement('script'), {
			src,
			async: false,
			defer: false,
			onload: mount
		})
	);
}
