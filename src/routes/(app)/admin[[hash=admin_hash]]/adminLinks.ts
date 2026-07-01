import type { ComponentType } from 'svelte';
import IconShop from '~icons/ant-design/shop-outlined';
import IconSetting from '~icons/ant-design/setting-outlined';
import IconWallet from '~icons/ant-design/wallet-outlined';
import IconTransaction from '~icons/ant-design/transaction-outlined';
import IconCluster from '~icons/ant-design/cluster-outlined';
import IconDeploymentUnit from '~icons/ant-design/deployment-unit-outlined';

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
			}
		]
	},
	{
		section: 'Payment Settings',
		icon: IconWallet,
		links: [
			{
				href: '/admin/bitcoin-nodeless',
				label: 'Bitcoin nodeless'
			},
			{
				href: '/admin/sumup',
				label: 'SumUp'
			},
			{
				href: '/admin/stripe',
				label: 'Stripe'
			},
			{
				href: '/admin/btcpay-server',
				label: 'BTCPay Server'
			},
			{
				href: '/admin/phoenixd',
				label: 'PhoenixD'
			},
			{
				href: '/admin/paypal',
				label: 'Paypal'
			},
			{
				href: '/admin/swiss-bitcoin-pay',
				label: 'Swiss Bitcoin Pay'
			},
			{
				href: '/admin/bitcoind',
				label: 'Bitcoin core node'
			},
			{
				href: '/admin/lnd',
				label: 'Lightning LND node'
			},
			{
				href: '/admin/taler',
				label: 'Taler'
			},
			{
				href: '/admin/osb',
				label: 'OSB'
			},
			{
				href: '/admin/pos-payments',
				label: 'PoS Payments'
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
