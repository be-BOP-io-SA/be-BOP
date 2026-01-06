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
		try {
			// Find active tutorials for user's role
			const tutorial = await collections.tutorials.findOne({
				_id: DEFAULT_TUTORIAL_ID,
				isActive: true,
				targetRoles: locals.user.roleId
			});

			if (tutorial) {
				// Serialize dates for client transfer
				activeTutorial = {
					...tutorial,
					createdAt: tutorial.createdAt?.toISOString?.() ?? tutorial.createdAt,
					updatedAt: tutorial.updatedAt?.toISOString?.() ?? tutorial.updatedAt
				};
			}

			// Get user's progress on this tutorial
			if (activeTutorial) {
				const progress = await collections.tutorialProgress.findOne({
					userId: locals.user._id,
					tutorialId: activeTutorial._id
				});

				if (progress) {
					tutorialProgress = {
						_id: progress._id.toString(),
						userId: progress.userId.toString(),
						tutorialId: progress.tutorialId,
						tutorialVersion: progress.tutorialVersion,
						status: progress.status,
						currentStepIndex: progress.currentStepIndex,
						totalTimeMs: progress.totalTimeMs,
						wasInterrupted: progress.wasInterrupted,
						startedAt: progress.startedAt?.toISOString?.() ?? null,
						completedAt: progress.completedAt?.toISOString?.() ?? null,
						skippedAt: progress.skippedAt?.toISOString?.() ?? null,
						lastActiveAt: progress.lastActiveAt?.toISOString?.() ?? null,
						stepTimes: progress.stepTimes ?? []
					};
				}
			}
		} catch (e) {
			console.error('Error loading tutorial data:', e);
			// Continue without tutorial - don't break the admin page
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
