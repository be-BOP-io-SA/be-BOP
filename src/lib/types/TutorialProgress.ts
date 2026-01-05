import type { ObjectId } from 'mongodb';
import type { Timestamps } from './Timestamps';

export type TutorialStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface TutorialStepTime {
	stepId: string;
	startedAt: Date;
	completedAt?: Date;
	durationMs?: number;
}

export interface TutorialProgress extends Timestamps {
	_id: ObjectId;
	userId: ObjectId;
	tutorialId: string;
	tutorialVersion: number;
	status: TutorialStatus;
	currentStepIndex: number;
	startedAt?: Date;
	completedAt?: Date;
	skippedAt?: Date;
	lastActiveAt?: Date;
	wasInterrupted?: boolean;
	totalTimeMs: number;
	stepTimes: TutorialStepTime[];
}
