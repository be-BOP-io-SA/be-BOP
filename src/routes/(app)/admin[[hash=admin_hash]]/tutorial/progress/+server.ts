import { json, error } from '@sveltejs/kit';
import { collections } from '$lib/server/database';
import { ObjectId } from 'mongodb';
import type { TutorialProgress, TutorialStatus } from '$lib/types/TutorialProgress';

export const GET = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const progress = await collections.tutorialProgress
		.find({ userId: locals.user._id })
		.toArray();

	return json(progress);
};

export const POST = async ({ locals, request }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const data = await request.json();
	const { tutorialId, tutorialVersion, status, currentStepIndex, totalTimeMs, stepTimes } = data;

	if (!tutorialId || typeof tutorialVersion !== 'number') {
		throw error(400, 'Missing required fields: tutorialId, tutorialVersion');
	}

	const now = new Date();
	const updateData: Partial<TutorialProgress> = {
		tutorialVersion,
		status: status as TutorialStatus,
		currentStepIndex: currentStepIndex ?? 0,
		totalTimeMs: totalTimeMs ?? 0,
		stepTimes: stepTimes ?? [],
		lastActiveAt: now,
		updatedAt: now
	};

	// Set appropriate timestamp based on status
	if (status === 'in_progress' && !data.startedAt) {
		updateData.startedAt = now;
	} else if (status === 'completed') {
		updateData.completedAt = now;
		updateData.wasInterrupted = false;
	} else if (status === 'skipped') {
		updateData.skippedAt = now;
		updateData.wasInterrupted = false;
	}

	const result = await collections.tutorialProgress.findOneAndUpdate(
		{
			userId: locals.user._id,
			tutorialId
		},
		{
			$set: updateData,
			$setOnInsert: {
				_id: new ObjectId(),
				userId: locals.user._id,
				tutorialId,
				createdAt: now
			}
		},
		{
			upsert: true,
			returnDocument: 'after'
		}
	);

	return json(result);
};

// Mark tutorial as interrupted (called on beforeunload)
export const PATCH = async ({ locals, request }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const data = await request.json();
	const { tutorialId } = data;

	if (!tutorialId) {
		throw error(400, 'Missing required field: tutorialId');
	}

	const now = new Date();

	await collections.tutorialProgress.updateOne(
		{
			userId: locals.user._id,
			tutorialId,
			status: 'in_progress'
		},
		{
			$set: {
				wasInterrupted: true,
				lastActiveAt: now,
				updatedAt: now
			}
		}
	);

	return json({ success: true });
};
