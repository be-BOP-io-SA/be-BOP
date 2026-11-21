import { describe, expect, it } from 'vitest';
import {
	epochSecondsParam,
	isoDateParam,
	limitParam,
	oneOfParam,
	parseApiQuery,
	positiveIntParam,
	textParam
} from './query';

function url(query: string): URL {
	return new URL(`https://shop.example/api/v1/anything${query}`);
}

async function refusal(result: ReturnType<typeof parseApiQuery>) {
	if (!('error' in result)) {
		throw new Error('expected a refusal');
	}
	expect(result.error.status).toBe(400);
	return (await result.error.json()) as {
		error: { code: string; message: string; details: { field: string } };
	};
}

describe('parseApiQuery', () => {
	it('reads only the parameters a route takes, and leaves out those not sent', () => {
		const result = parseApiQuery(url('?limit=5&other=1'), {
			limit: limitParam(100),
			cursor: positiveIntParam
		});
		expect(result).toEqual({ data: { limit: '5' } });
	});

	it('counts a parameter sent empty as not sent', () => {
		expect(
			parseApiQuery(url('?limit=&since='), { limit: limitParam(100), since: isoDateParam })
		).toEqual({ data: {} });
	});

	it('refuses a value that does not fit, naming the parameter', async () => {
		const body = await refusal(parseApiQuery(url('?since=yesterday'), { since: isoDateParam }));
		expect(body.error.code).toBe('VALIDATION_ERROR');
		expect(body.error.details.field).toBe('since');
		expect(body.error.message).toBe('since must be an ISO 8601 date-time');
	});

	it('answers the same value the same way on every route', async () => {
		const onOrders = await refusal(
			parseApiQuery(url('?limit=0'), { limit: limitParam(100), status: textParam })
		);
		const onCatalog = await refusal(
			parseApiQuery(url('?limit=0'), { limit: limitParam(100), type: oneOfParam(['donation']) })
		);
		expect(onOrders).toEqual(onCatalog);
	});
});

describe('query parameters', () => {
	it('takes a page size between 1 and its maximum, and nothing else', () => {
		const limit = limitParam(100);
		expect(limit.safeParse('1').success).toBe(true);
		expect(limit.safeParse('100').success).toBe(true);
		for (const raw of ['0', '101', '-1', '1.5', '12abc', 'ten']) {
			expect(limit.safeParse(raw).success).toBe(false);
		}
	});

	it('takes a positive integer written plainly', () => {
		expect(positiveIntParam.safeParse('42').success).toBe(true);
		for (const raw of ['0', '+1', '01', '1.5', '1e3']) {
			expect(positiveIntParam.safeParse(raw).success).toBe(false);
		}
	});

	it('takes seconds since the epoch as a whole number', () => {
		expect(epochSecondsParam.safeParse('1735689600').success).toBe(true);
		expect(epochSecondsParam.safeParse('yesterday').success).toBe(false);
	});

	it('takes a value of a closed list whatever its case', () => {
		const status = oneOfParam(['paid', 'pending']);
		expect(status.safeParse('PAID')).toEqual({ success: true, data: 'paid' });
		expect(status.safeParse('refunded').success).toBe(false);
	});
});
