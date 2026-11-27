import { describe, expect, it } from 'vitest';
import { MongoServerError } from 'mongodb';
import { isChangeStreamPositionLost } from './isChangeStreamPositionLost';

describe('isChangeStreamPositionLost', () => {
	// Copied from what MongoDB 6.0.9 answered to a watch resumed after a position it did not hold.
	it('recognises the answer of a real server that cannot find the position', () => {
		const answer = new MongoServerError({
			ok: 0,
			code: 280,
			codeName: 'ChangeStreamFatalError',
			errmsg:
				'PlanExecutor error during aggregation :: caused by :: cannot resume stream; the resume token was not found.'
		});

		expect(isChangeStreamPositionLost(answer)).toBe(true);
	});

	it('recognises the answer of a server whose history no longer reaches the position', () => {
		const answer = new MongoServerError({
			ok: 0,
			code: 286,
			codeName: 'ChangeStreamHistoryLost',
			errmsg:
				'Resume of change stream was not possible, as the resume point may no longer be in the oplog.'
		});

		expect(isChangeStreamPositionLost(answer)).toBe(true);
	});

	it('does not take any other failure for a lost position', () => {
		expect(isChangeStreamPositionLost(new Error('connection reset'))).toBe(false);
		expect(
			isChangeStreamPositionLost(new MongoServerError({ codeName: 'NotWritablePrimary' }))
		).toBe(false);
	});
});
