import { describe, it, expect } from 'vitest';
import { parseCourse } from './parse';

const validCourse = `---
id: test
name: Test course
steps:
  - id: step1
    attachTo:
      element: h1
      on: bottom
  - id: step2
---

## step1

Hello **world**

## step2

Second step content
`;

describe('parseCourse', () => {
	it('parses a valid course', () => {
		const course = parseCourse(validCourse);
		expect(course.id).toBe('test');
		expect(course.name).toBe('Test course');
		expect(course.steps).toHaveLength(2);
		expect(course.steps[0].id).toBe('step1');
		expect(course.steps[0].text).toContain('<strong>world</strong>');
		expect(course.steps[0].attachTo).toEqual({ element: 'h1', on: 'bottom' });
		expect(course.steps[1].id).toBe('step2');
		expect(course.steps[1].attachTo).toBeUndefined();
	});

	it('throws on missing body for a step', () => {
		const raw = `---
id: test
name: Test
steps:
  - id: missing
---

## other

Some content
`;
		expect(() => parseCourse(raw)).toThrow('No markdown body found for step "missing"');
	});

	it('throws on extra body section', () => {
		const raw = `---
id: test
name: Test
steps:
  - id: step1
---

## step1

Content

## extra

Not referenced
`;
		expect(() => parseCourse(raw)).toThrow('has no matching step in front-matter');
	});

	it('throws on missing front-matter fields', () => {
		const raw = `---
id: test
---

## step1

Content
`;
		expect(() => parseCourse(raw)).toThrow('must have id, name, and steps');
	});
});
