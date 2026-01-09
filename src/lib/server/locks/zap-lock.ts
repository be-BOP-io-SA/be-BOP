import { Lock } from '../lock';
import { processClosed } from '../process';
import { collections } from '../database';
import { setTimeout } from 'node:timers/promises';
import { lndLookupInvoice, isLndConfigured } from '../lnd';
import { phoenixdLookupInvoice, isPhoenixdConfigured } from '../phoenixd';
import { isNostrConfigured } from '../nostr';
import { ObjectId } from 'mongodb';
import { Kind } from 'nostr-tools';
import { building } from '$app/environment';
import { inspect } from 'node:util';

const lock = new Lock('zaps');

async function maintainZaps() {
	while (!processClosed) {
		if (!lock.ownsLock || !isNostrConfigured()) {
			await setTimeout(5_000);
			continue;
		}

		try {
			const pendingZaps = await collections.pendingZaps
				.find({
					processedAt: { $exists: false }
				})
				.toArray();

			await Promise.all(
				pendingZaps.map(async (pendingZap) => {
					try {
						const paymentStatus = await (async () => {
							if (pendingZap.processor === 'lnd' && isLndConfigured()) {
								const invoice = await lndLookupInvoice(pendingZap.invoiceId);
								return { isPaid: invoice.state === 'SETTLED', preimage: invoice.preimage };
							}
							if (pendingZap.processor === 'phoenixd' && isPhoenixdConfigured()) {
								const invoice = await phoenixdLookupInvoice(pendingZap.invoiceId);
								return { isPaid: invoice.isPaid, preimage: invoice.preimage };
							}
							return { isPaid: false, preimage: undefined };
						})();

						if (paymentStatus.isPaid && paymentStatus.preimage) {
							// Create zap receipt notification
							await collections.nostrNotifications.insertOne({
								_id: new ObjectId(),
								content: '', // NIP-57: empty for public zap
								kind: Kind.Zap,
								bolt11: pendingZap.bolt11,
								preimage: paymentStatus.preimage,
								zapRequest: pendingZap.zapRequest,
								receiverPubkey: pendingZap.receiverPubkey,
								senderPubkey: pendingZap.senderPubkey,
								eventId: pendingZap.eventId,
								createdAt: new Date(),
								updatedAt: new Date()
							});

							// Mark as processed
							await collections.pendingZaps.updateOne(
								{ _id: pendingZap._id },
								{ $set: { processedAt: new Date(), updatedAt: new Date() } }
							);

							console.log('Zap receipt created for invoice', pendingZap.invoiceId);
						}
					} catch (err) {
						console.error('Error processing pending zap:', inspect(err, { depth: 10 }));
					}
				})
			);
		} catch (err) {
			console.error('Error in maintainZaps:', inspect(err, { depth: 10 }));
		}

		await setTimeout(5_000);
	}
}

if (!building) {
	maintainZaps();
}
