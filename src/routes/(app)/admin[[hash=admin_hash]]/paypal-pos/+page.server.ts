import { defaultConfig, runtimeConfig, type RuntimeConfig } from '$lib/server/runtime-config';
import { rateLimit } from '$lib/server/rateLimit';
import { configSchemaFromFields } from '$lib/server/sdk/config-fields';
import { testPaypalPosConnection } from '$lib/server/sdk/test-connection';
import { persistConfigElement } from '$lib/server/utils/persistConfig';
import paypal from '$lib/payment-processors/paypal/declaration';
import { isAllowedOnPage } from '$lib/types/Role';

/**
 * PayPal on paired terminals: its own PayPal app, apart from the shop's PayPal, with the same
 * fields as the PayPal processor.
 */
const schema = configSchemaFromFields(paypal.config.fields);

export function load({ locals }) {
	const mayEdit =
		!!locals.user?.role && isAllowedOnPage(locals.user.role, '/admin/paypal-pos', 'write');
	const config = runtimeConfig.paypalPos;

	return {
		label: 'PayPal POS',
		// A role that may only read this page has no use for the secret.
		config: mayEdit ? config : { ...config, secret: '' }
	};
}

export const actions = {
	async save({ request }) {
		// The schema is built from the fields PayPal declares, which `paypalPos` has too.
		const paypalPos = schema.parse(
			Object.fromEntries(await request.formData())
		) as RuntimeConfig['paypalPos'];

		await persistConfigElement('paypalPos', paypalPos);
		runtimeConfig.paypalPos = paypalPos;
	},

	async delete() {
		const paypalPos = structuredClone(defaultConfig.paypalPos);

		await persistConfigElement('paypalPos', paypalPos);
		runtimeConfig.paypalPos = paypalPos;
	},

	async testConnection({ locals, url }) {
		rateLimit(locals.clientIp, 'pp.test.paypal-pos', 5, { minutes: 1 });

		return await testPaypalPosConnection(url.origin);
	}
};
