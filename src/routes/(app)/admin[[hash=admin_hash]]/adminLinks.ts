import type { ComponentType } from 'svelte';
import IconShop from '~icons/ant-design/shop-outlined';
import IconSetting from '~icons/ant-design/setting-outlined';
import IconWallet from '~icons/ant-design/wallet-outlined';
import IconTransaction from '~icons/ant-design/transaction-outlined';
import IconCluster from '~icons/ant-design/cluster-outlined';
import IconDeploymentUnit from '~icons/ant-design/deployment-unit-outlined';
import {
	ALL_PAYMENT_PROCESSOR_SLUGS,
	PROCESSORS,
	processorAdminHref
} from '$lib/types/paymentProcessors';

type AdminLinks = Array<{
	section: string;
	icon: ComponentType;
	links: Array<{
		href: string;
		label: string;
		hidden?: boolean;
		/**
		 * Hide from the sidebar for non-super-admin users.
		 * Backend access is governed by role.permissions (handled by isAllowedOnPage).
		 */
		superAdminOnly?: boolean;
		/**
		 * Specific endpoints that we want to add explicit roles for.
		 */
		endpoints?: string[];
	}>;
}>;

export const adminLinks: AdminLinks = [
	{
		section: 'Merch',
		icon: IconShop,
		links: [
			{
				href: '/admin/layout',
				label: 'Layout'
			},
			{
				href: '/admin/product',
				label: 'Products'
			},
			{
				href: '/admin/ticket',
				label: 'Tickets',
				hidden: true,
				/**
				 * Note: this is also passed in runtimeConfig to create a special role TICKET_CHECKER_ROLE_ID
				 */
				endpoints: ['/admin/ticket/:id/burn']
			},
			{
				href: '/admin/picture',
				label: 'Pictures'
			},
			{
				href: '/admin/cms',
				label: 'CMS'
			},
			{
				href: '/admin/discount',
				label: 'Discount'
			},
			{
				href: '/admin/theme',
				label: 'Themes'
			},
			{
				href: '/admin/label',
				label: 'Labels'
			},
			{
				href: '/admin/digital-file',
				label: 'Files'
			},
			{
				href: '/admin/seo',
				label: 'SEO'
			}
		]
	},
	{
		section: 'Settings',
		icon: IconSetting,
		links: [
			{
				href: '/admin/config',
				label: 'General'
			},
			{
				href: '/admin/language',
				label: 'Languages'
			},
			{
				href: '/admin/arm',
				label: 'ARM'
			},
			{
				// Terminal rights by action, operator PINs and badges.
				href: '/admin/arm-pos',
				label: 'ARM PoS'
			},
			{
				href: '/admin/identity',
				label: 'Identity',
				superAdminOnly: true
			},
			{
				href: '/admin/physical-shop',
				label: 'Physical Shop',
				superAdminOnly: true
			},
			{
				href: '/admin/template',
				label: 'Templates'
			},
			{
				href: '/admin/pos',
				label: 'POS'
			},
			{
				// Where the switch between the full and the PoS back office is saved.
				href: '/admin/back-office-mode',
				label: 'Back office mode',
				hidden: true
			},
			{
				href: '/admin/age-retriction',
				label: 'Age restriction'
			},
			{
				href: '/admin/oauth',
				label: 'OAuth Providers'
			},
			{
				href: '/admin/s3',
				label: 'S3 Storage'
			},
			{
				href: '/admin/api-keys',
				label: 'API Keys',
				superAdminOnly: true
			},
			{
				// Version information, and the certificate of this be-BOP to download.
				href: '/admin/certification',
				label: 'Certification'
			}
		]
	},
	{
		section: 'Payment Settings',
		icon: IconWallet,
		links: [
			// One entry per processor that has settings, straight from the manifest: a processor
			// added there appears here, with its own label, and cannot be forgotten. The order is
			// the manifest's, so the list now groups by payment method instead of by whenever
			// each provider happened to be added.
			...ALL_PAYMENT_PROCESSOR_SLUGS.flatMap((slug) => {
				const href = processorAdminHref(slug);
				return href ? [{ href, label: PROCESSORS[slug].label }] : [];
			}),
			{
				// The Stripe Location the Tap to Pay terminals connect to.
				href: '/admin/stripe-terminal',
				label: 'Stripe Terminal'
			},
			{
				// PayPal on the terminals, apart from the shop's PayPal.
				href: '/admin/paypal-pos',
				label: 'PayPal POS'
			},
			// These two configure a method rather than a provider, so they have no manifest entry.
			{
				href: '/admin/pos-payments',
				label: 'PoS Payments'
			},
			{
				href: '/admin/custom-payments',
				label: 'Custom payment methods'
			}
		]
	},
	{
		section: 'Transaction',
		icon: IconTransaction,
		links: [
			{
				href: '/admin/order',
				label: 'Orders'
			},
			{
				href: '/admin/reporting',
				label: 'Reporting'
			},
			{
				// Taken on paired terminals, without an order.
				href: '/admin/terminal-payments',
				label: 'Terminal payments'
			},
			{
				href: '/admin/sales-logs',
				label: 'Sales Logs'
			}
		]
	},
	{
		section: 'Node Management',
		icon: IconCluster,
		links: [
			{
				href: '/admin/nostr',
				label: 'NostR'
			},
			{
				href: '/admin/smtp',
				label: 'SMTP'
			},
			{
				href: '/admin/email',
				label: 'Emails'
			}
		]
	},
	{
		section: 'Widgets',
		icon: IconDeploymentUnit,
		links: [
			{
				href: '/admin/challenge',
				label: 'Challenges'
			},
			{
				href: '/admin/tags',
				label: 'Tags'
			},
			{
				href: '/admin/slider',
				label: 'Sliders'
			},
			{
				href: '/admin/specification',
				label: 'Specifications'
			},
			{
				href: '/admin/form',
				label: 'Forms'
			},
			{
				href: '/admin/countdown',
				label: 'Countdowns'
			},
			{
				href: '/admin/gallery',
				label: 'Galleries'
			},
			{
				href: '/admin/schedule',
				label: 'Schedules'
			},
			{
				href: '/admin/leaderboard',
				label: 'Leaderboards'
			},
			{
				href: '/admin/searchlist',
				label: 'Searchlists'
			}
		]
	}
];

/**
 * The menu of the PoS back office, for a shop that only takes payments on its terminals. Every
 * entry is one of the full menu, so the role permissions read from it cover this menu too.
 */
const POS_MENU: Array<{ section: string; hrefs: string[] }> = [
	{
		section: 'Settings',
		hrefs: [
			'/admin/config',
			'/admin/arm',
			'/admin/arm-pos',
			'/admin/identity',
			'/admin/physical-shop',
			'/admin/template',
			'/admin/pos',
			// The keys a be-BOP-pos terminal pairs with.
			'/admin/api-keys',
			'/admin/certification',
			'/admin/back-office-mode'
		]
	},
	{
		section: 'Payment Settings',
		hrefs: [
			'/admin/phoenixd',
			'/admin/swiss-bitcoin-pay',
			'/admin/btcpay-server',
			'/admin/blink',
			'/admin/bitcoin-nodeless',
			'/admin/stripe',
			'/admin/stripe-terminal',
			'/admin/taler',
			'/admin/paypal',
			'/admin/paypal-pos'
		]
	},
	{
		section: 'Transaction',
		hrefs: ['/admin/terminal-payments', '/admin/reporting', '/admin/sales-logs']
	},
	{ section: 'Node Management', hrefs: ['/admin/smtp', '/admin/email', '/admin/nostr'] }
];

export const posAdminLinks: AdminLinks = POS_MENU.map(({ section, hrefs }) => {
	const fullSection = adminLinks.find((s) => s.section === section);
	return {
		section,
		icon: fullSection?.icon ?? IconSetting,
		links: hrefs.flatMap((href) => fullSection?.links.filter((link) => link.href === href) ?? [])
	};
});
