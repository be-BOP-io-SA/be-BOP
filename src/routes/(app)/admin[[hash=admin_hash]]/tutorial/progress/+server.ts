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

	// For completed tutorials, merge stepTimes keeping max duration per step
	let mergedStepTimes = stepTimes ?? [];
	let mergedTotalTimeMs = totalTimeMs ?? 0;
	let completionCount = 1;

	if (status === 'completed') {
		const existing = await collections.tutorialProgress.findOne({
			userId: locals.user._id,
			tutorialId
		});

		if (existing) {
			// Merge stepTimes: keep max duration for each stepId
			const stepTimeMap = new Map<string, number>();

			// Add existing step times
			for (const st of existing.stepTimes ?? []) {
				const current = stepTimeMap.get(st.stepId) ?? 0;
				stepTimeMap.set(st.stepId, Math.max(current, st.durationMs ?? 0));
			}

			// Merge with new step times, keeping max
			for (const st of stepTimes ?? []) {
				const current = stepTimeMap.get(st.stepId) ?? 0;
				stepTimeMap.set(st.stepId, Math.max(current, st.durationMs ?? 0));
			}

			// Convert back to array
			mergedStepTimes = Array.from(stepTimeMap.entries()).map(([stepId, durationMs]) => ({
				stepId,
				durationMs
			}));

			// Keep max total time
			mergedTotalTimeMs = Math.max(existing.totalTimeMs ?? 0, totalTimeMs ?? 0);

			// Increment completion count
			completionCount = (existing.completionCount ?? 0) + 1;
		}
	}

	const updateData: Partial<TutorialProgress> = {
		tutorialVersion,
		status: status as TutorialStatus,
		currentStepIndex: currentStepIndex ?? 0,
		totalTimeMs: mergedTotalTimeMs,
		stepTimes: mergedStepTimes,
		lastActiveAt: now,
		updatedAt: now
	};

	// Set appropriate timestamp based on status
	if (status === 'in_progress' && !data.startedAt) {
		updateData.startedAt = now;
	} else if (status === 'completed') {
		updateData.completedAt = now;
		updateData.wasInterrupted = false;
		// @ts-expect-error completionCount not in type yet
		updateData.completionCount = completionCount;
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
