import { error, type RequestEvent } from '@sveltejs/kit';
import { runtimeConfig, type ConfigKey } from '$lib/server/runtime-config';
import { paymentConfigActions } from '$lib/server/sdk/admin-config';
import { updateLightningInvoiceDescription } from '$lib/server/actions.js';
import { PROCESSORS, type PaymentProcessorSlug } from '$lib/types/paymentProcessors';
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

export async function load({ params }) {
	const declaration = settingsFor(params.pspSlug);

	return {
		slug: params.pspSlug as PaymentProcessorSlug,
		label: declaration.label,
		method: declaration.method,
		config: runtimeConfig[declaration.configKey as ConfigKey],
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
