import { CURRENCIES } from '$lib/types/Currency';
import {
	API_V1_BATCH_STATUSES,
	API_V1_ERROR_CODES,
	API_V1_RESULT_STATUSES,
	API_V1_SCOPES,
	API_V1_WARNING_CODES
} from '$lib/types/ApiV1';

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
			{ name: 'orders', description: 'Order write (batch) and paid-order read' },
			{ name: 'meta', description: 'API metadata' }
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
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/CatalogListResponse' }
								}
							}
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
			'/api/v1/catalog/products/{id}': {
				get: {
					tags: ['catalog'],
					summary: 'Get one catalog product',
					operationId: 'getCatalogProduct',
					security: [{ BearerAuth: ['catalog:read'] }, { ApiKeyAuth: ['catalog:read'] }],
					parameters: [
						{ name: 'id', in: 'path', required: true, schema: { type: 'string' } },
						{ name: 'lang', in: 'query', schema: { type: 'string' } }
					],
					responses: {
						'200': {
							description: 'Product',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/CatalogProductResponse' }
								}
							}
						},
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
					summary: 'List paid orders (poll, not a webhook)',
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
						{ name: 'cursor', in: 'query', schema: { type: 'string' } }
					],
					responses: {
						'200': {
							description: 'Paid orders only. Unpaid rows are never returned.',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/PaidOrdersResponse' }
								}
							}
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
						payWhatYouWant: { type: 'boolean' },
						shipping: { type: 'boolean' },
						tagIds: { type: 'array', items: { type: 'string' } },
						hasVariations: { type: 'boolean' },
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
				PaidOrderItem: {
					type: 'object',
					required: ['productId', 'name', 'quantity', 'unitPrice'],
					properties: {
						productId: { type: 'string' },
						name: { type: 'string' },
						quantity: { type: 'integer' },
						uniqueKey: { type: 'string' },
						chosenVariations: { type: 'object', additionalProperties: { type: 'string' } },
						unitPrice: {
							type: 'object',
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
							required: ['amountMinor', 'currency'],
							properties: {
								amountMinor: { $ref: '#/components/schemas/AmountMinor' },
								currency: { type: 'string', enum: currencyEnum }
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
