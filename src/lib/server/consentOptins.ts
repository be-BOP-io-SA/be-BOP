import { collections } from './database';
import { runtimeConfig } from './runtime-config';
import type { LanguageKey } from '$lib/translations';
import type { ConsentOptin } from '$lib/types/ConsentOptin';
import type { UserIdentifier } from '$lib/types/UserIdentifier';
import { userQuery } from './user';

export function consentOptinLabel(
	optin: Pick<ConsentOptin, 'label' | 'translations'>,
	language: LanguageKey
): string {
	return optin.translations?.[language]?.label || optin.label;
}

/**
 * The opt-ins shown to customers on /checkout and /identity: none while the shop does not display
 * opt-ins, otherwise the enabled ones in the order employees chose.
 */
export async function displayedConsentOptins(
	language: LanguageKey
): Promise<Array<{ id: string; label: string }>> {
	if (!runtimeConfig.displayNewsletterCommercialProspection) {
		return [];
	}
	const optins = await collections.consentOptins
		.find({ enabled: true, deletedAt: { $exists: false } })
		.sort({ sortOrder: 1 })
		.toArray();
	return optins.map((optin) => ({ id: optin._id, label: consentOptinLabel(optin, language) }));
}

/**
 * Records the answers to the opt-ins the customer was shown. Only those are rewritten: an
 * acceptance given to an opt-in that is now disabled or deleted is kept as it was.
 */
export async function saveConsentOptinAnswers(params: {
	user: UserIdentifier;
	displayedIds: string[];
	acceptedIds: string[];
	email?: string;
	npub?: string;
}): Promise<void> {
	const acceptedIds = params.acceptedIds.filter((id) => params.displayedIds.includes(id));
	const now = new Date();
	await collections.personalInfo.updateOne(
		userQuery(params.user),
		[
			{
				$set: {
					consentOptinIds: {
						$setUnion: [
							{
								$setDifference: [
									{ $ifNull: ['$consentOptinIds', []] },
									{ $literal: params.displayedIds }
								]
							},
							{ $literal: acceptedIds }
						]
					},
					...(params.npub && { npub: { $literal: params.npub } }),
					...(params.email && { email: { $literal: params.email } }),
					user: { $literal: params.user },
					updatedAt: now,
					createdAt: { $ifNull: ['$createdAt', now] }
				}
			}
		],
		{ upsert: true }
	);
}
