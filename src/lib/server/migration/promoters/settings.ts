import { collections } from '../../database';
import { runtimeConfig } from '../../runtime-config';
import type { MigrationStagedObject } from '$lib/types/MigrationStagedObject';
import type { MigrationPromoter, ProposedChange } from '../promoter';

const wpLanguageToBebopLocale: Record<string, string> = {
	fr_FR: 'fr',
	en_US: 'en',
	en_GB: 'en',
	de_DE: 'de',
	es_ES: 'es',
	it_IT: 'it',
	nl_NL: 'nl',
	pt_PT: 'pt',
	pt_BR: 'pt'
};

function convertWpLanguage(wp: string): string {
	return wpLanguageToBebopLocale[wp] ?? wp.split('_')[0];
}

/**
 * Look up the be-BOP Picture._id created when a WP media item was promoted.
 * Returns null if the WP media item hasn't been promoted yet.
 */
async function findPromotedImage(wpMediaId: number): Promise<string | null> {
	const sourceId = `wp_media_${wpMediaId}`;
	const staged = await collections.migrationStagedObjects.findOne({
		sourceId,
		type: 'image',
		status: 'promoted'
	});
	return staged?.promotedAsId ?? null;
}

async function setRuntimeConfigItem(id: string, data: unknown): Promise<void> {
	await collections.runtimeConfig.updateOne(
		{ _id: id },
		{ $set: { data, updatedAt: new Date() } },
		{ upsert: true }
	);
}

export const settingsPromoter: MigrationPromoter = {
	type: 'settings',
	actionLabel: 'Apply selected settings',

	async proposedChanges(staged) {
		const n = (staged.normalized ?? {}) as Record<string, unknown>;
		const changes: ProposedChange[] = [];

		if (typeof n.title === 'string' && n.title) {
			changes.push({
				key: 'brandName',
				label: 'Brand name',
				currentValue: runtimeConfig.brandName,
				proposedValue: n.title
			});
			changes.push({
				key: 'websiteTitle',
				label: 'Website title',
				currentValue: runtimeConfig.websiteTitle,
				proposedValue: n.title
			});
		}

		if (typeof n.description === 'string' && n.description) {
			changes.push({
				key: 'websiteShortDescription',
				label: 'Website short description',
				currentValue: runtimeConfig.websiteShortDescription,
				proposedValue: n.description
			});
		}

		if (typeof n.email === 'string' && n.email) {
			changes.push({
				key: 'sellerIdentity.contact.email',
				label: 'Seller contact email',
				currentValue: runtimeConfig.sellerIdentity?.contact?.email ?? '',
				proposedValue: n.email
			});
		}

		if (typeof n.language === 'string' && n.language) {
			changes.push({
				key: 'defaultLanguage',
				label: 'Default language',
				currentValue: runtimeConfig.defaultLanguage,
				proposedValue: convertWpLanguage(n.language)
			});
		}

		if (typeof n.siteLogoMediaId === 'number') {
			const promotedAsId = await findPromotedImage(n.siteLogoMediaId);
			changes.push({
				key: 'logo.pictureId',
				label: 'Site logo',
				currentValue: runtimeConfig.logo?.pictureId ?? '',
				proposedValue: promotedAsId ?? `(WP media #${n.siteLogoMediaId})`,
				disabledReason: promotedAsId
					? undefined
					: `Import the linked image first (WP media #${n.siteLogoMediaId})`
			});
		}

		if (typeof n.siteIconMediaId === 'number') {
			const promotedAsId = await findPromotedImage(n.siteIconMediaId);
			changes.push({
				key: 'faviconPictureId',
				label: 'Favicon',
				currentValue: runtimeConfig.faviconPictureId ?? '',
				proposedValue: promotedAsId ?? `(WP media #${n.siteIconMediaId})`,
				disabledReason: promotedAsId
					? undefined
					: `Import the linked image first (WP media #${n.siteIconMediaId})`
			});
		}

		return changes;
	},

	async promote(staged, options) {
		const n = (staged.normalized ?? {}) as Record<string, unknown>;
		const accepted = new Set(options?.acceptedKeys ?? []);
		const applied: string[] = [];

		if (accepted.has('brandName') && typeof n.title === 'string') {
			await setRuntimeConfigItem('brandName', n.title);
			applied.push('brandName');
		}
		if (accepted.has('websiteTitle') && typeof n.title === 'string') {
			await setRuntimeConfigItem('websiteTitle', n.title);
			applied.push('websiteTitle');
		}
		if (accepted.has('websiteShortDescription') && typeof n.description === 'string') {
			await setRuntimeConfigItem('websiteShortDescription', n.description);
			applied.push('websiteShortDescription');
		}
		if (accepted.has('defaultLanguage') && typeof n.language === 'string') {
			await setRuntimeConfigItem('defaultLanguage', convertWpLanguage(n.language));
			applied.push('defaultLanguage');
		}
		if (accepted.has('sellerIdentity.contact.email') && typeof n.email === 'string') {
			const current = (runtimeConfig.sellerIdentity ?? {}) as Record<string, unknown>;
			const contact = ((current as { contact?: Record<string, unknown> }).contact ??
				{}) as Record<string, unknown>;
			await setRuntimeConfigItem('sellerIdentity', {
				...current,
				contact: { ...contact, email: n.email }
			});
			applied.push('sellerIdentity.contact.email');
		}
		if (accepted.has('logo.pictureId') && typeof n.siteLogoMediaId === 'number') {
			const pictureId = await findPromotedImage(n.siteLogoMediaId);
			if (pictureId) {
				const current = (runtimeConfig.logo ?? {}) as Record<string, unknown>;
				await setRuntimeConfigItem('logo', { ...current, pictureId });
				applied.push('logo.pictureId');
			}
		}
		if (accepted.has('faviconPictureId') && typeof n.siteIconMediaId === 'number') {
			const pictureId = await findPromotedImage(n.siteIconMediaId);
			if (pictureId) {
				await setRuntimeConfigItem('faviconPictureId', pictureId);
				applied.push('faviconPictureId');
			}
		}

		return {
			promotedAsId: 'runtimeConfig',
			promotedAsLabel:
				applied.length > 0 ? `Applied: ${applied.join(', ')}` : 'No changes applied'
		};
	}
};
