import { MongoServerError } from 'mongodb';

/**
 * Whether a change stream failed because the server no longer holds the position it was resuming
 * from: asking for that position again fails the same way, so the caller must start elsewhere.
 */
export function isChangeStreamPositionLost(error: unknown): error is MongoServerError {
	return (
		error instanceof MongoServerError &&
		(error.codeName === 'ChangeStreamHistoryLost' || error.codeName === 'ChangeStreamFatalError')
	);
}
