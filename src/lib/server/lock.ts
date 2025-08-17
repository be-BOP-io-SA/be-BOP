import { ObjectId } from 'mongodb';
import { collections } from './database';
import { processClosed } from './process';
import { setTimeout } from 'node:timers/promises';

import { env } from '$env/dynamic/private';
const NO_LOCK = env.NO_LOCK;

const processId = new ObjectId();

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
