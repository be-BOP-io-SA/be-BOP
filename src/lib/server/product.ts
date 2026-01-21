import type { ClientSession } from 'mongodb';
import { collections } from './database';
import type { UserIdentifier } from '$lib/types/UserIdentifier';
import type { Product } from '$lib/types/Product';
import { getCartFromDb } from './cart';

/**
 * Amount of stock reserved in carts and pending orders.
 *
 * Finds ALL products that use the specified stock (either directly or via stockReference)
 * and returns the total reserved quantity across all of them.
 *
 * @param productId - ID of the product whose stock to check (can be either the product with stock or a product referencing it)
 * @returns Total quantity reserved in carts and pending orders for this stock
 *
 * @example
 * // Product A has stock, Product B references A's stock
 * amountOfStockReserved('A') // returns reserves for BOTH A and B
 * amountOfStockReserved('B') // returns reserves for BOTH A and B (same result!)
 */
export async function amountOfStockReserved(
	productId: string,
	opts?: {
		/** Include stock for outdated carts with this id */
		include?: UserIdentifier;
		/** Exclude stock for active carts with this id */
		exclude?: UserIdentifier;
		session?: ClientSession;
	}
): Promise<number> {
	const userIdentifier = opts?.include ?? opts?.exclude;
	const cart = userIdentifier ? await getCartFromDb({ user: userIdentifier }) : undefined;

	// Find all products that use this stock (either directly or via stockReference)
	const productIds = (
		await collections.products
			.find({
				$or: [{ _id: productId }, { 'stockReference.productId': productId }]
			})
			.project({ _id: 1 })
			.toArray()
	).map((p) => p._id);

	return (
		((
			await collections.carts
				.aggregate(
					[
						{
							$match: {
								'items.productId': { $in: productIds }
							}
						},
						{
							$unwind: '$items'
						},
						{
							$match: {
								'items.productId': { $in: productIds },
								$or: [
									{
										'items.reservedUntil': { $gt: new Date() }
									},
									...(opts?.include && cart
										? [
												{
													_id: cart._id
												}
										  ]
										: [])
								],
								...(opts?.exclude && cart && { _id: { $ne: cart._id } })
							}
						},
						{
							$group: {
								_id: null,
								total: {
									$sum: '$items.quantity'
								}
							}
						}
					],
					{
						session: opts?.session
					}
				)
				.next()
		)?.total ?? 0) +
		((
			await collections.orders
				.aggregate(
					[
						{
							$match: {
								'items.product._id': { $in: productIds },
								status: 'pending'
							}
						},
						{
							$unwind: '$items'
						},
						{
							$match: {
								'items.product._id': { $in: productIds }
							}
						},
						{
							$group: {
								_id: null,
								total: {
									$sum: '$items.quantity'
								}
							}
						}
					],
					{
						session: opts?.session
					}
				)
				.next()
		)?.total ?? 0)
	);
}

export async function refreshAvailableStockInDb(productId: string, session?: ClientSession) {
	const stockProduct = await resolveStockProduct(productId, session);

	if (!stockProduct) {
		console.warn(
			`Cannot refresh stock for product ${productId}: ` +
				`product not found or has no stock configuration`
		);
		return;
	}

	const amountReserved = await amountOfStockReserved(stockProduct._id, { session });

	await collections.products.updateOne(
		{
			_id: stockProduct._id,
			stock: { $exists: true }
		},
		[
			{
				$set: {
					'stock.reserved': amountReserved,
					'stock.available': { $subtract: ['$stock.total', amountReserved] }
				}
			}
		],
		{
			session
		}
	);
}

export async function amountOfProductSold(productId: string): Promise<number> {
	return (
		(
			await collections.orders
				.aggregate([
					{
						$match: {
							'items.product._id': productId,
							status: 'paid'
						}
					},
					{
						$unwind: '$items'
					},
					{
						$match: {
							'items.product._id': productId
						}
					},
					{
						$group: {
							_id: null,
							total: {
								$sum: '$items.quantity'
							}
						}
					}
				])
				.next()
		)?.total ?? 0
	);
}

/**
 * Resolve the product whose stock should be used.
 * If product has stockReference, return referenced product.
 * Otherwise return the product itself.
 */
export async function resolveStockProduct(
	productId: string,
	session?: ClientSession
): Promise<Product | null> {
	const product = await collections.products.findOne({ _id: productId }, { session });

	if (!product) {
		return null;
	}

	// If has reference, return referenced product
	if (product.stockReference?.productId) {
		return await collections.products.findOne(
			{ _id: product.stockReference.productId },
			{ session }
		);
	}

	// Otherwise return product itself
	return product;
}

/**
 * Validate stock reference.
 * - Referenced product must exist
 * - Referenced product must have stock
 * - Referenced product must NOT have stockReference (prevent cascade)
 * - No cyclic reference
 */
export async function validateStockReference(
	productId: string,
	stockReferenceProductId: string
): Promise<{ valid: boolean; error?: string }> {
	// Cannot reference self
	if (productId === stockReferenceProductId) {
		return {
			valid: false,
			error: 'Product cannot reference its own stock'
		};
	}

	// Check referenced product exists
	const referencedProduct = await collections.products.findOne({
		_id: stockReferenceProductId
	});

	if (!referencedProduct) {
		return {
			valid: false,
			error: `Referenced product ${stockReferenceProductId} does not exist`
		};
	}

	// Referenced product must have stock
	if (!referencedProduct.stock) {
		return {
			valid: false,
			error: 'Referenced product must have stock enabled'
		};
	}

	// Referenced product must NOT have stockReference (prevent cascade)
	if (referencedProduct.stockReference) {
		return {
			valid: false,
			error: 'Cascade references are forbidden. Referenced product cannot have stockReference.'
		};
	}

	return { valid: true };
}

export async function getProductsWithStock() {
	return collections.products
		.find({
			stock: { $exists: true },
			stockReference: { $exists: false }
		})
		.project<Pick<Product, '_id' | 'name'>>({ _id: 1, name: 1 })
		.toArray();
}

/**
 * Apply resolved stock to already loaded product.
 * Does NOT load from DB - works with existing product object.
 *
 * If product has stockReference, replaces its stock with the referenced product's stock.
 * Otherwise returns product unchanged.
 *
 * @example
 * const product = await collections.products.findOne({ _id: 'ricard' });
 * const withStock = await applyResolvedStock(product);
 * // withStock._id = 'ricard', withStock.stock = Whiskey's stock
 */
export async function applyResolvedStock<
	T extends {
		_id: string;
		stockReference?: { productId: string };
		stock?: { available: number; total: number; reserved: number };
	}
>(product: T, session?: ClientSession): Promise<T> {
	if (!product.stockReference?.productId) {
		return product;
	}

	const resolved = await resolveStockProduct(product._id, session);

	if (resolved?.stock) {
		return { ...product, stock: resolved.stock };
	}

	return product;
}

/**
 * Load product from DB and apply resolved stock.
 * Convenience wrapper around applyResolvedStock.
 */
export async function loadProductWithResolvedStock(
	productId: string,
	session?: ClientSession
): Promise<Product | null> {
	const product = await collections.products.findOne({ _id: productId }, { session });
	if (!product) {
		return null;
	}

	return await applyResolvedStock(product, session);
}

/**
 * Clean variation labels by removing empty strings from names and values.
 * Returns object with non-empty names and values only.
 */
export function cleanVariationLabels(variationLabels?: {
	names: Record<string, string>;
	values: Record<string, Record<string, string>>;
}): {
	names: Record<string, string>;
	values: Record<string, Record<string, string>>;
} {
	const names = Object.fromEntries(
		Object.entries(variationLabels?.names ?? {}).filter(([, v]) => v.trim() !== '')
	);

	const values = Object.fromEntries(
		Object.entries(variationLabels?.values ?? {})
			.map(([key, entries]) => [
				key,
				Object.fromEntries(Object.entries(entries).filter(([, v]) => v.trim() !== ''))
			])
			.filter(([, entries]) => Object.keys(entries).length > 0)
	);

	return { names, values };
}
