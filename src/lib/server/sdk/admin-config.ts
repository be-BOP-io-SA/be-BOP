import { collections } from '../database';
import {
	defaultConfig,
	runtimeConfig,
	type ConfigKey,
	type RuntimeConfig
} from '../runtime-config';
import { rateLimit } from '../rateLimit';
import { testProcessorConnection } from './test-connection';
import type { PaymentProcessor } from '../payment-methods';
import type { ZodType, ZodTypeDef } from 'zod';

/**
 * The save / delete / test actions every payment processor settings page needs.
 * A page supplies only what differs: the config key it owns, how its form validates,
 * and what deleting it leaves behind. Implementing rate limiting and the secret-safe
 * connection test once is the point — copied nine times, one copy eventually drifts.
 */
export function paymentConfigActions<K extends ConfigKey>(spec: {
	key: K;
	processor: PaymentProcessor;
	/** Input stays `unknown`: `.default()` and `.transform()` make it differ from the output. */
	schema: ZodType<RuntimeConfig[K], ZodTypeDef, unknown>;
}) {
	return {
		save: async function ({ request }: { request: Request }) {
			const data = spec.schema.parse(Object.fromEntries(await request.formData()));

			await collections.runtimeConfig.updateOne(
				{ _id: spec.key },
				{ $set: { data, updatedAt: new Date() } },
				{ upsert: true }
			);

			runtimeConfig[spec.key] = data;
		},

		delete: async function () {
			await collections.runtimeConfig.deleteOne({ _id: spec.key });

			// Defaults are declared once, where the config itself is declared. A page carrying
			// its own copy is a second source, and the two drift the first time a field is added.
			// `defaultConfig` is frozen, so the live config gets a clone rather than a reference.
			// The cast is the price of `ConfigKey` covering runtime-only keys such as the
			// per-locale translation buckets, which have no entry in the declared defaults.
			runtimeConfig[spec.key] = structuredClone(
				(defaultConfig as Record<string, unknown>)[spec.key]
			) as RuntimeConfig[K];
		},

		testConnection: async function ({ locals }: { locals: App.Locals }) {
			rateLimit(locals.clientIp, `pp.test.${spec.processor}`, 5, { minutes: 1 });

			return await testProcessorConnection(spec.processor);
		}
	};
}
