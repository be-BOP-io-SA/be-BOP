import type { Step } from 'shepherd.js';
import { parseCourse } from './parse';
import type { Course, CourseStepButton } from './types';

const rawCourses = import.meta.glob('./courses/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
});

const courseCache = new Map<string, Course>();

function loadCourse(id: string): Course | undefined {
	if (courseCache.has(id)) {
		return courseCache.get(id);
	}
	for (const [path, raw] of Object.entries(rawCourses)) {
		const filename = path.split('/').pop()?.replace('.md', '');
		if (filename === id) {
			const course = parseCourse(raw as string);
			courseCache.set(id, course);
			return course;
		}
	}
	return undefined;
}

function matchesCurrentPage(stepPage: string): boolean {
	const normalized = window.location.pathname.replace(/^\/admin(-[^/]+)?/, '/admin');
	return normalized === stepPage;
}

export async function startTour(id: string, fromStepId?: string): Promise<void> {
	const course = loadCourse(id);
	if (!course) {
		console.warn(`Tutorial "${id}" not found`);
		return;
	}

	// Filter steps to current page only
	let pageSteps = course.steps.filter((s) => !s.page || matchesCurrentPage(s.page));
	if (fromStepId) {
		const idx = pageSteps.findIndex((s) => s.id === fromStepId);
		if (idx !== -1) {
			pageSteps = pageSteps.slice(idx);
		}
	}
	if (pageSteps.length === 0) {
		return;
	}

	const { default: Shepherd } = await import('shepherd.js');
	await import('shepherd.js/dist/css/shepherd.css');

	const tour = new Shepherd.Tour({
		useModalOverlay: true,
		defaultStepOptions: {
			cancelIcon: { enabled: true },
			scrollTo: false
		}
	});

	function resolveAction(action: CourseStepButton['action']): () => void {
		switch (action) {
			case 'next':
				return () => tour.next();
			case 'back':
				return () => tour.back();
			case 'complete':
				return () => tour.complete();
			case 'cancel':
				return () => tour.cancel();
			default:
				if (action.startsWith('show:')) {
					const stepId = action.slice(5);
					return () => tour.show(stepId);
				}
				if (action.startsWith('goto:')) {
					const payload = action.slice(5);
					const sepIdx = payload.lastIndexOf('|');
					const url = sepIdx === -1 ? payload : payload.slice(0, sepIdx);
					const marker = sepIdx === -1 ? null : payload.slice(sepIdx + 1);
					return () => {
						if (marker) {
							sessionStorage.setItem('tutorial_progress', marker);
						}
						tour.complete();
						const adminMatch = window.location.pathname.match(/^\/admin(-[^/]+)?/);
						const adminPrefix = adminMatch ? adminMatch[0] : '/admin';
						window.location.href = url.replace(/^\/admin/, adminPrefix);
					};
				}
				if (action.startsWith('branch:')) {
					const payload = action.slice(7);
					const parts = payload.split('|');
					const selector = parts[0];
					const ifPresent = parts[1];
					const ifAbsent = parts[2];
					return () => {
						if (document.querySelector(selector)) {
							tour.show(ifPresent);
						} else {
							tour.show(ifAbsent);
						}
					};
				}
				if (action.startsWith('clickAndStore:')) {
					const payload = action.slice(14);
					const sepIdx = payload.lastIndexOf('|');
					const selector = payload.slice(0, sepIdx);
					const storageValue = payload.slice(sepIdx + 1);
					return () => {
						sessionStorage.setItem('tutorial_progress', storageValue);
						tour.complete();
						const el = document.querySelector(selector) as HTMLElement;
						if (el) {
							el.click();
						}
					};
				}
				return () => tour.next();
		}
	}

	for (let i = 0; i < pageSteps.length; i++) {
		const step = pageSteps[i];
		const stepButtons = step.buttons
			? step.buttons
			: [
					...(i > 0 ? [{ text: 'Back (b)', action: 'back' as const, key: 'b' }] : []),
					i < pageSteps.length - 1
						? { text: 'Next (n)', action: 'next' as const, key: 'n' }
						: { text: 'Done (d)', action: 'complete' as const, key: 'd' }
			  ];

		const disabledKeys = new Set<string>();
		const keyMap = new Map<string, () => void>();
		const resolvedButtons = stepButtons.map((btn) => {
			const action = resolveAction(btn.action);
			if (btn.key) {
				keyMap.set(btn.key.toLowerCase(), action);
			}
			return { text: btn.text, action };
		});

		const shepherdStep = tour.addStep({
			id: step.id,
			text: step.text,
			attachTo: step.attachTo,
			buttons: resolvedButtons
		}) as Step;

		// Smart scroll: only scroll if element is below top 30% of viewport
		if (step.attachTo?.element) {
			const selector = step.attachTo.element;
			shepherdStep.on('show', () => {
				const el = document.querySelector(selector);
				if (el) {
					const rect = el.getBoundingClientRect();
					if (rect.top > window.innerHeight * 0.3 || rect.top < 0) {
						el.scrollIntoView({ behavior: 'smooth', block: 'center' });
					}
				}
			});
		}

		if (keyMap.size > 0) {
			const handler = (e: KeyboardEvent) => {
				const tag = (e.target as HTMLElement)?.tagName;
				if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
					return;
				}
				if (disabledKeys.has(e.key.toLowerCase())) {
					e.preventDefault();
					return;
				}
				const fn = keyMap.get(e.key.toLowerCase());
				if (fn) {
					e.preventDefault();
					fn();
				}
			};
			shepherdStep.on('show', () => document.addEventListener('keydown', handler));
			shepherdStep.on('hide', () => document.removeEventListener('keydown', handler));
		}

		// Handle enableWhen: disable button until condition is met
		const buttonsWithEnableWhen = stepButtons.filter((btn) => btn.enableWhen);
		if (buttonsWithEnableWhen.length > 0) {
			shepherdStep.on('show', () => {
				const stepEl = shepherdStep.getElement();
				if (!stepEl) {
					return;
				}
				const footerBtns = stepEl.querySelectorAll('.shepherd-footer button');
				stepButtons.forEach((btn, btnIdx) => {
					if (!btn.enableWhen) {
						return;
					}
					const input = document.querySelector(btn.enableWhen.selector) as HTMLInputElement;
					const targetBtn = footerBtns[btnIdx] as HTMLButtonElement;
					if (!input || !targetBtn) {
						return;
					}
					const minLen = btn.enableWhen.minLength ? Number(btn.enableWhen.minLength) : 0;
					const pattern = btn.enableWhen.pattern
						? new RegExp(btn.enableWhen.pattern as string)
						: null;
					const requireChecked =
						btn.enableWhen.checked === true || (btn.enableWhen.checked as unknown) === 'true';
					const requireUnchecked =
						btn.enableWhen.unchecked === true || (btn.enableWhen.unchecked as unknown) === 'true';
					const check = () => {
						let disabled = minLen > 0 && input.value.length < minLen;
						if (!disabled && pattern) {
							disabled = !pattern.test(input.value);
						}
						if (!disabled && requireChecked) {
							disabled = !input.checked;
						}
						if (!disabled && requireUnchecked) {
							disabled = input.checked;
						}
						targetBtn.disabled = disabled;
						targetBtn.style.opacity = disabled ? '0.5' : '1';
						if (btn.key) {
							if (disabled) {
								disabledKeys.add(btn.key.toLowerCase());
							} else {
								disabledKeys.delete(btn.key.toLowerCase());
							}
						}
					};
					check();
					const evt = requireChecked || requireUnchecked ? 'change' : 'input';
					input.addEventListener(evt, check);
					shepherdStep.on('hide', () => input.removeEventListener(evt, check));
				});
			});
		}
	}

	tour.start();
}
