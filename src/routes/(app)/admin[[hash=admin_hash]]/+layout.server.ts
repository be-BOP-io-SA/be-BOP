import { adminPrefix } from '$lib/server/admin.js';
import { isBitcoinConfigured } from '$lib/server/bitcoind';
import { collections } from '$lib/server/database.js';
import { isLndConfigured } from '$lib/server/lnd.js';
import { isPaidOrderWebhookEnabled } from '$lib/server/order-paid-webhook';
import { paymentMethods } from '$lib/server/payment-methods.js';
import { runtimeConfig } from '$lib/server/runtime-config';
import { s3IsConfigured } from '$lib/server/s3.js';
import { DEFAULT_CMS_PAGES, buildDefaultCmsPageFields } from '$lib/server/defaultCmsPages';

const SEO_VISIBLE_PAGES = new Set(['home', 'privacy', 'terms']);

async function ensureDefaultCmsPages() {
	// Check which pages already exist (single query)
	const existingPageIds = await collections.cmsPages
		.find({ _id: { $in: [...DEFAULT_CMS_PAGES] } })
		.project<{ _id: string }>({ _id: 1 })
		.toArray()
		.then((pages) => new Set(pages.map((p) => p._id)));

	const missingPages = DEFAULT_CMS_PAGES.filter((slug) => !existingPageIds.has(slug));

	if (missingPages.length === 0) {
		return; // All pages exist
	}

	// Create missing pages
	const now = new Date();
	const pagesToCreate = missingPages.map((slug) => ({
		_id: slug,
		...buildDefaultCmsPageFields(slug),
		shortDescription: '',
		fullScreen: false,
		maintenanceDisplay: false,
		hideFromSEO: !SEO_VISIBLE_PAGES.has(slug),
		createdAt: now,
		updatedAt: now
	}));

	await collections.cmsPages.insertMany(pagesToCreate);
}

export async function load({ locals }) {
	// Ensure default CMS pages exist on every admin access
	await ensureDefaultCmsPages();

	/**
	 * Warning: do not send sensitive data here, it will be sent to the client on /admin/login!
	 */
	return {
		productActionSettings: runtimeConfig.productActionSettings,
		priceHistoryEnabled: runtimeConfig.priceHistoryEnabled,
		availablePaymentMethods: paymentMethods({ includePOS: true }),
		role: locals.user?.roleId ? collections.roles.findOne({ _id: locals.user.roleId }) : null,
		adminPrefix: adminPrefix(),
		isBitcoinConfigured,
		isLndConfigured: isLndConfigured(),
		allowPaidOrderWebhook: isPaidOrderWebhookEnabled(),
		s3IsConfigured: !!s3IsConfigured(),
		disabledAdminEntries: runtimeConfig.disabledAdminEntries,
		backOfficeBookmarks: locals.user
			? collections.users
					.findOne(
						{ _id: locals.user._id },
						{ projection: { 'userSettings.backOfficeBookmarks': 1 } }
					)
					.then((u) => u?.userSettings?.backOfficeBookmarks ?? [])
			: []
	};
}
