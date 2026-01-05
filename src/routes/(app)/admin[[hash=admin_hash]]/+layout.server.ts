import { adminPrefix } from '$lib/server/admin.js';
import { isBitcoinConfigured } from '$lib/server/bitcoind';
import { collections } from '$lib/server/database.js';
import { isLndConfigured } from '$lib/server/lnd.js';
import { paymentMethods } from '$lib/server/payment-methods.js';
import { runtimeConfig } from '$lib/server/runtime-config';
import { DEFAULT_TUTORIAL_ID } from '$lib/types/Tutorial';

export async function load({ locals }) {
	/**
	 * Warning: do not send sensitive data here, it will be sent to the client on /admin/login!
	 */

	// Load tutorial data for logged-in users
	let activeTutorial = null;
	let tutorialProgress = null;

	if (locals.user) {
		// Find active tutorials for user's role
		activeTutorial = await collections.tutorials.findOne({
			_id: DEFAULT_TUTORIAL_ID,
			isActive: true,
			targetRoles: locals.user.roleId
		});

		// Get user's progress on this tutorial
		if (activeTutorial) {
			tutorialProgress = await collections.tutorialProgress.findOne({
				userId: locals.user._id,
				tutorialId: activeTutorial._id
			});
		}
	}

	return {
		productActionSettings: runtimeConfig.productActionSettings,
		availablePaymentMethods: paymentMethods({ includePOS: true }),
		role: locals.user?.roleId ? collections.roles.findOne({ _id: locals.user.roleId }) : null,
		adminPrefix: adminPrefix(),
		isBitcoinConfigured,
		isLndConfigured: isLndConfigured(),
		tutorialPolicy: runtimeConfig.tutorialPolicy,
		activeTutorial,
		tutorialProgress
	};
}
