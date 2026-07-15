import { MongoServerError, Timestamp, type ChangeStream, type ChangeStreamDocument } from 'mongodb';
import { Lock } from '../lock';
import { collections } from '../database';
import type { EInvoice } from '$lib/types/EInvoice';
import { generateEInvoice } from '../e-invoice/generate';
import { building } from '$app/environment';
import { rateLimit } from '../rateLimit';
import { getUnixTime, subHours } from 'date-fns';
import { typedInclude } from '$lib/utils/typedIncludes';

/**
 * E-invoice generation worker (see $lib/server/e-invoice/): consumes pending
 * `einvoices` documents inserted by onOrderPayment, generates the Factur-X
 * artifacts, and retries failures with exponential back-off.
 *
 * E-reporting extension point: French e-reporting (B2C/export transaction
 * data) will get its own queue collection later and reuse this file's shape +
 * the pure e-invoice/context mapper — the queue itself is deliberately not
 * generalized ahead of time.
 */

const lock = new Lock('e-invoice');

const MAX_ATTEMPTS = 8;
const BASE_RETRY_DELAY_MS = 5 * 60_000;
const MAX_RETRY_DELAY_MS = 6 * 3_600_000;
const SWEEP_INTERVAL_MS = 60_000;

const processingIds = new Set<string>();

async function handleChanges(change: ChangeStreamDocument<EInvoice>): Promise<void> {
	if (!lock?.ownsLock || !('fullDocument' in change) || !change.fullDocument) {
		return;
	}

	await handleEInvoice(change.fullDocument);
}

async function handleEInvoice(einvoice: EInvoice): Promise<void> {
	if (einvoice.generation.status !== 'pending' || processingIds.has(einvoice._id.toString())) {
		return;
	}

	try {
		processingIds.add(einvoice._id.toString());

		const updated = await collections.eInvoices.findOne({ _id: einvoice._id });
		if (
			!updated ||
			updated.generation.status !== 'pending' ||
			updated.generation.nextAttemptAt > new Date()
		) {
			return;
		}
		einvoice = updated;

		try {
			await generateEInvoice(einvoice);
		} catch (err) {
			console.error('E-invoice generation error', einvoice._id.toString(), err);
			const attempts = einvoice.generation.attempts + 1;
			const failed = attempts >= MAX_ATTEMPTS;
			const now = new Date();
			await collections.eInvoices.updateOne(
				{ _id: einvoice._id },
				{
					$set: {
						'generation.status': failed ? ('failed' as const) : ('pending' as const),
						'generation.attempts': attempts,
						'generation.nextAttemptAt': new Date(
							now.getTime() + Math.min(BASE_RETRY_DELAY_MS * 2 ** attempts, MAX_RETRY_DELAY_MS)
						),
						'generation.error': err instanceof Error ? err.message : String(err),
						updatedAt: now
					},
					...(failed && {
						$push: {
							statusHistory: {
								at: now,
								kind: 'generation' as const,
								status: 'failed',
								detail: err instanceof Error ? err.message : String(err)
							}
						}
					})
				}
			);
		}
	} finally {
		processingIds.delete(einvoice._id.toString());
	}
}

let changeStream: ChangeStream<EInvoice> | null = null;

async function watch(opts?: { requestChangesSince?: Timestamp }) {
	try {
		rateLimit('0.0.0.0', 'changeStream.e-invoice', 10, { minutes: 5 });
	} catch {
		console.error("Too many change streams errors for 'e-invoice', exiting");
		process.exit(1);
	}

	try {
		changeStream = collections.eInvoices
			.watch(
				[
					{
						$match: {
							$or: [{ operationType: 'insert' }, { operationType: 'update' }]
						}
					}
				],
				{
					fullDocument: 'updateLookup',
					...(opts?.requestChangesSince && {
						startAtOperationTime: opts.requestChangesSince
					})
				}
			)
			.on('change', (ev) => handleChanges(ev).catch(console.error))
			.once('error', async (err) => {
				console.error('change stream error', err);
				changeStream?.close().catch(console.error);
				changeStream = null;

				if (
					err instanceof MongoServerError &&
					typedInclude(['ChangeStreamHistoryLost', 'ChangeStreamFatalError'], err.codeName)
				) {
					// Restart from 1 hour ago if history was lost
					return watch({
						requestChangesSince: Timestamp.fromBits(0, getUnixTime(subHours(new Date(), 1)))
					});
				} else {
					return watch();
				}
			});

		return changeStream;
	} catch (err) {
		if (err instanceof MongoServerError && err.codeName === 'ChangeStreamHistoryLost') {
			console.warn('Oplog time out of range when starting change stream, falling back to now', err);
			return watch();
		}
		throw err;
	}
}

let sweeping = false;

/**
 * Backlog + retry sweep. The change stream only fires on inserts, so this is
 * what makes back-off retries (and admin-triggered regeneration) actually run.
 */
async function processPendingEInvoices() {
	if (sweeping) {
		return;
	}
	sweeping = true;
	try {
		const docs = collections.eInvoices.find({
			'generation.status': 'pending',
			'generation.nextAttemptAt': { $lte: new Date() }
		});

		for await (const doc of docs) {
			await handleEInvoice(doc);
		}
	} catch (err) {
		console.error('E-invoice sweep error', err);
	} finally {
		sweeping = false;
	}
}

if (!building) {
	watch();

	if (lock) {
		lock.onAcquire = async () => {
			await processPendingEInvoices();
		};

		setInterval(() => {
			if (lock.ownsLock) {
				processPendingEInvoices().catch(console.error);
			}
		}, SWEEP_INTERVAL_MS);
	}
}
