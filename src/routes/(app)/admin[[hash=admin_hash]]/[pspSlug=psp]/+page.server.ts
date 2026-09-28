import { error, type RequestEvent } from '@sveltejs/kit';
import { runtimeConfig, type ConfigKey } from '$lib/server/runtime-config';
import { paymentConfigActions } from '$lib/server/sdk/admin-config';
import { getProcessor } from '$lib/server/sdk/pp';
import { updateLightningInvoiceDescription } from '$lib/server/actions.js';
import { PROCESSORS, type PaymentProcessorSlug } from '$lib/types/paymentProcessors';
import { isAllowedOnPage } from '$lib/types/Role';
import type { PaymentProcessor } from '$lib/server/payment-methods';

/**
 * One settings page for every processor that keeps its credentials in `runtimeConfig`. What
 * differs between providers is the fields and the validation, and both are declared by the
 * processor itself — so this route never learns a provider's name.
 *
 * The `psp` route matcher already rejects anything else; this second check is what makes the
 * failure a 404 rather than a crash if the two ever disagree.
 */
function settingsFor(slug: string) {
	const declaration = PROCESSORS[slug as PaymentProcessorSlug];

	if (!declaration || !('configKey' in declaration)) {
		throw error(404, `No settings page for payment processor ${slug}`);
	}

	return declaration;
}

/**
 * The settings as a role that may only read this page sees them. It cannot save, so it has no
 * use for the credentials, and holding them would let it act on the provider account directly.
 */
function withSecretsBlanked(slug: string, config: object) {
	const secretFields = getProcessor(slug)?.secretConfigFields;
	if (!secretFields) {
		throw new Error(`${slug} has settings but declares no secretConfigFields`);
	}

	return Object.fromEntries(
		Object.entries(config).map(([field, value]) => [
			field,
			secretFields.includes(field) ? '' : value
		])
	);
}

export async function load({ params, locals }) {
	const declaration = settingsFor(params.pspSlug);
	const config = runtimeConfig[declaration.configKey];
	const mayEdit =
		!!locals.user?.role && isAllowedOnPage(locals.user.role, `/admin/${params.pspSlug}`, 'write');

	return {
		slug: params.pspSlug as PaymentProcessorSlug,
		label: declaration.label,
		method: declaration.method,
		config: mayEdit ? config : withSecretsBlanked(params.pspSlug, config),
		lightningInvoiceDescription: runtimeConfig.lightningQrCodeDescription
	};
}

/** The shared save / delete / test actions, bound to whichever processor the URL names. */
function actionsFor(slug: string) {
	return paymentConfigActions({
		key: settingsFor(slug).configKey as ConfigKey,
		processor: slug as PaymentProcessor
	});
}

export const actions = {
	save: (event: RequestEvent) => actionsFor(event.params.pspSlug ?? '').save(event),
	delete: (event: RequestEvent) => actionsFor(event.params.pspSlug ?? '').delete(),
	testConnection: (event: RequestEvent) =>
		actionsFor(event.params.pspSlug ?? '').testConnection(event),
	// Only the lightning forms render the control that posts here.
	updateLightningInvoiceDescription
};
