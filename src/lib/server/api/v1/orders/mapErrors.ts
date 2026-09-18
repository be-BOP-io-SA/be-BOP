export type MappedDomainError = {
	code: string;
	message: string;
	details?: Record<string, unknown>;
};

type HttpLikeError = {
	status: number;
	body: unknown;
};

function isHttpLikeError(err: unknown): err is HttpLikeError {
	return (
		typeof err === 'object' &&
		err !== null &&
		'status' in err &&
		typeof (err as { status: unknown }).status === 'number' &&
		'body' in err
	);
}

function httpErrorMessage(err: HttpLikeError): string {
	if (typeof err.body === 'string') {
		return err.body;
	}
	if (typeof err.body === 'object' && err.body && 'message' in err.body) {
		return String((err.body as { message: unknown }).message);
	}
	return 'Request failed';
}

/**
 * Map domain / SvelteKit HttpError thrown by createOrder / stock checks into a per-command error.
 * INTERNAL_ERROR never exposes raw Error.message to the client.
 */
export function mapDomainError(err: unknown): MappedDomainError {
	if (isHttpLikeError(err)) {
		const message = httpErrorMessage(err);
		const stock = /out of stock|not enough stock/i.test(message);
		return {
			code: stock ? 'STOCK_UNAVAILABLE' : 'DOMAIN_ERROR',
			message,
			details: { httpStatus: err.status }
		};
	}
	if (err instanceof Error) {
		console.error('[api/v1] domain internal error', err);
		return { code: 'INTERNAL_ERROR', message: 'Internal server error' };
	}
	return { code: 'INTERNAL_ERROR', message: 'Internal server error' };
}
