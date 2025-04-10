import { adminPrefix } from '$lib/server/admin.js';
import { isBitcoinConfigured } from '$lib/server/bitcoind';
import { collections } from '$lib/server/database.js';
import { isLightningConfigured } from '$lib/server/lnd.js';
import { paymentMethods } from '$lib/server/payment-methods.js';
import { runtimeConfig } from '$lib/server/runtime-config';

export async function load({ locals }) {
	/**
	 * Warning: do not send sensitive data here, it will be sent to the client on /admin/login!
	 */
	return {
		productActionSettings: runtimeConfig.productActionSettings,
		availablePaymentMethods: paymentMethods({ includePOS: true }),
		role: locals.user?.roleId ? collections.roles.findOne({ _id: locals.user.roleId }) : null,
		adminPrefix: adminPrefix(),
		isBitcoinConfigured,
		isLightningConfigured
	};
}
