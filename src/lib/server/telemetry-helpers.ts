import { collections } from './database';
import { runtimeConfig } from './runtime-config';
import { queueTelemetryBeaconMessage } from './sendNotification';

export function calculateNextBeaconDate(): Date {
	const daysUntilNext = 6 + Math.random() * 2;
	return new Date(Date.now() + daysUntilNext * 24 * 60 * 60 * 1000);
}

async function sendBeaconAndGetNextDate(): Promise<Date | null> {
	const sent = await queueTelemetryBeaconMessage();
	return sent ? calculateNextBeaconDate() : null;
}

export async function sendPeriodicBeacon() {
	const telemetryConfig = runtimeConfig.telemetry;

	if (
		telemetryConfig?.enabled &&
		telemetryConfig.nextBeaconDate &&
		new Date() >= telemetryConfig.nextBeaconDate
	) {
		const nextBeaconDate = await sendBeaconAndGetNextDate();
		if (nextBeaconDate) {
			const updatedTelemetry = {
				...telemetryConfig,
				nextBeaconDate
			};

			await collections.runtimeConfig.updateOne(
				{ _id: 'telemetry' },
				{
					$set: { data: updatedTelemetry, updatedAt: new Date() }
				}
			);

			runtimeConfig.telemetry = updatedTelemetry;

			console.log(`Telemetry: periodic beacon sent, next: ${nextBeaconDate.toISOString()}`);
		}
	}
}

export async function enableTelemetry(options?: { forceBeaconNow?: boolean; source?: string }) {
	const currentTelemetry = runtimeConfig.telemetry;
	const now = new Date();

	const shouldSendNow =
		options?.forceBeaconNow ||
		!currentTelemetry?.nextBeaconDate ||
		new Date() >= currentTelemetry.nextBeaconDate;

	let nextBeaconDate: Date | null;

	if (shouldSendNow) {
		nextBeaconDate = await sendBeaconAndGetNextDate();
		if (nextBeaconDate) {
			console.log(`Telemetry beacon enabled and sent via ${options?.source ?? 'unknown'}`);
		} else {
			console.log(
				`Telemetry beacon enabled via ${
					options?.source ?? 'unknown'
				} (beacon not sent - Nostr not configured)`
			);
		}
	} else {
		nextBeaconDate =
			currentTelemetry?.nextBeaconDate && new Date() < currentTelemetry.nextBeaconDate
				? currentTelemetry.nextBeaconDate
				: null;
		console.log(
			`Telemetry enabled via ${options?.source ?? 'unknown'} (next beacon: ${
				nextBeaconDate?.toISOString() ?? 'unknown'
			})`
		);
	}

	const telemetryConfig = {
		enabled: true,
		nextPrompt: null,
		nextBeaconDate
	};

	await collections.runtimeConfig.updateOne(
		{ _id: 'telemetry' },
		{
			$set: { data: telemetryConfig, updatedAt: now },
			$setOnInsert: { createdAt: now }
		},
		{ upsert: true }
	);

	runtimeConfig.telemetry = telemetryConfig;

	return { beaconSent: shouldSendNow, nextBeacon: nextBeaconDate };
}

export async function disableTelemetry(options?: { neverAskAgain?: boolean; source?: string }) {
	const now = new Date();
	const neverAsk = options?.neverAskAgain ?? false;

	const telemetryConfig = {
		enabled: false,
		nextPrompt: neverAsk ? null : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
		nextBeaconDate: null
	};

	await collections.runtimeConfig.updateOne(
		{ _id: 'telemetry' },
		{
			$set: { data: telemetryConfig, updatedAt: now },
			$setOnInsert: { createdAt: now }
		},
		{ upsert: true }
	);

	runtimeConfig.telemetry = telemetryConfig;

	console.log(
		neverAsk
			? `Telemetry disabled via ${options?.source ?? 'unknown'} (never ask)`
			: `Telemetry disabled via ${options?.source ?? 'unknown'}, reminder set for 30 days`
	);
}
