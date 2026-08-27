import { CURRENCIES } from '$lib/types/Currency';
import {
	API_V1_BATCH_STATUSES,
	API_V1_ERROR_CODES,
	API_V1_RESULT_STATUSES,
	API_V1_SCOPES,
	API_V1_WARNING_CODES
} from '$lib/types/ApiV1';
import { ORDER_PAYMENT_STATUSES } from '$lib/types/Order';

/**
 * Hand-maintained OpenAPI 3.0 document aligned with Zod schemas in
 * `schemas/orders-write.ts`. Prefer this over zod-to-openapi to avoid a heavy dep.
 */
export function buildOpenApiDocument(opts?: { serverUrl?: string }) {
	const currencyEnum = [...CURRENCIES];

	const AmountMinor = {
		type: 'integer',
		minimum: 0,
		description: 'Amount in minor units (integer).'
	} as const;

	const CustomPrice = {
		type: 'object',
		additionalProperties: false,
		required: ['amountMinor', 'currency'],
		properties: {
			amountMinor: { $ref: '#/components/schemas/AmountMinor' },
			currency: { type: 'string', enum: currencyEnum }
		}
	};

	const OrderItem = {
		type: 'object',
		additionalProperties: false,
		required: ['productId', 'quantity'],
		properties: {
			productId: { type: 'string', minLength: 1, maxLength: 200 },
			quantity: { type: 'integer', minimum: 1, maximum: 1_000_000 },
			customPrice: { $ref: '#/components/schemas/CustomPrice' },
			chosenVariations: {
				type: 'object',
				additionalProperties: { type: 'string' }
			},
			uniqueKey: {
				type: 'string',
				minLength: 1,
				maxLength: 128,
				pattern: '^[A-Za-z0-9_-]+$',
				description: 'Unique artifact secret from storefront ?key= (#2688).'
			}
		}
	};

	const OrderPayment = {
		type: 'object',
		additionalProperties: false,
		required: ['method', 'amountMinor', 'currency'],
		properties: {
			method: { type: 'string', enum: ['point-of-sale'] },
			status: {
				type: 'string',
				enum: ['pending', 'paid', 'canceled', 'failed', 'expired'],
				default: 'paid'
			},
			amountMinor: { $ref: '#/components/schemas/AmountMinor' },
			currency: { type: 'string', enum: currencyEnum },
			posLabel: { type: 'string', maxLength: 200 },
			externalPaymentId: {
				type: 'string',
				minLength: 1,
				maxLength: 200,
				description:
					'Strongly recommended on every payment: stable PoS payment id for safe retries, reordered payments[], and split/add payment matching. Without it, matching falls back to amountMinor+currency+method then unused index (legacy).'
			}
		}
	};

	const OrderWriteCommand = {
		type: 'object',
		additionalProperties: false,
		required: ['externalOrderId', 'currency', 'items'],
		properties: {
			externalOrderId: { type: 'string', minLength: 1, maxLength: 200 },
			currency: { type: 'string', enum: currencyEnum },
			createdAt: {
				type: 'string',
				format: 'date-time',
				description: 'Optional client timestamp (ISO-8601 with offset).'
			},
			items: {
				type: 'array',
				minItems: 1,
				maxItems: 500,
				items: { $ref: '#/components/schemas/OrderItem' }
			},
			payment: {
				$ref: '#/components/schemas/OrderPayment',
				description:
					'Singular payment (mono). Either payment or payments is required; payments wins when both are set.'
			},
			payments: {
				type: 'array',
				minItems: 1,
				maxItems: 50,
				items: { $ref: '#/components/schemas/OrderPayment' },
				description:
					'One or more payments. On duplicate settle: match by externalPaymentId, else amountMinor+currency+method, else unused index (legacy, no id). Never double-apply.'
			},
			customFields: {
				type: 'object',
				additionalProperties: {
					oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }]
				}
			},
			notes: { type: 'string', maxLength: 5000 }
		}
	};

	const OrderWriteRequest = {
		type: 'object',
		additionalProperties: false,
		required: ['orders'],
		properties: {
			orders: {
				type: 'array',
				minItems: 1,
				maxItems: 100,
				items: { $ref: '#/components/schemas/OrderWriteCommand' }
			}
		}
	};

	const ApiV1Warning = {
		type: 'object',
		required: ['code', 'message'],
		properties: {
			code: { type: 'string', enum: [...API_V1_WARNING_CODES] },
			message: { type: 'string' },
			productId: { type: 'string' },
			details: { type: 'object', additionalProperties: true }
		}
	};

	const OrderResult = {
		type: 'object',
		required: ['externalOrderId', 'status'],
		properties: {
			externalOrderId: { type: 'string' },
			status: { type: 'string', enum: [...API_V1_RESULT_STATUSES] },
			orderId: { type: 'string' },
			warnings: {
				type: 'array',
				items: { $ref: '#/components/schemas/ApiV1Warning' }
			},
			error: {
				type: 'object',
				required: ['code', 'message'],
				properties: {
					code: { type: 'string' },
					message: { type: 'string' },
					details: { type: 'object', additionalProperties: true }
				}
			}
		}
	};

	const OrdersWriteResponse = {
		type: 'object',
		required: ['ok', 'status', 'results'],
		properties: {
			ok: { type: 'boolean' },
			status: {
				type: 'string',
				enum: [...API_V1_BATCH_STATUSES]
			},
			results: {
				type: 'array',
				items: { $ref: '#/components/schemas/OrderResult' }
			}
		}
	};

	const ErrorEnvelope = {
		type: 'object',
		required: ['error'],
		properties: {
			error: {
				type: 'object',
				required: ['code', 'message'],
				properties: {
					code: { type: 'string', enum: [...API_V1_ERROR_CODES] },
					message: { type: 'string' },
					details: { type: 'object', additionalProperties: true }
				}
			}
		}
	};

	const scopeDescription =
		'`orders:write` — POST /api/v1/orders. `catalog:read` — GET /api/v1/catalog/products. `orders:read` — GET /api/v1/orders/paid.';

	const servers = opts?.serverUrl
		? [{ url: opts.serverUrl, description: 'This deployment' }]
		: [{ url: '/', description: 'Current host' }];

	const errorRef = { $ref: '#/components/schemas/ErrorEnvelope' };

	// Conditional GETs (#2713, RFC 9110). Reads only — POST /api/v1/orders relies on
	// (apiKeyId, externalOrderId) idempotency and takes no ETag precondition.
	const ifNoneMatchParam = {
		name: 'If-None-Match',
		in: 'header',
		required: false,
		schema: { type: 'string' },
		description:
			'Strong entity-tag returned by a previous read. When it still matches, the server answers 304 with no body.'
	};
	/**
	 * Order filters. Each is backed by an existing index on `orders`; a malformed value is
	 * rejected with 400 rather than dropped, so a filter never silently widens the result set.
	 */
	const orderFilterParams = [
		{
			name: 'productId',
			in: 'query',
			schema: { type: 'string' },
			description: 'Orders containing this product id on at least one line.'
		},
		{
			name: 'status',
			in: 'query',
			schema: { type: 'string', enum: [...ORDER_PAYMENT_STATUSES] },
			description: 'Order-level status.'
		},
		{
			name: 'number',
			in: 'query',
			schema: { type: 'integer', minimum: 1 },
			description: 'Exact order number.'
		},
		{
			name: 'label',
			in: 'query',
			schema: { type: 'string' },
			description: 'Orders carrying this order label id.'
		},
		{
			name: 'externalOrderId',
			in: 'query',
			schema: { type: 'string' },
			description:
				'Your own order reference. Always scoped to the calling API key — a reference issued by another key is never returned.'
		}
	];
	const etagResponseHeaders = {
		ETag: {
			description:
				'Strong validator (opaque SHA-256 of the JSON body). Replay it in If-None-Match.',
			schema: { type: 'string' }
		},
		'Cache-Control': {
			description: 'Always `private, no-cache` — per-API-key payloads must be revalidated.',
			schema: { type: 'string' }
		}
	};
	const notModifiedResponse = {
		description: 'Not modified — the If-None-Match validator still matches. Body is empty.',
		headers: etagResponseHeaders
	};

	return {
		openapi: '3.0.3',
		info: {
			title: 'be-BOP Public HTTP API',
			version: 'v1',
			description:
				'Face A — machine-to-machine PoS → be-BOP concentrator. Authenticate with Bearer or X-Api-Key (API key secret only; not a user session). See /api/v1/docs for Swagger UI. Scopes: ' +
				scopeDescription
		},
		servers,
		tags: [
			{ name: 'health', description: 'Liveness / readiness' },
			{ name: 'catalog', description: 'Catalog read' },
			{ name: 'orders', description: 'Order write (batch), paid-order poll and paid-order stream' },
			{ name: 'meta', description: 'API metadata' },
			{
				name: 'pos',
				description:
					"be-BOP's point-of-sale surface, for a register or any system that sells on be-BOP's " +
					'behalf. Its own `pos:*` scopes, so a register credential unlocks this and nothing else. ' +
					'Same authentication as the rest of v1; the wire shapes differ because a register does: ' +
					'be-BOP `Price` in major units, product slugs, whole documents instead of paginated ' +
					'envelopes, and payloads carrying only what a register acts on.'
			}
		],
		paths: {
			'/api/v1/health': {
				get: {
					tags: ['health'],
					summary: 'Health check',
					operationId: 'getHealth',
					security: [],
					responses: {
						'200': {
							description: 'Service is up',
							content: {
								'application/json': {
									schema: {
										type: 'object',
										required: ['ok', 'version'],
										properties: {
											ok: { type: 'boolean', example: true },
											version: { type: 'string', example: 'v1' }
										}
									}
								}
							}
						}
					}
				}
			},
			'/api/v1/openapi.json': {
				get: {
					tags: ['meta'],
					summary: 'OpenAPI document',
					operationId: 'getOpenApi',
					security: [],
					responses: {
						'200': {
							description: 'OpenAPI 3 JSON',
							content: {
								'application/json': {
									schema: { type: 'object', additionalProperties: true }
								}
							}
						}
					}
				}
			},
			'/api/v1/docs': {
				get: {
					tags: ['meta'],
					summary: 'Swagger UI',
					operationId: 'getDocs',
					security: [],
					responses: {
						'200': {
							description: 'HTML Swagger UI pointing at /api/v1/openapi.json'
						}
					}
				}
			},
			'/api/v1/catalog/products': {
				get: {
					tags: ['catalog'],
					summary: 'List catalog products',
					operationId: 'listCatalogProducts',
					security: [{ BearerAuth: ['catalog:read'] }, { ApiKeyAuth: ['catalog:read'] }],
					parameters: [
						{
							name: 'picture',
							in: 'query',
							schema: { type: 'string', enum: ['url', 'data-uri', 'none'], default: 'url' },
							description:
								'`url` links each size into be-BOP (default). `data-uri` inlines the bytes, so one call ' +
								'carries the images and no follow-up request is needed — pair it with a single `sizes` ' +
								'bucket. `none` omits the picture entirely.'
						},
						{
							name: 'sizes',
							in: 'query',
							schema: { type: 'string', pattern: '^(all|[1-9][0-9]*)$', default: 'all' },
							description:
								'`all` returns every generated size (default). A bucket — xs/s/m/l/xl, i.e. ' +
								'128/256/512/1024/2048 px — returns just that one. A source too small for the bucket ' +
								'resolves to the largest size at or below it, and to the smallest when even that is ' +
								'too large, so a picture is never missing because of the bucket asked for.'
						},
						{
							name: 'type',
							in: 'query',
							schema: { type: 'string', enum: ['resource', 'subscription', 'donation'] }
						},
						{
							name: 'tags',
							in: 'query',
							schema: { type: 'string' },
							description: 'Comma-separated tag ids'
						},
						{
							name: 'limit',
							in: 'query',
							schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
						},
						{ name: 'cursor', in: 'query', schema: { type: 'string' } },
						ifNoneMatchParam,
						{
							name: 'lang',
							in: 'query',
							schema: { type: 'string' },
							description: 'Locale (en, fr, …)'
						}
					],
					responses: {
						'200': {
							description: 'Catalog page',
							headers: etagResponseHeaders,
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/CatalogListResponse' }
								}
							}
						},
						'304': notModifiedResponse,
						'401': {
							description: 'Missing or invalid API key',
							content: { 'application/json': { schema: errorRef } }
						},
						'403': {
							description: 'Missing required scope',
							content: { 'application/json': { schema: errorRef } }
						},
						'429': {
							description:
								'Rate limited. Retry-After header = remaining seconds until the rate-limit window resets (ceil, minimum 1).',
							headers: {
								'Retry-After': {
									description: 'Seconds to wait before retrying (remaining window).',
									schema: { type: 'integer', minimum: 1 }
								}
							},
							content: { 'application/json': { schema: errorRef } }
						},
						'503': {
							description: 'Maintenance',
							content: { 'application/json': { schema: errorRef } }
						},
						'500': {
							description: 'Internal error',
							content: { 'application/json': { schema: errorRef } }
						}
					}
				}
			},
			'/api/v1/catalog/products/{id}': {
				get: {
					tags: ['catalog'],
					summary: 'Get one catalog product',
					operationId: 'getCatalogProduct',
					security: [{ BearerAuth: ['catalog:read'] }, { ApiKeyAuth: ['catalog:read'] }],
					parameters: [
						{
							name: 'picture',
							in: 'query',
							schema: { type: 'string', enum: ['url', 'data-uri', 'none'], default: 'url' },
							description:
								'`url` links each size into be-BOP (default). `data-uri` inlines the bytes, so one call ' +
								'carries the images and no follow-up request is needed — pair it with a single `sizes` ' +
								'bucket. `none` omits the picture entirely.'
						},
						{
							name: 'sizes',
							in: 'query',
							schema: { type: 'string', pattern: '^(all|[1-9][0-9]*)$', default: 'all' },
							description:
								'`all` returns every generated size (default). A bucket — xs/s/m/l/xl, i.e. ' +
								'128/256/512/1024/2048 px — returns just that one. A source too small for the bucket ' +
								'resolves to the largest size at or below it, and to the smallest when even that is ' +
								'too large, so a picture is never missing because of the bucket asked for.'
						},
						{ name: 'id', in: 'path', required: true, schema: { type: 'string' } },
						{ name: 'lang', in: 'query', schema: { type: 'string' } },
						ifNoneMatchParam
					],
					responses: {
						'200': {
							description: 'Product',
							headers: etagResponseHeaders,
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/CatalogProductResponse' }
								}
							}
						},
						'304': notModifiedResponse,
						'404': {
							description: 'Product not found or not visible',
							content: { 'application/json': { schema: errorRef } }
						},
						'401': {
							description: 'Missing or invalid API key',
							content: { 'application/json': { schema: errorRef } }
						},
						'403': {
							description: 'Missing required scope',
							content: { 'application/json': { schema: errorRef } }
						},
						'429': {
							description:
								'Rate limited. Retry-After header = remaining seconds until the rate-limit window resets (ceil, minimum 1).',
							headers: {
								'Retry-After': {
									description: 'Seconds to wait before retrying (remaining window).',
									schema: { type: 'integer', minimum: 1 }
								}
							},
							content: { 'application/json': { schema: errorRef } }
						},
						'503': {
							description: 'Maintenance',
							content: { 'application/json': { schema: errorRef } }
						},
						'500': {
							description: 'Internal error',
							content: { 'application/json': { schema: errorRef } }
						}
					}
				}
			},
			'/api/v1/orders/paid': {
				get: {
					tags: ['orders'],
					summary: 'List paid orders (poll; see /api/v1/orders/paid/stream for SSE)',
					operationId: 'listPaidOrders',
					security: [{ BearerAuth: ['orders:read'] }, { ApiKeyAuth: ['orders:read'] }],
					parameters: [
						{ name: 'since', in: 'query', schema: { type: 'string', format: 'date-time' } },
						{ name: 'until', in: 'query', schema: { type: 'string', format: 'date-time' } },
						{
							name: 'limit',
							in: 'query',
							schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
						},
						{ name: 'cursor', in: 'query', schema: { type: 'string' } },
						...orderFilterParams,
						ifNoneMatchParam
					],
					responses: {
						'200': {
							description: 'Paid orders only. Unpaid rows are never returned.',
							headers: etagResponseHeaders,
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/PaidOrdersResponse' }
								}
							}
						},
						'304': notModifiedResponse,
						'401': {
							description: 'Missing or invalid API key',
							content: { 'application/json': { schema: errorRef } }
						},
						'403': {
							description: 'Missing required scope',
							content: { 'application/json': { schema: errorRef } }
						},
						'429': {
							description:
								'Rate limited. Retry-After header = remaining seconds until the rate-limit window resets (ceil, minimum 1).',
							headers: {
								'Retry-After': {
									description: 'Seconds to wait before retrying (remaining window).',
									schema: { type: 'integer', minimum: 1 }
								}
							},
							content: { 'application/json': { schema: errorRef } }
						},
						'503': {
							description: 'Maintenance',
							content: { 'application/json': { schema: errorRef } }
						},
						'500': {
							description: 'Internal error',
							content: { 'application/json': { schema: errorRef } }
						}
					}
				}
			},
			'/api/v1/catalog/products/{id}/picture/{width}': {
				get: {
					tags: ['catalog'],
					summary: 'One size of a product picture',
					description:
						'The image bytes for one of the widths `picture.formats` lists. The storefront serves ' +
						'the same objects from `/picture/raw`, but that route lives in the app route group, which ' +
						'headless mode gates or bypasses (#2616) — an API linking there would break in exactly ' +
						'the mode it exists for. ' +
						'Unauthenticated, because a custom storefront renders these in a browser and a key would ' +
						'break every plain `<img src>`. Access is bounded by product visibility instead: an image ' +
						'is reachable only for a product the catalog would name.',
					operationId: 'getCatalogProductPictureSize',
					security: [],
					parameters: [
						{
							name: 'id',
							in: 'path',
							required: true,
							schema: { type: 'string' },
							description: 'Product id or alias.'
						},
						{
							name: 'width',
							in: 'path',
							required: true,
							schema: { type: 'integer', minimum: 1 },
							description:
								'One of the widths `picture.formats` lists. A width be-BOP never generated is a 404 ' +
								'rather than a silent substitution.'
						}
					],
					responses: {
						'200': {
							description: 'The image.',
							content: { 'image/webp': { schema: { type: 'string', format: 'binary' } } }
						},
						'302': {
							description:
								'Redirect to the object store, when the shop does not proxy downloads through be-BOP.'
						},
						'404': {
							description:
								'Product not found, not visible, without a picture, or without one in that size',
							content: { 'application/json': { schema: errorRef } }
						},
						'500': {
							description: 'Internal error',
							content: { 'application/json': { schema: errorRef } }
						}
					}
				}
			},
			'/api/v1/catalog/products/{id}/picture': {
				get: {
					tags: ['catalog'],
					summary: "Where a product's picture lives, in every size",
					description:
						'JSON, like the rest of this surface: it answers which sizes exist and where, not "give ' +
						'me the bytes". The bytes come from the links it returns, which point at ' +
						'`/api/v1/catalog/products/{id}/picture/{width}`. ' +
						'The same object is embedded in `CatalogProduct.picture`; this exists for a caller that ' +
						"wants one product's sizes without re-reading a catalog page.",
					operationId: 'getCatalogProductPicture',
					security: [{ BearerAuth: ['catalog:read'] }, { ApiKeyAuth: ['catalog:read'] }],
					parameters: [
						{
							name: 'picture',
							in: 'query',
							schema: { type: 'string', enum: ['url', 'data-uri', 'none'], default: 'url' },
							description:
								'`url` links each size into be-BOP (default). `data-uri` inlines the bytes, so one call ' +
								'carries the images and no follow-up request is needed — pair it with a single `sizes` ' +
								'bucket. `none` omits the picture entirely.'
						},
						{
							name: 'sizes',
							in: 'query',
							schema: { type: 'string', pattern: '^(all|[1-9][0-9]*)$', default: 'all' },
							description:
								'`all` returns every generated size (default). A bucket — xs/s/m/l/xl, i.e. ' +
								'128/256/512/1024/2048 px — returns just that one. A source too small for the bucket ' +
								'resolves to the largest size at or below it, and to the smallest when even that is ' +
								'too large, so a picture is never missing because of the bucket asked for.'
						},
						{
							name: 'id',
							in: 'path',
							required: true,
							schema: { type: 'string' },
							description: 'Product id or alias, as accepted by /api/v1/catalog/products/{id}.'
						},
						ifNoneMatchParam
					],
					responses: {
						'200': {
							description: "The product's main picture and every size be-BOP generated for it.",
							headers: etagResponseHeaders,
							content: {
								'application/json': {
									schema: {
										type: 'object',
										required: ['ok', 'picture'],
										properties: {
											ok: { type: 'boolean' },
											picture: { $ref: '#/components/schemas/CatalogPicture' }
										}
									}
								}
							}
						},
						'304': notModifiedResponse,
						'401': {
							description: 'Missing or invalid API key',
							content: { 'application/json': { schema: errorRef } }
						},
						'403': {
							description: 'Missing required scope',
							content: { 'application/json': { schema: errorRef } }
						},
						'404': {
							description: 'Product not found, not visible, or without a picture',
							content: { 'application/json': { schema: errorRef } }
						},
						'429': {
							description: 'Rate limited.',
							headers: {
								'Retry-After': {
									description: 'Seconds to wait before retrying.',
									schema: { type: 'integer', minimum: 1 }
								}
							},
							content: { 'application/json': { schema: errorRef } }
						},
						'500': {
							description: 'Internal error',
							content: { 'application/json': { schema: errorRef } }
						}
					}
				}
			},
			'/api/v1/pos/products': {
				get: {
					tags: ['pos'],
					summary: 'PoS catalog (whole, ETag-cached)',
					description:
						'The full catalog the till may sell from, unpaginated. Poll it with `If-None-Match`: an ' +
						'unchanged catalog costs a bodyless 304. Ordering is deterministic, which is what makes ' +
						'the validator stable.',
					operationId: 'getPosCatalog',
					security: [{ BearerAuth: ['pos:read'] }, { ApiKeyAuth: ['pos:read'] }],
					parameters: [
						{
							name: 'picture',
							in: 'query',
							schema: { type: 'string', enum: ['url', 'data-uri', 'none'], default: 'url' },
							description:
								'`url` links each size into be-BOP (default). `data-uri` inlines the bytes, so one call ' +
								'carries the images and no follow-up request is needed — pair it with a single `sizes` ' +
								'bucket. `none` omits the picture entirely.'
						},
						{
							name: 'sizes',
							in: 'query',
							schema: { type: 'string', pattern: '^(all|[1-9][0-9]*)$', default: 'all' },
							description:
								'`all` returns every generated size (default). A bucket — xs/s/m/l/xl, i.e. ' +
								'128/256/512/1024/2048 px — returns just that one. A source too small for the bucket ' +
								'resolves to the largest size at or below it, and to the smallest when even that is ' +
								'too large, so a picture is never missing because of the bucket asked for.'
						},
						ifNoneMatchParam
					],
					responses: {
						'200': {
							description: 'Full catalog, plus the tags its products reference.',
							headers: etagResponseHeaders,
							content: {
								'application/json': {
									schema: {
										type: 'object',
										required: ['products', 'tags'],
										properties: {
											products: {
												type: 'array',
												items: { $ref: '#/components/schemas/PosCatalogProduct' }
											},
											tags: {
												type: 'array',
												items: { $ref: '#/components/schemas/PosCatalogTag' },
												description:
													'Only the tags the returned products carry. Without this dictionary ' +
													'`tagIds` is a list of opaque slugs and a till can label nothing.'
											}
										}
									}
								}
							}
						},
						'304': notModifiedResponse,
						'401': {
							description: 'Missing or invalid API key',
							content: { 'application/json': { schema: errorRef } }
						},
						'403': {
							description: 'Missing required scope',
							content: { 'application/json': { schema: errorRef } }
						},
						'429': {
							description: 'Rate limited.',
							headers: {
								'Retry-After': {
									description: 'Seconds to wait before retrying.',
									schema: { type: 'integer', minimum: 1 }
								}
							},
							content: { 'application/json': { schema: errorRef } }
						},
						'500': {
							description: 'Internal error',
							content: { 'application/json': { schema: errorRef } }
						}
					}
				}
			},
			'/api/v1/pos/orders/stream': {
				get: {
					tags: ['pos'],
					summary: 'Stream paid PoS orders (SSE)',
					description:
						'Server-sent events for orders that transitioned to paid. The `id:` line carries the ' +
						'order id, which is also in the payload and is what consumers deduplicate on — delivery ' +
						'is at-least-once. A `:heartbeat` comment is emitted at least every 30 seconds. ' +
						'No order is flagged as belonging to a particular integration — see `PosPaidOrderEvent`. ' +
						'Both resume hints are advisory and may be given together, singly, or not at ' +
						'all: an unknown `Last-Event-ID` starts the stream at the live edge rather than failing. ' +
						'Authentication uses the usual Bearer header, so a browser `EventSource` (which cannot ' +
						'set headers) is not a supported client — drive the stream over fetch.',
					operationId: 'streamPaidPosOrders',
					security: [{ BearerAuth: ['pos:stream'] }, { ApiKeyAuth: ['pos:stream'] }],
					parameters: [
						{
							name: 'since_ts',
							in: 'query',
							schema: { type: 'integer', format: 'int64', minimum: 0 },
							description: 'Unix epoch seconds; advisory replay hint, inclusive.'
						},
						{
							name: 'Last-Event-ID',
							in: 'header',
							schema: { type: 'string' },
							description:
								'Standard SSE resume header carrying the last order id seen; advisory. Unknown ids ' +
								'are ignored rather than rejected.'
						},
						{
							name: 'last_event_id',
							in: 'query',
							schema: { type: 'string' },
							description: 'Query-parameter form, for clients that cannot set the header.'
						},
						{
							name: 'tag',
							in: 'query',
							schema: { type: 'string' },
							description:
								'Narrow the feed to orders carrying a line whose product bears this tag, and reduce ' +
								'`amount` to that line — what an integration crediting a single item needs, not the ' +
								'total of a basket it did not sell. The event then also carries `key`, the ' +
								'storefront `?key=` that line was bought with. be-BOP holds no domain word: you name ' +
								'the tag. Omitted, every paid order is announced whole. An order carrying more than ' +
								'one line with the tag is not announced at all — there is no correct way to choose ' +
								'between them — and the condition is logged for the shop.'
						}
					],
					responses: {
						'200': {
							description: 'Event stream of paid orders.',
							content: {
								'text/event-stream': {
									schema: { $ref: '#/components/schemas/PosPaidOrderEvent' },
									example:
										'retry: 5000\n\n:ok\n\nid: 3f2a0c\ndata: {"orderId":"3f2a0c","amount":{"amount":20,"currency":"CHF"}}\n\n:heartbeat\n\n'
								}
							}
						},
						'400': {
							description: 'Malformed since_ts',
							content: { 'application/json': { schema: errorRef } }
						},
						'401': {
							description: 'Missing or invalid API key',
							content: { 'application/json': { schema: errorRef } }
						},
						'403': {
							description: 'Missing required scope',
							content: { 'application/json': { schema: errorRef } }
						},
						'429': {
							description: 'Rate limited, or too many concurrent streams for this API key.',
							headers: {
								'Retry-After': {
									description: 'Seconds to wait before reconnecting.',
									schema: { type: 'integer', minimum: 1 }
								}
							},
							content: { 'application/json': { schema: errorRef } }
						},
						'500': {
							description: 'Internal error',
							content: { 'application/json': { schema: errorRef } }
						}
					}
				}
			},
			'/api/v1/pos/orders': {
				get: {
					tags: ['pos'],
					summary: 'Paid PoS orders (poll)',
					description:
						'The primary transport for the paid-order feed. Same events and same `since_ts` / ' +
						'`last_event_id` vocabulary as the SSE stream on /api/v1/pos/orders/stream, so a client ' +
						'that cannot hold a connection open polls here without relearning anything. ' +
						'`nextCursor` is the last order id of the page — feed it back as `last_event_id` — and ' +
						'is null once the page is the tail. Delivery is at-least-once: deduplicate on `orderId`.',
					operationId: 'listPaidPosOrders',
					security: [{ BearerAuth: ['pos:read'] }, { ApiKeyAuth: ['pos:read'] }],
					parameters: [
						{
							name: 'since_ts',
							in: 'query',
							schema: { type: 'integer', format: 'int64', minimum: 0 },
							description: 'Unix epoch seconds; advisory replay hint, inclusive.'
						},
						{
							name: 'last_event_id',
							in: 'query',
							schema: { type: 'string' },
							description:
								'The last order id seen — from a previous `nextCursor`, or from the stream. Unknown ' +
								'ids are ignored rather than rejected.'
						},
						{
							name: 'tag',
							in: 'query',
							schema: { type: 'string' },
							description:
								'Narrow the feed to orders carrying a line whose product bears this tag, and reduce ' +
								'`amount` to that line — what an integration crediting a single item needs, not the ' +
								'total of a basket it did not sell. The event then also carries `key`, the ' +
								'storefront `?key=` that line was bought with. be-BOP holds no domain word: you name ' +
								'the tag. Omitted, every paid order is announced whole. An order carrying more than ' +
								'one line with the tag is not announced at all — there is no correct way to choose ' +
								'between them — and the condition is logged for the shop.'
						},
						{
							name: 'limit',
							in: 'query',
							schema: { type: 'integer', minimum: 1, maximum: 500, default: 100 }
						},
						ifNoneMatchParam
					],
					responses: {
						'200': {
							description: 'One page of paid orders.',
							headers: etagResponseHeaders,
							content: {
								'application/json': {
									schema: {
										type: 'object',
										required: ['orders', 'nextCursor'],
										properties: {
											orders: {
												type: 'array',
												items: { $ref: '#/components/schemas/PosPaidOrderEvent' }
											},
											nextCursor: { type: 'string', nullable: true }
										}
									}
								}
							}
						},
						'304': notModifiedResponse,
						'400': {
							description: 'Malformed since_ts or limit',
							content: { 'application/json': { schema: errorRef } }
						},
						'401': {
							description: 'Missing or invalid API key',
							content: { 'application/json': { schema: errorRef } }
						},
						'403': {
							description: 'Missing required scope',
							content: { 'application/json': { schema: errorRef } }
						},
						'429': {
							description: 'Rate limited.',
							headers: {
								'Retry-After': {
									description: 'Seconds to wait before retrying.',
									schema: { type: 'integer', minimum: 1 }
								}
							},
							content: { 'application/json': { schema: errorRef } }
						},
						'500': {
							description: 'Internal error',
							content: { 'application/json': { schema: errorRef } }
						}
					}
				},
				post: {
					tags: ['pos'],
					summary: 'Push PoS sales, batched',
					description:
						'Idempotent per `externalOrderId` (the seam calls it `saleRef`): the same reference ' +
						're-pushed with an equal payload — every ' +
						'field matching, amounts compared numerically and `soldAt` as the same instant — is a ' +
						'`success` no-op. Any field differing is a `conflict`, and `orderUrl` then points at the ' +
						'order that already holds the reference. A malformed batch is rejected whole and nothing ' +
						'is ingested. A sale that cannot be ingested at all has no order to point at and so no ' +
						'representable outcome here: the request fails rather than inventing a status — 400 when ' +
						'the shop refuses it for good, 500 when a retry may still clear it. Retrying the batch is ' +
						'safe either way — the reference turns whatever already landed into a `success` no-op.',
					operationId: 'pushPosSales',
					security: [{ BearerAuth: ['pos:write'] }, { ApiKeyAuth: ['pos:write'] }],
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: {
									type: 'array',
									minItems: 1,
									maxItems: 100,
									items: { $ref: '#/components/schemas/PosSale' }
								}
							}
						}
					},
					responses: {
						'200': {
							description: 'Batch processed; one outcome per pushed sale, in the order pushed.',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/PosSalesResponse' }
								}
							}
						},
						'400': {
							description:
								'Either the payload is malformed and nothing was ingested, or the shop refused a ' +
								'sale for a reason a retry will not change — an unsupported currency, an unknown ' +
								'product. `details` then names the refused `externalOrderId`, the domain `code` ' +
								'behind it, and `ingested`: the references of the same batch that did land. Fix ' +
								'the batch and push it whole again; the listed references settle as `success` ' +
								'no-ops. Do not retry unchanged.',
							content: { 'application/json': { schema: errorRef } }
						},
						'401': {
							description: 'Missing or invalid API key',
							content: { 'application/json': { schema: errorRef } }
						},
						'403': {
							description: 'Missing required scope',
							content: { 'application/json': { schema: errorRef } }
						},
						'429': {
							description: 'Rate limited.',
							headers: {
								'Retry-After': {
									description: 'Seconds to wait before retrying.',
									schema: { type: 'integer', minimum: 1 }
								}
							},
							content: { 'application/json': { schema: errorRef } }
						},
						'500': {
							description: 'The sale could not be ingested for a reason a retry may clear.',
							content: { 'application/json': { schema: errorRef } }
						}
					}
				}
			},
			'/api/v1/orders/paid/stream': {
				get: {
					tags: ['orders'],
					summary: 'Stream paid orders (SSE)',
					description:
						'Server-Sent Events. Each paid order is one frame: `id: <cursor>` then `data: <PaidOrder>`. ' +
						'A `:heartbeat` comment is sent at least every 30 seconds so a silent connection can be told ' +
						'from a dead one, and a `retry:` hint opens the stream. The `id` is an opaque resume cursor — ' +
						'replay it in `Last-Event-ID` (or the `last_event_id` query parameter) to pick up where the ' +
						'connection dropped. Delivery is at-least-once: dedupe on `orderId`. Without `since_ts` or ' +
						'`Last-Event-ID` the stream starts at the live edge and replays nothing. ' +
						'Authentication uses the same Bearer / X-Api-Key headers as the rest of v1, so a browser ' +
						'`EventSource` (which cannot set headers) is not a supported client — drive the stream over fetch.',
					operationId: 'streamPaidOrders',
					security: [{ BearerAuth: ['orders:stream'] }, { ApiKeyAuth: ['orders:stream'] }],
					parameters: [
						{
							name: 'since_ts',
							in: 'query',
							schema: { type: 'integer', minimum: 0 },
							description:
								'Replay paid orders updated at or after this instant, in whole seconds since the Unix epoch.'
						},
						{
							name: 'since',
							in: 'query',
							schema: { type: 'string', format: 'date-time' },
							description: 'ISO 8601 alternative to since_ts. Ignored when since_ts is present.'
						},
						{
							name: 'Last-Event-ID',
							in: 'header',
							schema: { type: 'string' },
							description:
								'Resume cursor from the last `id:` received. Rejected with 400 when it was not issued by this stream.'
						},
						{
							name: 'last_event_id',
							in: 'query',
							schema: { type: 'string' },
							description:
								'Query-parameter form of Last-Event-ID, for clients that cannot set the header.'
						}
					],
					responses: {
						'200': {
							description: 'Event stream of paid orders.',
							content: {
								'text/event-stream': {
									schema: { type: 'string' },
									example:
										'retry: 5000\n\n:ok\n\nid: 1735689600000:1f0c8e3a-…\ndata: {"orderId":"1f0c8e3a-…","number":42,"amountPaid":{"amountMinor":1250,"currency":"EUR"},"items":[]}\n\n:heartbeat\n\n'
								}
							}
						},
						'400': {
							description: 'Malformed since_ts or Last-Event-ID',
							content: { 'application/json': { schema: errorRef } }
						},
						'401': {
							description: 'Missing or invalid API key',
							content: { 'application/json': { schema: errorRef } }
						},
						'403': {
							description: 'Missing required scope',
							content: { 'application/json': { schema: errorRef } }
						},
						'429': {
							description:
								'Rate limited, or too many concurrent streams already open for this API key.',
							headers: {
								'Retry-After': {
									description: 'Seconds to wait before reconnecting.',
									schema: { type: 'integer', minimum: 1 }
								}
							},
							content: { 'application/json': { schema: errorRef } }
						},
						'500': {
							description: 'Internal error',
							content: { 'application/json': { schema: errorRef } }
						}
					}
				}
			},
			'/api/v1/orders': {
				post: {
					tags: ['orders'],
					summary: 'Write orders (batch)',
					operationId: 'postOrders',
					security: [{ BearerAuth: ['orders:write'] }, { ApiKeyAuth: ['orders:write'] }],
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/OrderWriteRequest' },
								example: {
									orders: [
										{
											externalOrderId: 'pos-ticket-1001',
											currency: 'EUR',
											items: [{ productId: 'espresso', quantity: 1 }],
											payments: [
												{
													method: 'point-of-sale',
													status: 'paid',
													amountMinor: 350,
													currency: 'EUR',
													externalPaymentId: 'pos-pay-1001-a'
												}
											]
										}
									]
								}
							}
						}
					},
					responses: {
						'200': {
							description: 'Batch processed (may include per-command warnings/errors). Not 207.',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/OrdersWriteResponse' }
								}
							}
						},
						'400': {
							description: 'Validation error',
							content: { 'application/json': { schema: errorRef } }
						},
						'401': {
							description: 'Missing or invalid API key',
							content: { 'application/json': { schema: errorRef } }
						},
						'403': {
							description: 'Missing required scope (orders:write)',
							content: { 'application/json': { schema: errorRef } }
						},
						'429': {
							description:
								'Rate limited. Retry-After header = remaining seconds until the rate-limit window resets (ceil, minimum 1).',
							headers: {
								'Retry-After': {
									description: 'Seconds to wait before retrying (remaining window).',
									schema: { type: 'integer', minimum: 1 }
								}
							},
							content: { 'application/json': { schema: errorRef } }
						},
						'503': {
							description: 'Maintenance',
							content: { 'application/json': { schema: errorRef } }
						},
						'500': {
							description: 'Internal error',
							content: { 'application/json': { schema: errorRef } }
						}
					}
				}
			}
		},
		components: {
			schemas: {
				AmountMinor,
				CustomPrice,
				OrderItem,
				OrderPayment,
				OrderWriteCommand,
				OrderWriteRequest,
				ApiV1Warning,
				OrderResult,
				OrdersWriteResponse,
				ErrorEnvelope,
				CatalogPicture: {
					type: 'object',
					description:
						"A product's main picture — its first, on the same ranking the PoS uses — in every size " +
						'be-BOP generated for it. Absent from a product that has none. The links point at ' +
						'be-BOP, never at object storage: a presigned bucket URL proves the caller is authorized ' +
						'without proving it can reach the bucket, and be-BOP is routinely deployed with S3 on a ' +
						'private address.',
					required: ['url', 'width', 'height', 'formats'],
					properties: {
						url: {
							type: 'string',
							format: 'uri',
							description: 'The lowest resolution — what to render by default.',
							example: 'https://shop.example/api/v1/catalog/products/tartiflette/picture/128'
						},
						width: { type: 'integer' },
						height: { type: 'integer' },
						formats: {
							type: 'array',
							description:
								'Every size, smallest first. The top-level url is the first of these; pick another ' +
								'instead of upscaling a thumbnail. A source small enough that be-BOP never ' +
								'downscaled it yields a single entry.',
							items: {
								type: 'object',
								required: ['url', 'width', 'height'],
								properties: {
									url: {
										type: 'string',
										format: 'uri',
										example: 'https://shop.example/api/v1/catalog/products/tartiflette/picture/512'
									},
									width: { type: 'integer' },
									height: { type: 'integer' }
								}
							}
						}
					}
				},
				CatalogProduct: {
					type: 'object',
					required: [
						'id',
						'alias',
						'type',
						'name',
						'shortDescription',
						'price',
						'payWhatYouWant',
						'shipping',
						'tagIds',
						'hasVariations'
					],
					properties: {
						id: { type: 'string' },
						alias: { type: 'array', items: { type: 'string' } },
						type: { type: 'string', enum: ['resource', 'subscription', 'donation'] },
						name: { type: 'string' },
						shortDescription: { type: 'string' },
						price: {
							type: 'object',
							required: ['amountMinor', 'currency'],
							properties: {
								amountMinor: { $ref: '#/components/schemas/AmountMinor' },
								currency: { type: 'string', enum: currencyEnum }
							}
						},
						vatRate: {
							type: 'number',
							example: 8.1,
							description:
								'VAT rate as a percentage, resolved against the shop country. `price` excludes it: ' +
								'what a customer pays is `price × (1 + vatRate / 100)`. Resolved server-side from ' +
								"the product's VAT profile so a caller cannot compute it differently from be-BOP; a " +
								'VAT-free shop publishes 0.'
						},
						payWhatYouWant: { type: 'boolean' },
						shipping: { type: 'boolean' },
						tagIds: { type: 'array', items: { type: 'string' } },
						hasVariations: { type: 'boolean' },
						picture: { $ref: '#/components/schemas/CatalogPicture' },
						stock: {
							type: 'object',
							properties: { available: { type: 'integer' } }
						}
					}
				},
				CatalogListResponse: {
					type: 'object',
					required: ['ok', 'language', 'products', 'page'],
					properties: {
						ok: { type: 'boolean' },
						language: { type: 'string' },
						products: { type: 'array', items: { $ref: '#/components/schemas/CatalogProduct' } },
						page: {
							type: 'object',
							required: ['limit', 'nextCursor'],
							properties: {
								limit: { type: 'integer' },
								nextCursor: { type: 'string', nullable: true }
							}
						}
					}
				},
				CatalogProductResponse: {
					type: 'object',
					required: ['ok', 'language', 'product'],
					properties: {
						ok: { type: 'boolean' },
						language: { type: 'string' },
						product: { $ref: '#/components/schemas/CatalogProduct' }
					}
				},
				PosPrice: {
					type: 'object',
					description: 'be-BOP `Price` on the wire — major units, without the storage `precision`.',
					required: ['amount', 'currency'],
					properties: {
						amount: { type: 'number', exclusiveMinimum: 0 },
						currency: { type: 'string', enum: currencyEnum }
					}
				},
				PosImageData: {
					allOf: [{ $ref: '#/components/schemas/CatalogPicture' }],
					description:
						'Mirrors be-BOP `ImageData`, and is the same object the general catalog returns — the ' +
						'seam and `/api/v1` disagree about amounts and identifiers, not about where an image ' +
						'lives.'
				},
				PosCatalogProduct: {
					type: 'object',
					description:
						'No price: you send `PosSaleItem.price` at sale time, so you already hold your own, and ' +
						'publishing be-BOP’s alongside would be a second source of truth for the same number. ' +
						'`tagIds` is the one addition — tags are how returnables are flagged — and a consumer ' +
						'written against the seam ignores it. `returnable` is not emitted and is not planned: ' +
						'returnables go through the tag widget, and tags are the single source of truth for them.',
					required: ['slug', 'name', 'shortDescription', 'tagIds', 'vatRate'],
					properties: {
						slug: {
							type: 'string',
							description: 'be-BOP product id. What `PosSaleItem.product` refers back to.'
						},
						name: { type: 'string' },
						shortDescription: { type: 'string' },
						picture: { $ref: '#/components/schemas/PosImageData' },
						tagIds: { type: 'array', items: { type: 'string' } },
						vatRate: {
							type: 'number',
							example: 8.1,
							description:
								'VAT rate as a percentage, resolved against the shop country — a register sells on ' +
								'the premises, so the buyer country never enters.'
						}
					}
				},
				PosCatalogTag: {
					type: 'object',
					description:
						"A tag referenced by the catalog, resolved. Mirrors what be-BOP's own PoS loads for the " +
						'same purpose. `family` is how be-BOP groups tags, and grouping is the point of a ' +
						'tag-driven widget.',
					required: ['id', 'name'],
					properties: {
						id: { type: 'string' },
						name: { type: 'string' },
						family: { type: 'string' }
					}
				},
				PosPaidOrderEvent: {
					type: 'object',
					description:
						'One paid be-BOP order. Consumers deduplicate on `orderId`. ' +
						'No order is flagged as belonging to a particular integration: an integration that acts ' +
						'on some orders and ignores the rest identifies them itself, by the tags their lines ' +
						'carry.',
					required: ['orderId', 'amount'],
					properties: {
						orderId: { type: 'string' },
						amount: {
							allOf: [{ $ref: '#/components/schemas/PosPrice' }],
							description:
								'What was received, VAT included — the whole order, or the tagged line alone when ' +
								'the request named a tag.'
						},
						key: {
							type: 'string',
							example: '3Qz8yTaVbNk7Rf2mWpXs',
							description:
								'The storefront `?key=` the tagged line was bought with, present when a tag was ' +
								'named and the line carried one. This is how an item scanned at the counter reaches ' +
								'the integration that acts on it.'
						},
						vat: {
							type: 'array',
							description:
								'The VAT contained in the amount above, one entry per rate. Absent when the order ' +
								'carries none. Snapshotted at payment time, not recomputed: a rate that changed ' +
								'since is not the rate that was charged.',
							items: {
								type: 'object',
								required: ['rate', 'amount'],
								properties: {
									rate: { type: 'number', example: 8.1 },
									amount: { type: 'number', example: 0.94 }
								}
							}
						}
					}
				},
				PosSaleItem: {
					type: 'object',
					required: ['product', 'quantity', 'price'],
					properties: {
						product: {
							type: 'string',
							description: 'Catalog product slug (see `PosCatalogProduct.slug`).'
						},
						quantity: { type: 'integer', minimum: 1 },
						price: {
							allOf: [{ $ref: '#/components/schemas/PosPrice' }],
							description: 'Unit price at sale time.'
						}
					}
				},
				PosSale: {
					type: 'object',
					required: ['externalOrderId', 'soldAt', 'items', 'totalPrice', 'method'],
					properties: {
						externalOrderId: {
							type: 'string',
							description:
								"Minted by the caller. Idempotency and correlation handle — never be-BOP's order id. " +
								"Named `saleRef` in the seam document; be-BOP's name is used here."
						},
						items: {
							type: 'array',
							minItems: 1,
							items: { $ref: '#/components/schemas/PosSaleItem' }
						},
						totalPrice: { $ref: '#/components/schemas/PosPrice' },
						method: {
							type: 'string',
							maxLength: 200,
							example: 'cashless',
							description:
								'Slug of the PoS payment subtype the shop configured. be-BOP models payment on two ' +
								'levels: an axis (always `point-of-sale` here) and this subtype, resolved against ' +
								"the shop's configured subtypes. A slug the shop has not configured raises a " +
								'POS_LABEL_UNKNOWN warning on each sale rather than a silent mislabel.'
						},
						soldAt: {
							type: 'string',
							format: 'date-time',
							example: '2026-07-29T14:03:00Z',
							description:
								'When the sale happened at the till, RFC 3339 with offset. Distinct from the ' +
								'ingestion time, which in a deferred batch may land much later; reporting and VAT ' +
								'day boundaries follow this. Bounded on the future only, at 24 hours: a sale ahead ' +
								'of now is a bug, while a sale in the past is a late batch and is accepted however ' +
								'old. The window is wide enough to absorb any timezone misconfiguration (at most ' +
								'14 hours) or daylight-saving shift.'
						}
					}
				},
				PosSalesResponse: {
					type: 'object',
					required: ['results'],
					properties: {
						results: {
							type: 'array',
							description: 'One outcome per pushed sale, in the order pushed.',
							items: {
								type: 'object',
								required: ['externalOrderId', 'status', 'orderUrl'],
								properties: {
									externalOrderId: { type: 'string' },
									status: { type: 'string', enum: ['success', 'conflict'] },
									orderUrl: {
										type: 'string',
										format: 'uri',
										description: 'URL of the be-BOP order.'
									}
								}
							}
						}
					}
				},
				PaidOrderItem: {
					type: 'object',
					required: ['productId', 'name', 'quantity', 'unitPrice'],
					properties: {
						productId: { type: 'string' },
						name: { type: 'string' },
						quantity: { type: 'integer' },
						uniqueKey: { type: 'string' },
						chosenVariations: { type: 'object', additionalProperties: { type: 'string' } },
						freeQuantity: {
							type: 'integer',
							description: 'Units given away on this line (POS offer). Absent when zero.'
						},
						unitPrice: {
							type: 'object',
							description:
								'Per-unit price after any line discount. Charged units = quantity - freeQuantity.',
							required: ['amountMinor', 'currency'],
							properties: {
								amountMinor: { $ref: '#/components/schemas/AmountMinor' },
								currency: { type: 'string', enum: currencyEnum }
							}
						}
					}
				},
				PaidOrder: {
					type: 'object',
					required: ['orderId', 'number', 'createdAt', 'amountPaid', 'items'],
					properties: {
						orderId: { type: 'string' },
						number: { type: 'integer' },
						createdAt: { type: 'string', format: 'date-time' },
						paidAt: { type: 'string', format: 'date-time', nullable: true },
						amountPaid: {
							type: 'object',
							description: 'What was received, VAT included.',
							required: ['amountMinor', 'currency'],
							properties: {
								amountMinor: { $ref: '#/components/schemas/AmountMinor' },
								currency: { type: 'string', enum: currencyEnum }
							}
						},
						vat: {
							type: 'array',
							description:
								'The VAT contained in `amountPaid`, one entry per rate, in the same currency. ' +
								'Absent when the order carries none. Snapshotted at payment time, not recomputed: ' +
								'a rate that changed since is not the rate that was charged.',
							items: {
								type: 'object',
								required: ['rate', 'amountMinor'],
								properties: {
									rate: { type: 'number', example: 8.1 },
									amountMinor: { $ref: '#/components/schemas/AmountMinor' }
								}
							}
						},
						items: { type: 'array', items: { $ref: '#/components/schemas/PaidOrderItem' } }
					}
				},
				PaidOrdersResponse: {
					type: 'object',
					required: ['ok', 'orders', 'page'],
					properties: {
						ok: { type: 'boolean' },
						orders: { type: 'array', items: { $ref: '#/components/schemas/PaidOrder' } },
						page: {
							type: 'object',
							required: ['limit', 'nextCursor'],
							properties: {
								limit: { type: 'integer' },
								nextCursor: { type: 'string', nullable: true }
							}
						}
					}
				}
			},
			securitySchemes: {
				BearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'API key',
					description:
						'Authorization: Bearer <secret> (bebop_ak_{live|test}_…). API key only — not a user session. Grantable scopes: ' +
						API_V1_SCOPES.join(', ') +
						'. ' +
						scopeDescription
				},
				ApiKeyAuth: {
					type: 'apiKey',
					in: 'header',
					name: 'X-Api-Key',
					description:
						'X-Api-Key: <secret>. Same secret as Bearer. Scopes: ' + API_V1_SCOPES.join(', ') + '.'
				}
			}
		}
	};
}

export type OpenApiDocument = ReturnType<typeof buildOpenApiDocument>;
