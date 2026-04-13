import { marked } from 'marked';
import type { Course, CourseStep } from './types';

/**
 * Minimal YAML parser for course front-matter.
 * Handles: scalar values, arrays of objects, nested objects, nested arrays.
 * No external dependency needed — the YAML structure is constrained.
 */
function parseSimpleYaml(text: string): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	const lines = text.split(/\r?\n/).filter((l) => !l.trim().startsWith('#'));
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];
		if (!line.trim()) {
			i++;
			continue;
		}

		const topMatch = line.match(/^(\w+):\s*(.*)$/);
		if (!topMatch) {
			i++;
			continue;
		}

		const key = topMatch[1];
		const inlineValue = topMatch[2].trim();

		if (inlineValue) {
			result[key] = stripQuotes(inlineValue);
			i++;
		} else {
			i++;
			if (i < lines.length && lines[i].match(/^\s+-\s/)) {
				const parsed = parseArray(lines, i);
				result[key] = parsed.arr;
				i = parsed.nextIndex;
			} else {
				result[key] = '';
			}
		}
	}

	return result;
}

function parseArray(
	lines: string[],
	startIndex: number
): { arr: Record<string, unknown>[]; nextIndex: number } {
	const arr: Record<string, unknown>[] = [];
	let i = startIndex;
	const arrayIndent = lines[i].match(/^(\s*)/)![1].length;

	while (i < lines.length && lines[i].match(/^\s+-\s/)) {
		const lineIndent = lines[i].match(/^(\s*)/)![1].length;
		if (lineIndent !== arrayIndent) {
			break;
		}
		const obj: Record<string, unknown> = {};
		const itemMatch = lines[i].match(/^\s+-\s+(\w+):\s*(.*)$/);
		if (itemMatch) {
			obj[itemMatch[1]] = stripQuotes(itemMatch[2].trim());
		}
		const itemIndent = lines[i].match(/^(\s*)-/)![1].length + 2;
		i++;

		while (i < lines.length) {
			const propLine = lines[i];
			if (!propLine.trim() || propLine.match(/^\s*-\s/) || !propLine.match(/^\s/)) {
				break;
			}
			const currentIndent = propLine.match(/^(\s*)/)![1].length;
			if (currentIndent < itemIndent) {
				break;
			}
			const propMatch = propLine.match(/^\s+(\w+):\s*(.*)$/);
			if (propMatch) {
				const propValue = propMatch[2].trim();
				if (propValue) {
					obj[propMatch[1]] = stripQuotes(propValue);
				} else {
					i++;
					if (i < lines.length && lines[i].match(/^\s+-\s/)) {
						// Nested array
						const nested = parseArray(lines, i);
						obj[propMatch[1]] = nested.arr;
						i = nested.nextIndex;
					} else {
						// Nested object
						const nested: Record<string, string> = {};
						while (i < lines.length) {
							const nestedLine = lines[i];
							const nestedIndent = nestedLine.match(/^(\s*)/)![1].length;
							if (nestedIndent <= currentIndent || !nestedLine.trim()) {
								break;
							}
							const nestedMatch = nestedLine.match(/^\s+(\w+):\s*(.+)$/);
							if (nestedMatch) {
								nested[nestedMatch[1]] = stripQuotes(nestedMatch[2].trim());
							}
							i++;
						}
						obj[propMatch[1]] = nested;
					}
					continue;
				}
			}
			i++;
		}
		arr.push(obj);
	}

	return { arr, nextIndex: i };
}

function stripQuotes(s: string): string {
	if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
		return s.slice(1, -1);
	}
	return s;
}

function parseFrontMatter(raw: string): { data: Record<string, unknown>; content: string } {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
	if (!match) {
		return { data: {}, content: raw };
	}
	return { data: parseSimpleYaml(match[1]), content: match[2] };
}

export function parseCourse(raw: string): Course {
	const { data, content } = parseFrontMatter(raw);

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

	const steps: CourseStep[] = (
		data.steps as {
			id: string;
			page?: string;
			attachTo?: CourseStep['attachTo'];
			buttons?: CourseStep['buttons'];
		}[]
	).map((s) => {
		const body = bodyMap.get(s.id);
		if (!body) {
			throw new Error(`No markdown body found for step "${s.id}"`);
		}
		return {
			id: s.id,
			text: marked.parse(body, { async: false }) as string,
			...(s.page && { page: s.page }),
			...(s.attachTo && { attachTo: s.attachTo }),
			...(s.buttons && { buttons: s.buttons })
		};
	});

	// Check for extra body sections not referenced by front-matter
	const stepIds = new Set((data.steps as { id: string }[]).map((s) => s.id));
	for (const key of bodyMap.keys()) {
		if (!stepIds.has(key)) {
			throw new Error(`Markdown section "${key}" has no matching step in front-matter`);
		}
	}

	return { id: data.id as string, name: data.name as string, steps };
}
