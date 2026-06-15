import { addToCartInDb, checkCartItems, getCartFromDb } from '$lib/server/cart';
import { cmsFromContent } from '$lib/server/cms';
import { collections, withTransaction } from '$lib/server/database';
import { findActivePromoDiscount, hasAnyActivePromoDiscount } from '$lib/server/discount';
import { picturesForProducts } from '$lib/server/picture';
import { applyResolvedStock, refreshAvailableStockInDb } from '$lib/server/product.js';
import { rateLimit } from '$lib/server/rateLimit';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { userIdentifier, userQuery } from '$lib/server/user.js';
import type { Cart } from '$lib/types/Cart';
import type { Picture } from '$lib/types/Picture';
import type { Product } from '$lib/types/Product';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';

type SlugQty = { slug: string; quantity: number };
type ProductBadge = {
	slug: string;
	name: string;
	price: { amount: number; currency: string };
	picture: Picture | null;
};
type AddError = {
	slug: string;
	key: string;
	params?: Record<string, string | number>;
	product: ProductBadge | null;
};
type RequestedItem = {
	slug: string;
	quantity: number;
	product: ProductBadge | null;
};
export type CartFromUrlState =
	| { mode: 'confirm'; requested: RequestedItem[] }
	| { mode: 'reconcile'; requested: RequestedItem[] }
	| { mode: 'errors'; errors: AddError[]; snapshot: string }
	| { mode: 'invalidUrl' };

function parsePairsFrom(slugs: string[], qtys: string[]): SlugQty[] | null {
	if (!slugs.length || slugs.length !== qtys.length) return null;
	const out: SlugQty[] = [];
	for (let i = 0; i < slugs.length; i++) {
		const q = parseInt(qtys[i], 10);
		if (!Number.isFinite(q) || q < 1) return null;
		out.push({ slug: slugs[i], quantity: q });
	}
	return out;
}
const parsePairsFromUrl = (url: URL) =>
	parsePairsFrom(url.searchParams.getAll('slug'), url.searchParams.getAll('qty'));
const parsePairsFromForm = (fd: FormData) =>
	parsePairsFrom(fd.getAll('slug').map(String), fd.getAll('qty').map(String));

function isEmployeeFromLocals(locals: App.Locals): boolean {
	return locals.user?.roleId !== undefined && locals.user.roleId !== CUSTOMER_ROLE_ID;
}

function mapAddError(slug: string, message: string, product: ProductBadge | null): AddError {
	if (message === "Product can't be added to basket ")
		return { slug, key: 'product.notForSale', product };
	if (message === 'Product is out of stock')
		return { slug, key: 'product.outOfStock', product };
	if (message === 'Cart has too many items')
		return { slug, key: 'cart.reachedMaxPerLine', product };
	if (message === 'error matching on variations choice')
		return { slug, key: 'cartFromUrl.errors.reasonVariationRequired', product };
	if (message === 'Product is a booking, please provide booking time and duration')
		return { slug, key: 'cartFromUrl.errors.reasonBookingRequired', product };
	const m = message.match(/You can only order (\d+) of this product/);
	if (m)
		return {
			slug,
			key: 'pos.cart.maxQuantityReached',
			params: { max: Number(m[1]) },
			product
		};
	return { slug, key: 'cartFromUrl.errors.reasonGeneric', product };
}

async function resolveProductsBySlug(
	slugs: string[],
	locals: App.Locals
): Promise<Map<string, Product>> {
	const visibilityFilter = isEmployeeFromLocals(locals)
		? {}
		: { 'actionSettings.eShop.visible': true };
	const products = await collections.products
		.find({ alias: { $in: slugs }, ...visibilityFilter })
		.toArray();
	const bySlug = new Map<string, Product>();
	for (const slug of slugs) {
		const product = products.find((p) => p.alias.includes(slug));
		if (product) bySlug.set(slug, product);
	}
	return bySlug;
}

async function buildBadges(
	slugs: string[],
	productsBySlug: Map<string, Product>,
	language: string
): Promise<Map<string, ProductBadge>> {
	const productIds = [...new Set([...productsBySlug.values()].map((p) => p._id))];
	const pictures = productIds.length ? await picturesForProducts(productIds) : [];
	const picturesByProductId = new Map(pictures.map((p) => [p.productId, p]));
	const badges = new Map<string, ProductBadge>();
	for (const slug of slugs) {
		const product = productsBySlug.get(slug);
		if (!product) continue;
		const name = product.translations?.[language as keyof typeof product.translations]?.name ?? product.name;
		badges.set(slug, {
			slug,
			name,
			price: product.price,
			picture: picturesByProductId.get(product._id) ?? null
		});
	}
	return badges;
}

async function attemptAddAll(
	pairs: SlugQty[],
	locals: App.Locals,
	productsBySlug: Map<string, Product>,
	badges: Map<string, ProductBadge>
): Promise<AddError[]> {
	const user = userIdentifier(locals);
	const mode = user.userHasPosOptions ? 'pos' : 'eshop';
	const errors: AddError[] = [];
	for (const { slug, quantity } of pairs) {
		const product = productsBySlug.get(slug);
		const badge = badges.get(slug) ?? null;
		if (!product) {
			errors.push({ slug, key: 'cartFromUrl.errors.reasonNotFound', product: null });
			continue;
		}
		const customPrice = product.payWhatYouWant
			? {
					amount: product.recommendedPWYWAmount ?? product.price.amount,
					currency: product.price.currency
			  }
			: undefined;
		const splitsIntoUnitLines = product.standalone || product.payWhatYouWant;
		try {
			if (splitsIntoUnitLines) {
				for (let i = 0; i < quantity; i++) {
					await addToCartInDb(product, 1, {
						user,
						mode,
						...(customPrice && { customPrice })
					});
				}
			} else {
				await addToCartInDb(product, quantity, { user, mode });
			}
		} catch (e) {
			const msg =
				typeof e === 'object' && e && 'body' in e
					? ((e as { body?: { message?: string } }).body?.message ?? '')
					: '';
			errors.push(mapAddError(slug, msg, badge));
		}
	}
	return errors;
}

async function runAddAttempt(
	pairs: SlugQty[],
	locals: App.Locals,
	opts: { clearFirst: boolean }
): Promise<{ errors: AddError[]; snapshot: Cart['items'] }> {
	const user = userIdentifier(locals);
	const cartBefore = await getCartFromDb({ user });
	const snapshot = cartBefore.items.map((i) => ({ ...i }));
	if (opts.clearFirst && cartBefore.items.length > 0) {
		await collections.carts.updateOne(
			{ _id: cartBefore._id },
			{ $set: { items: [], updatedAt: new Date() } }
		);
	}
	const slugs = pairs.map((p) => p.slug);
	const productsBySlug = await resolveProductsBySlug(slugs, locals);
	const badges = await buildBadges(slugs, productsBySlug, locals.language);
	const errors = await attemptAddAll(pairs, locals, productsBySlug, badges);
	return { errors, snapshot };
}

export async function load({ parent, locals, url }) {
	if (
		runtimeConfig.hideCartInToolbar &&
		(locals.user?.roleId === undefined || locals.user.roleId === CUSTOMER_ROLE_ID)
	) {
		throw error(403, 'This page is not accessible ');
	}

	const parentData = await parent();

	// Resolve stock for cart items FIRST (needed for checkCartItems)
	const cartItemsWithResolvedStock = await Promise.all(
		parentData.cart.items.map(async (item) => ({
			...item,
			product: await applyResolvedStock(item.product)
		}))
	);

	if (parentData.cart) {
		try {
			await checkCartItems(cartItemsWithResolvedStock, { user: userIdentifier(locals) });
		} catch (err) {
			if (
				typeof err === 'object' &&
				err &&
				'body' in err &&
				typeof err.body === 'object' &&
				err.body &&
				'message' in err.body &&
				typeof err.body.message === 'string'
			) {
				return { errorMessage: err.body.message };
			}
		}
	}

	const [cmsBasketTop, cmsBasketBottom] = await Promise.all([
		collections.cmsPages.findOne(
			{
				_id: 'cart-top'
			},
			{
				projection: {
					content: { $ifNull: [`$translations.${locals.language}.content`, '$content'] },
					employeeContent: {
						$ifNull: [`$translations.${locals.language}.employeeContent`, '$employeeContent']
					},
					hasEmployeeContent: 1,
					title: { $ifNull: [`$translations.${locals.language}.title`, '$title'] },
					shortDescription: {
						$ifNull: [`$translations.${locals.language}.shortDescription`, '$shortDescription']
					},
					fullScreen: 1,
					maintenanceDisplay: 1
				}
			}
		),
		collections.cmsPages.findOne(
			{
				_id: 'cart-bottom'
			},
			{
				projection: {
					content: { $ifNull: [`$translations.${locals.language}.content`, '$content'] },
					employeeContent: {
						$ifNull: [`$translations.${locals.language}.employeeContent`, '$employeeContent']
					},
					hasEmployeeContent: 1,
					title: { $ifNull: [`$translations.${locals.language}.title`, '$title'] },
					shortDescription: {
						$ifNull: [`$translations.${locals.language}.shortDescription`, '$shortDescription']
					},
					fullScreen: 1,
					maintenanceDisplay: 1
				}
			}
		)
	]);
	const forceContentVersion =
		locals.user?.roleId !== undefined && locals.user?.roleId !== CUSTOMER_ROLE_ID
			? 'employee'
			: undefined;

	// Only show promo input if any active discount actually uses a promo code
	const hasPromoDiscounts = await hasAnyActivePromoDiscount();

	// Get the applied promo code from the cart in DB
	const cartInDb = await collections.carts.findOne(userQuery(userIdentifier(locals)), {
		projection: { promoCode: 1 }
	});

	let cartFromUrl: CartFromUrlState | undefined;
	if (runtimeConfig.allowCartFromUrl && (url.searchParams.has('slug') || url.searchParams.has('qty'))) {
		const pairs = parsePairsFromUrl(url);
		if (!pairs) {
			cartFromUrl = { mode: 'invalidUrl' };
		} else {
			const slugs = pairs.map((p) => p.slug);
			const productsBySlug = await resolveProductsBySlug(slugs, locals);
			const badges = await buildBadges(slugs, productsBySlug, locals.language);
			const requested: RequestedItem[] = pairs.map(({ slug, quantity }) => ({
				slug,
				quantity,
				product: badges.get(slug) ?? null
			}));
			cartFromUrl = {
				mode: parentData.cart.items.length === 0 ? 'confirm' : 'reconcile',
				requested
			};
		}
	}

	return {
		cart: {
			...parentData.cart,
			items: cartItemsWithResolvedStock
		},
		hasPromoDiscounts,
		appliedPromoCode: cartInDb?.promoCode,
		...(cartFromUrl && { cartFromUrl }),
		...(cmsBasketTop && {
			cmsBasketTop,
			cmsBasketTopData: cmsFromContent(
				{
					desktopContent: cmsBasketTop.content,
					employeeContent:
						(cmsBasketTop?.hasEmployeeContent && cmsBasketTop.employeeContent) || undefined,
					forceContentVersion
				},
				locals
			)
		}),
		...(cmsBasketBottom && {
			cmsBasketBottom,
			cmsBasketBottomData: cmsFromContent(
				{
					desktopContent: cmsBasketBottom.content,
					employeeContent:
						(cmsBasketBottom?.hasEmployeeContent && cmsBasketBottom.employeeContent) || undefined,
					forceContentVersion
				},
				locals
			)
		})
	};
}
export const actions = {
	applyPromoCode: async ({ request, locals }) => {
		try {
			rateLimit(locals.clientIp, 'promo-code', 20, { hours: 3 });
		} catch (e) {
			// rateLimit only throws SvelteKit error(429, ...) — log abuse and return form fail
			const status = (e as { status?: unknown })?.status;
			if (status === 429) {
				console.warn('Promo code rate limit hit', { clientIp: locals.clientIp });
				return fail(429, { promoRateLimited: true });
			}
			throw e;
		}

		const formData = await request.formData();
		const parsed = z.string().min(1).max(50).safeParse(formData.get('promoCode'));
		if (!parsed.success) {
			console.warn('Invalid promo code payload', { clientIp: locals.clientIp });
			return fail(400, { promoError: true });
		}

		const exists = await findActivePromoDiscount(parsed.data);
		if (!exists) {
			return fail(400, { promoError: true });
		}

		await collections.carts.updateOne(userQuery(userIdentifier(locals)), {
			$set: { promoCode: parsed.data, updatedAt: new Date() }
		});

		return { promoSuccess: true, promoCode: parsed.data };
	},

	removePromoCode: async ({ locals }) => {
		await collections.carts.updateOne(userQuery(userIdentifier(locals)), {
			$unset: { promoCode: '' },
			$set: { updatedAt: new Date() }
		});
		return { promoRemoved: true };
	},

	addFromUrl: async ({ request, locals }) => {
		if (!runtimeConfig.allowCartFromUrl) throw redirect(303, '/cart');
		const pairs = parsePairsFromForm(await request.formData());
		if (!pairs) return fail(400, { cartFromUrl: { mode: 'invalidUrl' as const } });
		const { errors, snapshot } = await runAddAttempt(pairs, locals, { clearFirst: false });
		if (errors.length === 0) throw redirect(303, '/cart?createdFromUrl=1');
		return fail(400, {
			cartFromUrl: {
				mode: 'errors' as const,
				errors,
				snapshot: JSON.stringify(snapshot)
			}
		});
	},

	replaceFromUrl: async ({ request, locals }) => {
		if (!runtimeConfig.allowCartFromUrl) throw redirect(303, '/cart');
		const pairs = parsePairsFromForm(await request.formData());
		if (!pairs) return fail(400, { cartFromUrl: { mode: 'invalidUrl' as const } });
		const { errors, snapshot } = await runAddAttempt(pairs, locals, { clearFirst: true });
		if (errors.length === 0) throw redirect(303, '/cart?createdFromUrl=1');
		return fail(400, {
			cartFromUrl: {
				mode: 'errors' as const,
				errors,
				snapshot: JSON.stringify(snapshot)
			}
		});
	},

	mergeFromUrl: async ({ request, locals }) => {
		if (!runtimeConfig.allowCartFromUrl) throw redirect(303, '/cart');
		const pairs = parsePairsFromForm(await request.formData());
		if (!pairs) return fail(400, { cartFromUrl: { mode: 'invalidUrl' as const } });
		const { errors, snapshot } = await runAddAttempt(pairs, locals, { clearFirst: false });
		if (errors.length === 0) throw redirect(303, '/cart?createdFromUrl=1');
		return fail(400, {
			cartFromUrl: {
				mode: 'errors' as const,
				errors,
				snapshot: JSON.stringify(snapshot)
			}
		});
	},

	clearAll: async ({ locals }) => {
		if (!runtimeConfig.allowCartFromUrl) throw redirect(303, '/cart');
		const user = userIdentifier(locals);
		const cart = await getCartFromDb({ user });
		await withTransaction(async (session) => {
			const productIds = cart.items.map((i) => i.productId);
			await collections.carts.updateOne(
				{ _id: cart._id },
				{ $set: { items: [], updatedAt: new Date() } },
				{ session }
			);
			for (const productId of productIds) {
				await refreshAvailableStockInDb(productId, session);
			}
		});
		throw redirect(303, '/cart');
	},

	rollbackNew: async ({ request, locals }) => {
		if (!runtimeConfig.allowCartFromUrl) throw redirect(303, '/cart');
		const fd = await request.formData();
		const raw = String(fd.get('snapshot') ?? '[]');
		let snapshotItems: Cart['items'];
		try {
			snapshotItems = JSON.parse(raw);
		} catch {
			throw redirect(303, '/cart');
		}
		const user = userIdentifier(locals);
		const cart = await getCartFromDb({ user });
		await withTransaction(async (session) => {
			const allProductIds = new Set([
				...cart.items.map((i) => i.productId),
				...snapshotItems.map((i) => i.productId)
			]);
			await collections.carts.updateOne(
				{ _id: cart._id },
				{ $set: { items: snapshotItems, updatedAt: new Date() } },
				{ session }
			);
			for (const productId of allProductIds) {
				await refreshAvailableStockInDb(productId, session);
			}
		});
		throw redirect(303, '/cart');
	},

	removeAll: async ({ locals, request }) => {
		const cart = await collections.carts.findOne(userQuery(userIdentifier(locals)));
		if (!cart) {
			throw error(404, 'Cart not found');
		}

		cart.items = [];

		await withTransaction(async (session) => {
			await collections.carts.updateOne(
				{ _id: cart._id },
				{ $set: { items: cart.items, updatedAt: new Date() } },
				{ session }
			);

			// Refresh available stock for all products in the cart
			for (const item of cart.items) {
				await refreshAvailableStockInDb(item.productId, session);
			}
		});

		throw redirect(303, request.headers.get('referer') || '/cart');
	}
};
