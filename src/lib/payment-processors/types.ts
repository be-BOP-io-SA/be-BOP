import type { PaymentMethod } from '$lib/server/payment-methods';

/** One setting of a processor, as its settings page edits it and `runtimeConfig` stores it. */
export interface ConfigField {
	/** A `secret` is typed as a password and never sent to a role that may only read the page. */
	kind: 'text' | 'secret';
}

/** Key order is the order of the settings form. */
export type ConfigFields = Readonly<Record<string, ConfigField>>;

/**
 * The static facts about a payment processor. Nothing here may import `$lib/server/*` for a
 * value: the admin navigation reads these in the browser.
 */
export interface ProcessorDeclaration {
	/** Stored on every payment it handles, and the name of its folder. */
	slug: string;
	/** The payment method this processor serves. Several may serve the same one. */
	method: PaymentMethod;
	/** Shown in the admin navigation and in the preferred-processor picker. */
	label: string;
	/**
	 * Rank within the method when the shop expressed no preference. Lower wins.
	 * Gaps of ten leave room to slot a processor in without renumbering its neighbours.
	 */
	priority: number;
	/** Its `runtimeConfig` key, which is also its `runtimeConfig` collection `_id`. */
	configKey?: string;
	config?: { fields: ConfigFields };
	/**
	 * Keeps a hand-written settings page: these carry real domain UI — wallet management,
	 * RPC consoles, derivation paths — that no shared form can express.
	 */
	customAdminPage?: true;
}

export const defineProcessor = <const D extends ProcessorDeclaration>(declaration: D): D =>
	declaration;

export type FieldsOf<D> = D extends { config: { fields: infer F extends ConfigFields } }
	? F
	: never;

export type ConfigOf<D> = D extends { config: { fields: infer F extends ConfigFields } }
	? { -readonly [Name in keyof F]: string }
	: never;

/** The slice of `runtimeConfig` the declared processors own, keyed by their `configKey`. */
export type ProcessorConfigs<D> = {
	[P in D as P extends { configKey: infer Key extends string; config: object }
		? Key
		: never]: ConfigOf<P>;
};

export function configDefaults(fields: ConfigFields): Record<string, string> {
	return Object.fromEntries(Object.keys(fields).map((name) => [name, '']));
}
