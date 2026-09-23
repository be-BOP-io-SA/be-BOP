import { collections } from '../database';
import {
	defaultConfig,
	runtimeConfig,
	type ConfigKey,
	type RuntimeConfig
} from '../runtime-config';
import { rateLimit } from '../rateLimit';
import { testProcessorConnection } from './test-connection';
import { getProcessor } from './pp';
import type { PaymentProcessor } from '../payment-methods';

/**
 * The save / delete / test actions every payment processor settings page needs.
 * A page supplies only what differs: the config key it owns, how its form validates,
 * and what deleting it leaves behind. Implementing rate limiting and the secret-safe
 * connection test once is the point — copied nine times, one copy eventually drifts.
 */
export function paymentConfigActions<K extends ConfigKey>(spec: {
	key: K;
	processor: PaymentProcessor;
}) {
	/**
	 * The shape of a provider's credentials is the provider's own business, so it is declared
	 * on the processor. Reading it here rather than taking it as an argument is what will let
	 * one shared page serve every processor — and meanwhile stops the schema being written
	 * once in the processor and once more in its settings page.
	 */
	const schema = () => {
		const declared = getProcessor(spec.processor)?.configSchema;
		if (!declared) {
			throw new Error(`${spec.processor} has settings but declares no configSchema`);
		}
		return declared;
	};

	return {
		save: async function ({ request }: { request: Request }) {
			const data = schema().parse(Object.fromEntries(await request.formData())) as RuntimeConfig[K];

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
