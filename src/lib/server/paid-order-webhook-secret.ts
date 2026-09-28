import { isAllowedOnPage, type Role } from '$lib/types/Role';

// Fixed pages under /admin/product/: a product slugged like one of them would share its permission path.
const RESERVED_ADMIN_PRODUCT_SLUGS = [
	'action-settings',
	'alias',
	'default-picture',
	'new',
	'prices',
	'seo',
	'tags'
];

interface WithWebhook {
	_id: string;
	paidOrderWebhook?: { apiRoute: string; secret: string };
}

// The secret is the HMAC key receivers trust: only a role that can save the product needs to see it.
export function withWebhookSecretForEditors<T extends WithWebhook>(
	product: T,
	role: Role | undefined
): T {
	if (!product.paidOrderWebhook) {
		return product;
	}

	const canEdit =
		!!role &&
		!RESERVED_ADMIN_PRODUCT_SLUGS.includes(product._id) &&
		isAllowedOnPage(role, `/admin/product/${product._id}`, 'write');

	return canEdit
		? product
		: { ...product, paidOrderWebhook: { ...product.paidOrderWebhook, secret: '' } };
}
