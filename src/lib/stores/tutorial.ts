import { browser } from '$app/environment';
import { writable, get } from 'svelte/store';
import type { Tutorial, TutorialStep } from '$lib/types/Tutorial';
import type { TutorialProgress, TutorialStatus } from '$lib/types/TutorialProgress';

export interface StepTimeRecord {
	stepId: string;
	durationMs: number;
}

export interface TutorialState {
	isActive: boolean;
	tutorialId: string | null;
	currentStepIndex: number;
	totalSteps: number;
	status: 'idle' | 'running' | 'paused' | 'waiting_for_navigation';
	stepStartTime: number | null;
	totalTimeMs: number;
	stepTimes: StepTimeRecord[];
	showPrompt: boolean;
	promptType: 'start' | 'resume' | 'rerun' | null;
	currentTutorial: Tutorial | null;
	currentProgress: TutorialProgress | null;
}

const initialState: TutorialState = {
	isActive: false,
	tutorialId: null,
	currentStepIndex: 0,
	totalSteps: 0,
	status: 'idle',
	stepStartTime: null,
	totalTimeMs: 0,
	stepTimes: [],
	showPrompt: false,
	promptType: null,
	currentTutorial: null,
	currentProgress: null
};

const STORAGE_KEY = 'bebop-tutorial-state';

function getPersistedState(): Partial<TutorialState> | null {
	if (!browser) return null;
	try {
		const stored = sessionStorage.getItem(STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored);
		}
	} catch {
		// Ignore parse errors
	}
	return null;
}

function persistState(state: TutorialState) {
	if (!browser) return;
	try {
		// Only persist essential navigation state
		const toPersist = {
			isActive: state.isActive,
			tutorialId: state.tutorialId,
			currentStepIndex: state.currentStepIndex,
			totalSteps: state.totalSteps,
			status: state.status,
			totalTimeMs: state.totalTimeMs,
			stepTimes: state.stepTimes
		};
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
	} catch {
		// Ignore storage errors
	}
}

function clearPersistedState() {
	if (!browser) return;
	try {
		sessionStorage.removeItem(STORAGE_KEY);
		sessionStorage.removeItem('bebop-tutorial-action-completed');
	} catch {
		// Ignore storage errors
	}
}

function createTutorialStore() {
	const { subscribe, set, update } = writable<TutorialState>(initialState);

	// Note: We no longer auto-clear on isActive=false
	// because that was causing issues with form submissions.
	// State is now explicitly saved in beforeunload and cleared in skipTutorial/completeTutorial.

	return {
		subscribe,

		/**
		 * Initialize the store, potentially restoring from session storage
		 * Returns the restored step index if successful, or -1 if no restoration
		 */
		initialize: (tutorial?: Tutorial | null): number => {
			const persisted = getPersistedState();
			if (persisted && persisted.isActive && (persisted.status === 'waiting_for_navigation' || persisted.status === 'running')) {
				const stepIndex = persisted.currentStepIndex ?? 0;
				update((state) => ({
					...state,
					...persisted,
					stepTimes: persisted.stepTimes ?? [],
					status: 'running' as const,
					stepStartTime: Date.now(),
					currentTutorial: tutorial ?? state.currentTutorial
				}));
				return stepIndex; // Return the step index to restore to
			}
			return -1; // No restoration
		},

		/**
		 * Start a new tutorial
		 */
		startTutorial: (tutorial: Tutorial, progress?: TutorialProgress) => {
			const resumeFromStep = progress?.currentStepIndex ?? 0;
			// Convert progress stepTimes to our format if resuming
			const existingStepTimes: StepTimeRecord[] = progress?.stepTimes?.map(st => ({
				stepId: st.stepId,
				durationMs: st.durationMs ?? 0
			})) ?? [];
			set({
				isActive: true,
				tutorialId: tutorial._id,
				currentStepIndex: resumeFromStep,
				totalSteps: tutorial.steps.length,
				status: 'running',
				stepStartTime: Date.now(),
				totalTimeMs: progress?.totalTimeMs ?? 0,
				stepTimes: existingStepTimes,
				showPrompt: false,
				promptType: null,
				currentTutorial: tutorial,
				currentProgress: progress ?? null
			});
		},

		/**
		 * Move to next step
		 */
		nextStep: () => {
			update((state) => {
				const stepDuration = state.stepStartTime ? Date.now() - state.stepStartTime : 0;
				const currentStepId = state.currentTutorial?.steps[state.currentStepIndex]?.id;
				const newStepTimes = currentStepId
					? [...state.stepTimes, { stepId: currentStepId, durationMs: stepDuration }]
					: state.stepTimes;
				return {
					...state,
					currentStepIndex: state.currentStepIndex + 1,
					totalTimeMs: state.totalTimeMs + stepDuration,
					stepTimes: newStepTimes,
					stepStartTime: Date.now()
				};
			});
		},

		/**
		 * Move to previous step
		 */
		prevStep: () => {
			update((state) => ({
				...state,
				currentStepIndex: Math.max(0, state.currentStepIndex - 1),
				stepStartTime: Date.now()
			}));
		},

		/**
		 * Go to a specific step
		 */
		goToStep: (stepIndex: number) => {
			update((state) => ({
				...state,
				currentStepIndex: Math.max(0, Math.min(stepIndex, state.totalSteps - 1)),
				stepStartTime: Date.now()
			}));
		},

		/**
		 * Pause the tutorial (e.g., before navigation)
		 */
		pauseForNavigation: () => {
			update((state) => ({
				...state,
				status: 'waiting_for_navigation'
			}));
		},

		/**
		 * Resume the tutorial after navigation
		 */
		resumeAfterNavigation: () => {
			update((state) => ({
				...state,
				status: 'running',
				stepStartTime: Date.now()
			}));
		},

		/**
		 * Complete the current tutorial
		 * Returns { totalTimeMs, stepTimes }
		 */
		completeTutorial: (): { totalTimeMs: number; stepTimes: StepTimeRecord[] } => {
			const state = get({ subscribe });
			const lastStepDuration = state.stepStartTime ? Date.now() - state.stepStartTime : 0;
			const finalTime = state.totalTimeMs + lastStepDuration;

			// Record the last step's time
			const lastStepId = state.currentTutorial?.steps[state.currentStepIndex]?.id;
			const finalStepTimes = lastStepId
				? [...state.stepTimes, { stepId: lastStepId, durationMs: lastStepDuration }]
				: state.stepTimes;

			set({
				...initialState,
				totalTimeMs: finalTime
			});
			clearPersistedState();

			return { totalTimeMs: finalTime, stepTimes: finalStepTimes };
		},

		/**
		 * Skip the current tutorial
		 */
		skipTutorial: () => {
			set(initialState);
			clearPersistedState();
		},

		/**
		 * Show a prompt (start, resume, or rerun)
		 */
		showPrompt: (type: 'start' | 'resume' | 'rerun') => {
			update((state) => ({
				...state,
				showPrompt: true,
				promptType: type
			}));
		},

		/**
		 * Hide the prompt
		 */
		hidePrompt: () => {
			update((state) => ({
				...state,
				showPrompt: false,
				promptType: null
			}));
		},

		/**
		 * Reset the store to initial state
		 */
		reset: () => {
			set(initialState);
			clearPersistedState();
		},

		/**
		 * Get current step info
		 */
		getCurrentStep: (): TutorialStep | null => {
			const state = get({ subscribe });
			if (!state.currentTutorial || state.currentStepIndex >= state.totalSteps) {
				return null;
			}
			return state.currentTutorial.steps[state.currentStepIndex];
		},

		/**
		 * Check if on the correct route for current step
		 */
		isOnCorrectRoute: (currentPath: string): boolean => {
			const state = get({ subscribe });
			const step = state.currentTutorial?.steps[state.currentStepIndex];
			if (!step) return false;

			// Normalize paths for comparison (handle admin hash variations)
			const normalizedCurrent = currentPath.replace(/^\/admin-[a-zA-Z0-9]+/, '/admin');
			const normalizedStep = step.route;

			return normalizedCurrent.startsWith(normalizedStep);
		}
	};
}

export const tutorialStore = createTutorialStore();
