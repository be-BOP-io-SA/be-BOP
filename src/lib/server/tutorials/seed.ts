import type { ClientSession } from 'mongodb';
import { collections } from '../database';
import { defaultTutorials } from './index';

/**
 * Seeds default tutorials into the database.
 * - Inserts tutorials that don't exist
 * - Updates tutorials if the version has increased
 */
export async function seedTutorials(session?: ClientSession): Promise<void> {
	for (const tutorial of defaultTutorials) {
		const existing = await collections.tutorials.findOne({ _id: tutorial._id }, { session });

		if (!existing) {
			await collections.tutorials.insertOne(
				{
					...tutorial,
					createdAt: new Date(),
					updatedAt: new Date()
				},
				{ session }
			);
		} else if (existing.version < tutorial.version) {
			await collections.tutorials.updateOne(
				{ _id: tutorial._id },
				{
					$set: {
						...tutorial,
						updatedAt: new Date()
					}
				},
				{ session }
			);
		}
	}
}
