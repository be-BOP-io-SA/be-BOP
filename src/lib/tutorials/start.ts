import { parseCourse } from './parse';
import type { Course } from './types';

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

export async function startTour(id: string): Promise<void> {
	const course = loadCourse(id);
	if (!course) {
		console.warn(`Tutorial "${id}" not found`);
		return;
	}

	const { default: Shepherd } = await import('shepherd.js');
	await import('shepherd.js/dist/css/shepherd.css');

	const tour = new Shepherd.Tour({
		useModalOverlay: true,
		defaultStepOptions: {
			cancelIcon: { enabled: true },
			scrollTo: true
		}
	});

	for (let i = 0; i < course.steps.length; i++) {
		const step = course.steps[i];
		tour.addStep({
			id: step.id,
			text: step.text,
			attachTo: step.attachTo,
			buttons: [
				...(i > 0 ? [{ text: 'Back', action: tour.back }] : []),
				i < course.steps.length - 1
					? { text: 'Next', action: tour.next }
					: { text: 'Done', action: tour.complete }
			]
		});
	}

	tour.start();
}
