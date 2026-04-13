import matter from 'gray-matter';
import { marked } from 'marked';
import type { Course, CourseStep } from './types';

export function parseCourse(raw: string): Course {
	const { data, content } = matter(raw);

	if (!data.id || !data.name || !Array.isArray(data.steps)) {
		throw new Error('Course front-matter must have id, name, and steps');
	}

	// Split markdown body by ## headings into a map of stepId -> markdown
	const bodyMap = new Map<string, string>();
	const sections = content.split(/^## /m).filter(Boolean);
	for (const section of sections) {
		const newline = section.indexOf('\n');
		if (newline === -1) {
			continue;
		}
		const id = section.slice(0, newline).trim();
		if (!id) {
			continue;
		}
		const body = section.slice(newline + 1).trim();
		bodyMap.set(id, body);
	}

	const steps: CourseStep[] = data.steps.map(
		(s: { id: string; attachTo?: CourseStep['attachTo'] }) => {
			const body = bodyMap.get(s.id);
			if (!body) {
				throw new Error(`No markdown body found for step "${s.id}"`);
			}
			return {
				id: s.id,
				text: marked.parse(body, { async: false }) as string,
				...(s.attachTo && { attachTo: s.attachTo })
			};
		}
	);

	// Check for extra body sections not referenced by front-matter
	const stepIds = new Set(data.steps.map((s: { id: string }) => s.id));
	for (const key of bodyMap.keys()) {
		if (!stepIds.has(key)) {
			throw new Error(`Markdown section "${key}" has no matching step in front-matter`);
		}
	}

	return { id: data.id, name: data.name, steps };
}
