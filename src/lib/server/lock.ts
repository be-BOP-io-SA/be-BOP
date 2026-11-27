import { ObjectId } from 'mongodb';
import { collections } from './database';
import { processClosed } from './process';
import { setTimeout } from 'node:timers/promises';
import { NO_LOCK } from '$lib/server/env-config';
import { env } from '$env/dynamic/private';
import { isUniqueConstraintError } from './utils/isUniqueConstraintError';

const processId = new ObjectId();

const RESERVATION_POLL_MS = 100;

/**
 * Hold `id` across every be-BOP process for the time of one piece of work. Null when it is still
 * held elsewhere once `waitMs` is over.
 *
 * A hold whose process died frees itself: entries of the locks collection expire a minute or two
 * after they were written.
 */
export async function reserve(
	id: string,
	opts?: { waitMs?: number }
): Promise<{ release: () => Promise<void> } | null> {
	const instanceId = new ObjectId();
	const giveUpAt = Date.now() + (opts?.waitMs ?? 0);

	for (;;) {
		const now = new Date();
		try {
			await collections.locks.insertOne({
				_id: id,
				ownerId: processId,
				instanceId,
				createdAt: now,
				updatedAt: now
			});
			break;
		} catch (err) {
			if (!isUniqueConstraintError(err)) {
				throw err;
			}
		}
		if (Date.now() + RESERVATION_POLL_MS > giveUpAt) {
			return null;
		}
		await setTimeout(RESERVATION_POLL_MS);
	}

	return {
		// By instance: a hold that expired and was taken by someone else is theirs, not ours to free.
		release: async () => {
			await collections.locks.deleteOne({ _id: id, instanceId }).catch(console.error);
		}
	};
}

export class Lock {
	id: string;
	ownsLock = false;
	destroyed = false;
	instanceId = new ObjectId();

	onAcquire?: () => void;

	constructor(id: string, opts?: { doNotInitialize?: boolean }) {
		this.id = id;
		this.instanceId = new ObjectId();

		if (!opts?.doNotInitialize) {
			this.maintain();
		}
	}

	destroy() {
		this.destroyed = true;
	}

	static async tryAcquire(id: string): Promise<Lock | null> {
		if (NO_LOCK === 'true' || env.VITEST) {
			return null;
		}

		const lock = await collections.locks.findOne({
			_id: id
		});

		if (!lock) {
			const ret = new Lock(id, { doNotInitialize: true });
			await ret.tryAcquire();

			if (ret.ownsLock) {
				return ret;
			} else {
				ret.destroy();
			}
		}

		return null;
	}

	private async tryAcquire() {
		try {
			let lock = await collections.locks.findOne({
				_id: this.id
			});

			if (!lock) {
				lock = {
					_id: this.id,
					createdAt: new Date(),
					updatedAt: new Date(),
					ownerId: processId,
					instanceId: this.instanceId
				};

				await collections.locks.insertOne(lock);
				this.ownsLock = true;
				try {
					this.onAcquire?.();
				} catch {}
			} else {
				const res = await collections.locks.updateOne(
					{
						_id: this.id,
						ownerId: processId,
						// In dev mode, acquires older locks.
						instanceId: {
							$lte: this.instanceId
						}
					},
					{
						$set: {
							updatedAt: new Date(),
							instanceId: this.instanceId
						}
					}
				);
				const ownedLock = this.ownsLock;
				this.ownsLock = res.matchedCount > 0;

				if (!ownedLock && this.ownsLock) {
					try {
						this.onAcquire?.();
					} catch {}
				}
			}
		} catch {
			this.ownsLock = false;
		}
	}

	private async maintain() {
		if (NO_LOCK === 'true' || env.VITEST) {
			return;
		}
		while (!processClosed && !this.destroyed) {
			await this.tryAcquire();

			await setTimeout(5_000);
		}

		this.ownsLock = false;
		this.onAcquire = undefined;

		collections.locks.deleteOne({ _id: this.id }).catch();
		if (processClosed) {
			collections.locks
				.deleteMany({
					ownerId: processId
				})
				.catch();
		}
	}
}
