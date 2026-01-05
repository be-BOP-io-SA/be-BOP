<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { beforeNavigate, afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Shepherd from 'shepherd.js';
	import { tutorialStore } from '$lib/stores/tutorial';
	import { useI18n } from '$lib/i18n';
	import type { Tutorial } from '$lib/types/Tutorial';
	import type { TutorialProgress } from '$lib/types/TutorialProgress';
	import TutorialPrompt from './TutorialPrompt.svelte';

	export let tutorial: Tutorial | null = null;
	export let progress: TutorialProgress | null = null;
	export let adminPrefix: string = '/admin';

	const { t } = useI18n();
	let tour: Shepherd.Tour | null = null;
	let isNavigating = false;
	let pendingStepIndex: number | null = null;

	beforeNavigate(() => {
		console.log('[Tutorial] beforeNavigate');
		if (tour && $tutorialStore.isActive) {
			tour.hide();
			isNavigating = true;
		}
	});

	afterNavigate(() => {
		console.log('[Tutorial] afterNavigate', { isNavigating, pendingStepIndex });
		if (isNavigating && $tutorialStore.isActive) {
			isNavigating = false;
			// Small delay to let the page render
			setTimeout(() => {
				if (pendingStepIndex !== null) {
					showCurrentStep();
					pendingStepIndex = null;
				}
			}, 100);
		}
	});

	function waitForElement(selector: string, timeout = 5000): Promise<Element | null> {
		return new Promise((resolve) => {
			const element = document.querySelector(selector);
			if (element) {
				resolve(element);
				return;
			}

			const observer = new MutationObserver(() => {
				const el = document.querySelector(selector);
				if (el) {
					observer.disconnect();
					resolve(el);
				}
			});

			observer.observe(document.body, { childList: true, subtree: true });

			setTimeout(() => {
				observer.disconnect();
				resolve(null);
			}, timeout);
		});
	}

	function initializeTour() {
		if (!tutorial) return;

		tour = new Shepherd.Tour({
			useModalOverlay: true,
			defaultStepOptions: {
				cancelIcon: { enabled: true },
				scrollTo: { behavior: 'smooth', block: 'center' }
			}
		});

		tour.on('cancel', () => {
			console.log('[Tutorial] Tour cancelled');
			tutorialStore.skipTutorial();
		});

		console.log('[Tutorial] Tour initialized');
	}

	async function showCurrentStep() {
		if (!tutorial || !tour) return;

		const state = $tutorialStore;
		const stepDef = tutorial.steps[state.currentStepIndex];

		if (!stepDef) {
			console.log('[Tutorial] No step definition for index', state.currentStepIndex);
			return;
		}

		console.log('[Tutorial] Showing step', stepDef.id, 'on route', stepDef.route);

		// Check if we need to navigate
		const currentPath = $page.url.pathname.replace(/^\/admin-[a-zA-Z0-9]+/, '/admin');
		if (!currentPath.startsWith(stepDef.route)) {
			console.log('[Tutorial] Need to navigate from', currentPath, 'to', stepDef.route);
			pendingStepIndex = state.currentStepIndex;
			tutorialStore.pauseForNavigation();
			const targetRoute = stepDef.route.replace('/admin', adminPrefix);
			await goto(targetRoute);
			return;
		}

		// Wait for element
		const element = await waitForElement(stepDef.attachTo.element);
		if (!element) {
			console.error('[Tutorial] Cannot show step', stepDef.id, ', element not found:', stepDef.attachTo.element);
			return;
		}

		// Clear existing steps and add current one
		while (tour.steps.length > 0) {
			tour.steps[0].destroy();
		}

		const isLastStep = state.currentStepIndex >= tutorial.steps.length - 1;
		const buttons = [];

		if (state.currentStepIndex > 0) {
			buttons.push({
				text: t('tutorial.common.previous'),
				action: () => {
					tutorialStore.prevStep();
					showCurrentStep();
				},
				classes: 'shepherd-button-secondary'
			});
		}

		if (isLastStep) {
			buttons.push({
				text: t('tutorial.common.finish'),
				action: async () => {
					const totalTime = tutorialStore.completeTutorial();
					tour?.complete();
					// Save completion to server
					try {
						await fetch('/api/tutorial/complete', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ tutorialId: tutorial?._id, totalTimeMs: totalTime })
						});
					} catch (e) {
						console.error('[Tutorial] Failed to save completion:', e);
					}
				}
			});
		} else {
			// Check if this step has a required action
			const hasRequiredAction = !!stepDef.requiredAction;
			buttons.push({
				text: t('tutorial.common.next'),
				action: () => {
					tutorialStore.nextStep();
					showCurrentStep();
				},
				disabled: hasRequiredAction,
				classes: hasRequiredAction ? 'shepherd-button-primary shepherd-button-disabled' : 'shepherd-button-primary'
			});
		}

		tour.addStep({
			id: stepDef.id,
			title: `${tutorial.name} - ${t('tutorial.common.stepCounter', { current: state.currentStepIndex + 1, total: tutorial.steps.length })}`,
			text: `<strong>${t(stepDef.titleKey)}</strong><br/>${t(stepDef.textKey)}`,
			attachTo: { element: stepDef.attachTo.element, on: stepDef.attachTo.on },
			buttons
		});

		tour.start();

		// Setup required action monitoring if needed
		if (stepDef.requiredAction) {
			setupRequiredActionMonitoring(stepDef);
		}
	}

	function setupRequiredActionMonitoring(stepDef: Tutorial['steps'][0]) {
		if (!stepDef.requiredAction) return;

		const { type, selector, validation } = stepDef.requiredAction;

		if (type === 'input' && validation === 'non-empty') {
			const input = document.querySelector(selector) as HTMLInputElement;
			if (input) {
				const updateButtonState = () => {
					const nextBtn = document.querySelector('.shepherd-button-primary') as HTMLButtonElement;
					if (nextBtn) {
						const hasValue = input.value.trim().length > 0;
						nextBtn.disabled = !hasValue;
						nextBtn.classList.toggle('shepherd-button-disabled', !hasValue);
					}
				};

				input.addEventListener('input', updateButtonState);
				updateButtonState(); // Initial check
			}
		}
	}

	async function startTutorial() {
		if (!tutorial) return;

		console.log('[Tutorial] Starting tutorial', tutorial._id);
		tutorialStore.startTutorial(tutorial, progress ?? undefined);
		initializeTour();
		await showCurrentStep();
	}

	function handleRequestStart(event: CustomEvent) {
		if (tutorial) {
			tutorialStore.showPrompt('start');
		}
	}

	function handlePromptStart() {
		tutorialStore.hidePrompt();
		console.log('[Tutorial] Starting tutorial from prompt...');
		startTutorial();
	}

	function handlePromptSkip() {
		tutorialStore.hidePrompt();
		tutorialStore.skipTutorial();
	}

	function handlePromptResume() {
		tutorialStore.hidePrompt();
		console.log('[Tutorial] Resuming tutorial...');
		startTutorial();
	}

	onMount(() => {
		console.log('[Tutorial] onMount', { tutorial: !!tutorial, isActive: $tutorialStore.isActive });
		window.addEventListener('tutorial:request-start', handleRequestStart as EventListener);

		// Check if we need to restore a paused tutorial
		const restored = tutorialStore.initialize();
		if (restored && tutorial) {
			console.log('[Tutorial] Restoring paused tutorial');
			initializeTour();
			showCurrentStep();
		}

		return () => {
			window.removeEventListener('tutorial:request-start', handleRequestStart as EventListener);
		};
	});

	onDestroy(() => {
		if (tour) {
			tour.complete();
			tour = null;
		}
	});
</script>

<slot />

{#if $tutorialStore.showPrompt}
	<TutorialPrompt
		type={$tutorialStore.promptType}
		tutorialName={tutorial?.name ?? ''}
		on:start={handlePromptStart}
		on:skip={handlePromptSkip}
		on:resume={handlePromptResume}
	/>
{/if}
