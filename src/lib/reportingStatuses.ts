import { ORDER_PAYMENT_STATUSES, type OrderPaymentStatus } from '$lib/types/Order';

// Search: which orders enter every table.
export const DEFAULT_ORDER_STATUSES: readonly OrderPaymentStatus[] = ['paid'];
// Search: narrows to orders carrying such a payment. All ticked means no narrowing.
export const DEFAULT_CARRYING_STATUSES: readonly OrderPaymentStatus[] = ORDER_PAYMENT_STATUSES;
// Display: which payment lines the payment table draws, and therefore what it totals.
export const DEFAULT_SHOWN_STATUSES: readonly OrderPaymentStatus[] = ['paid'];
