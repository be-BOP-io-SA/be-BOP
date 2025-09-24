import type { Product } from '$lib/types/Product';

export const TEST_PRODUCT_STOCK = 5;

export const TEST_DIGITAL_PRODUCT = {
	_id: 'test-product',
	name: 'Test product',
	alias: ['test-product'],
	description: 'Test product description',
	shortDescription: 'Test product short description',
	type: 'resource',
	price: {
		amount: 100,
		currency: 'EUR'
	},
	shipping: false,
	preorder: false,
	free: false,
	standalone: false,
	stock: {
		available: TEST_PRODUCT_STOCK,
		total: TEST_PRODUCT_STOCK,
		reserved: 0
	},
	isTicket: false,
	displayShortDescription: true,
	payWhatYouWant: false,
	createdAt: new Date(),
	updatedAt: new Date(),
	actionSettings: {
		eShop: {
			visible: true,
			canBeAddedToBasket: true
		},
		googleShopping: {
			visible: true
		},
		retail: {
			visible: true,
			canBeAddedToBasket: true
		},
		nostr: {
			visible: true,
			canBeAddedToBasket: true
		}
	},
	vatProfileId: undefined,
	hideDiscountExpiration: false
} satisfies Product;

export const TEST_PHYSICAL_PRODUCT = {
	_id: 'test-physical-product',
	name: 'Test product',
	alias: ['test-physical-product'],
	description: 'Test product description',
	shortDescription: 'Test product short description',
	type: 'resource',
	price: {
		amount: 100,
		currency: 'EUR'
	},
	shipping: true,
	preorder: false,
	free: false,
	standalone: false,
	stock: {
		available: TEST_PRODUCT_STOCK,
		total: TEST_PRODUCT_STOCK,
		reserved: 0
	},
	displayShortDescription: true,
	payWhatYouWant: false,
	createdAt: new Date(),
	updatedAt: new Date(),
	actionSettings: {
		eShop: {
			visible: true,
			canBeAddedToBasket: true
		},
		googleShopping: {
			visible: true
		},
		retail: {
			visible: true,
			canBeAddedToBasket: true
		},
		nostr: {
			visible: true,
			canBeAddedToBasket: true
		}
	},
	isTicket: false,
	vatProfileId: undefined,
	hideDiscountExpiration: false
} satisfies Product;

export const TEST_DIGITAL_PRODUCT_UNLIMITED = {
	_id: 'test-product-unlimited',
	name: 'Test product',
	alias: ['test-product-unlimited'],
	description: 'Test product description',
	shortDescription: 'Test product short description',
	type: 'resource',
	price: {
		amount: 100,
		currency: 'EUR'
	},
	shipping: false,
	preorder: false,
	free: false,
	standalone: false,
	displayShortDescription: true,
	payWhatYouWant: false,
	createdAt: new Date(),
	updatedAt: new Date(),
	actionSettings: {
		eShop: {
			visible: true,
			canBeAddedToBasket: true
		},
		googleShopping: {
			visible: true
		},
		retail: {
			visible: true,
			canBeAddedToBasket: true
		},
		nostr: {
			visible: true,
			canBeAddedToBasket: true
		}
	},
	isTicket: false,
	hideDiscountExpiration: false
} satisfies Product;

export const TEST_SUBSCRIPTION_PRODUCT = {
	_id: 'test-subscription-product',
	name: 'Test subscription product',
	alias: ['test-subscription-product'],
	description: 'Test subscription product description',
	shortDescription: 'Test subscription product short description',
	type: 'subscription',
	price: {
		amount: 100,
		currency: 'EUR'
	},
	shipping: false,
	preorder: false,
	free: false,
	standalone: false,
	isTicket: false,
	displayShortDescription: true,
	payWhatYouWant: false,
	createdAt: new Date(),
	updatedAt: new Date(),
	hideDiscountExpiration: false,
	actionSettings: {
		eShop: {
			visible: true,
			canBeAddedToBasket: true
		},
		googleShopping: {
			visible: true
		},
		retail: {
			visible: true,
			canBeAddedToBasket: true
		},
		nostr: {
			visible: true,
			canBeAddedToBasket: true
		}
	}
} satisfies Product;

export const TEST_DISCOUNTED_PRODUCT = {
	_id: 'test-discounted-product',
	type: 'resource',
	name: 'Test discounted product',
	alias: ['test-discounted-product'],
	description: 'Test discounted product description',
	shortDescription: 'Test discounted product short description',
	price: {
		amount: 100,
		currency: 'EUR'
	},
	shipping: false,
	preorder: false,
	free: false,
	standalone: false,
	isTicket: false,
	displayShortDescription: true,
	payWhatYouWant: false,
	createdAt: new Date(),
	updatedAt: new Date(),
	hideDiscountExpiration: false,
	actionSettings: {
		eShop: {
			visible: true,
			canBeAddedToBasket: true
		},
		googleShopping: {
			visible: true
		},
		retail: {
			visible: true,
			canBeAddedToBasket: true
		},
		nostr: {
			visible: true,
			canBeAddedToBasket: true
		}
	}
} satisfies Product;
