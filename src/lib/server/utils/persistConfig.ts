import { collections } from '../database';
import { runtimeConfig } from '../runtime-config';

export async function persistConfigElement<K extends keyof typeof runtimeConfig>(
	key: K,
	value: (typeof runtimeConfig)[K]
) {
	await collections.runtimeConfig.updateOne(
		{
			_id: key
		},
		{
			$set: {
				data: value,
				updatedAt: new Date()
			}
		},
		{
			upsert: true
		}
	);
}
