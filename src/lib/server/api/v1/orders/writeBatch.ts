import type {
	AuthenticatedApiKey,
	ApiV1OrderResult,
	ApiV1OrdersWriteResponse
} from '$lib/types/ApiV1';
import type { OrderWriteCommand } from '$lib/server/api/v1/schemas/orders-write';
import { mapDomainError } from './mapErrors';
import { writeOne } from './writeOne';

export type WriteBatchParams = {
	apiKey: AuthenticatedApiKey;
	orders: OrderWriteCommand[];
	clientIp?: string;
};

/**
 * Process a validated batch of order write commands sequentially.
 * Always returns a D1 report (caller maps to HTTP 200).
 * Unexpected throws from writeOne are isolated per command (never 500 the batch).
 */
export async function writeBatch(params: WriteBatchParams): Promise<ApiV1OrdersWriteResponse> {
	const results: ApiV1OrderResult[] = [];
	for (const order of params.orders) {
		try {
			results.push(
				await writeOne({
					apiKey: params.apiKey,
					order,
					clientIp: params.clientIp
				})
			);
		} catch (err) {
			results.push({
				externalOrderId: order.externalOrderId,
				status: 'failed',
				error: mapDomainError(err)
			});
		}
	}

	const hasFailed = results.some((result) => result.status === 'failed');
	const hasWarnings = results.some((result) => (result.warnings?.length ?? 0) > 0);
	const status = hasFailed ? 'ok_with_errors' : hasWarnings ? 'ok_with_warnings' : 'ok';

	return {
		ok: !hasFailed,
		status,
		results
	};
}
