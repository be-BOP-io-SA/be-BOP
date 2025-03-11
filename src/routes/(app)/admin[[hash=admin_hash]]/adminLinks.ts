type AdminLinks = Array<{
	section: string;
	links: Array<{
		href: string;
		label: string;
		hidden?: boolean;
		/**
		 * Specific endpoints that we want to add explicit roles for.
		 */
		endpoints?: string[];
	}>;
}>;

export const adminLinks: AdminLinks = [
	{
		section: 'Merch',
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
		section: 'Config',
		links: [
			{
				href: '/admin/config',
				label: 'Config'
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
				label: 'Identity'
			},
			{
				href: '/admin/physical-shop',
				label: 'Physical Shop'
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
			}
		]
	},
	{
		section: 'Payment Settings',
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
				href: '/admin/phoenixd',
				label: 'PhoenixD'
			},
			{
				href: '/admin/paypal',
				label: 'Paypal'
			},
			{
				href: '/admin/bitcoind',
				label: 'Bitcoin core node'
			},
			{
				href: '/admin/lnd',
				label: 'Lightning LND node'
			}
		]
	},
	{
		section: 'Transaction',
		links: [
			{
				href: '/admin/order',
				label: 'Orders'
			},
			{
				href: '/admin/reporting',
				label: 'Reporting'
			}
		]
	},
	{
		section: 'Node Management',
		links: [
			{
				href: '/admin/nostr',
				label: 'NostR'
			},
			{
				href: '/admin/email',
				label: 'Emails'
			}
		]
	},
	{
		section: 'Widgets',
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
				href: '/admin/leaderboard',
				label: 'Leaderboards'
			}
		]
	}
];
