import type { Timestamps } from './Timestamps';

export type TutorialTriggerType = 'first-login' | 'page-visit' | 'manual' | 'after-tutorial';

export type TutorialEmployeeMode = 'mandatory' | 'optional' | 'disabled';

export type ShepherdPosition =
	| 'top'
	| 'top-start'
	| 'top-end'
	| 'bottom'
	| 'bottom-start'
	| 'bottom-end'
	| 'left'
	| 'left-start'
	| 'left-end'
	| 'right'
	| 'right-start'
	| 'right-end';

export type TutorialActionType = 'click' | 'input' | 'select' | 'form-submit';

export type TutorialValidationType = 'non-empty' | 'valid-email';

export interface TutorialRequiredAction {
	type: TutorialActionType;
	selector?: string;
	validation?: TutorialValidationType;
}

export interface TutorialStepAttachTo {
	element: string;
	on: ShepherdPosition;
}

export interface TutorialStepSkipCondition {
	/** Element selector - if this element exists, skip this step */
	elementExists?: string;
	/** Element selector - if this element does NOT exist, skip this step */
	elementMissing?: string;
}

export interface TutorialStep {
	id: string;
	order: number;
	route: string;
	attachTo: TutorialStepAttachTo;
	titleKey: string;
	textKey: string;
	requiredAction?: TutorialRequiredAction;
	/** Condition to automatically skip this step */
	skipCondition?: TutorialStepSkipCondition;
}

export interface TutorialPolicy {
	employeeMode?: TutorialEmployeeMode | null;
	allowSkip?: boolean;
	allowRerun?: boolean;
}

export interface TutorialTriggerCondition {
	route?: string;
	afterTutorialId?: string;
}

export interface Tutorial extends Timestamps {
	_id: string;
	name: string;
	description: string;
	version: number;
	targetRoles: string[];
	isActive: boolean;
	triggerType: TutorialTriggerType;
	triggerCondition?: TutorialTriggerCondition;
	steps: TutorialStep[];
	estimatedTimeMinutes?: number;
	policy?: TutorialPolicy;
}

export const DEFAULT_TUTORIAL_ID = 'onboarding';
