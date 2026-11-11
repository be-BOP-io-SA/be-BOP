import { ORDER_PAYMENT_STATUSES } from '$lib/types/Order';
import { isoDateParam, limitParam, oneOfParam, positiveIntParam, textParam } from '../query';

/** Largest page an order listing returns. */
export const ORDER_LISTING_MAX_LIMIT = 100;

/** The query parameters both order listings take, read the same way on each. */
export const ORDER_LISTING_QUERY = {
	since: isoDateParam,
	until: isoDateParam,
	limit: limitParam(ORDER_LISTING_MAX_LIMIT),
	cursor: positiveIntParam,
	productId: textParam,
	status: oneOfParam(ORDER_PAYMENT_STATUSES),
	number: positiveIntParam,
	label: textParam,
	seller: textParam,
	externalOrderId: textParam
};
