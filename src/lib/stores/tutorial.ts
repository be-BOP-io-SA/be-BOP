import { browser } from '$app/environment';
import { writable, get } from 'svelte/store';
import type { Tutorial, TutorialStep } from '$lib/types/Tutorial';
import type { TutorialProgress, TutorialStatus } from '$lib/types/TutorialProgress';

export interface TutorialState {
	isActive: boolean;
	tutorialId: string | null;
	currentStepIndex: number;
	totalSteps: number;
	status: 'idle' | 'running' | 'paused' | 'waiting_for_navigation';
	stepStartTime: number | null;
	totalTimeMs: number;
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
			totalTimeMs: state.totalTimeMs
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
	} catch {
		// Ignore storage errors
	}
}

function createTutorialStore() {
	const { subscribe, set, update } = writable<TutorialState>(initialState);

	// Persist state changes for navigation survival
	subscribe((state) => {
		if (state.isActive) {
			persistState(state);
		} else {
			clearPersistedState();
		}
	});

	return {
		subscribe,

		/**
		 * Initialize the store, potentially restoring from session storage
		 */
		initialize: () => {
			const persisted = getPersistedState();
			if (persisted && persisted.isActive && persisted.status === 'waiting_for_navigation') {
				update((state) => ({
					...state,
					...persisted,
					status: 'running' as const,
					stepStartTime: Date.now()
				}));
				return true; // Indicates we restored a paused tour
			}
			return false;
		},

		/**
		 * Start a new tutorial
		 */
		startTutorial: (tutorial: Tutorial, progress?: TutorialProgress) => {
			const resumeFromStep = progress?.currentStepIndex ?? 0;
			set({
				isActive: true,
				tutorialId: tutorial._id,
				currentStepIndex: resumeFromStep,
				totalSteps: tutorial.steps.length,
				status: 'running',
				stepStartTime: Date.now(),
				totalTimeMs: progress?.totalTimeMs ?? 0,
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
				return {
					...state,
					currentStepIndex: state.currentStepIndex + 1,
					totalTimeMs: state.totalTimeMs + stepDuration,
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
		 */
		completeTutorial: () => {
			const state = get({ subscribe });
			const finalTime = state.stepStartTime
				? state.totalTimeMs + (Date.now() - state.stepStartTime)
				: state.totalTimeMs;

			set({
				...initialState,
				totalTimeMs: finalTime
			});
			clearPersistedState();

			return finalTime;
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
