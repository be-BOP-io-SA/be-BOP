type PopperPlacement =
	| 'top'
	| 'top-start'
	| 'top-end'
	| 'bottom'
	| 'bottom-start'
	| 'bottom-end'
	| 'right'
	| 'right-start'
	| 'right-end'
	| 'left'
	| 'left-start'
	| 'left-end';

export interface CourseStepButton {
	text: string;
	action:
		| 'next'
		| 'back'
		| 'complete'
		| 'cancel'
		| `show:${string}`
		| `goto:${string}`
		| `clickAndStore:${string}`
		| `branch:${string}`;
	key?: string;
	enableWhen?: {
		selector: string;
		minLength?: number;
		pattern?: string;
		checked?: boolean;
		unchecked?: boolean;
	};
}

export interface CourseStep {
	id: string;
	text: string;
	page?: string;
	attachTo?: {
		element: string;
		on?: PopperPlacement;
	};
	buttons?: CourseStepButton[];
}

export interface Course {
	id: string;
	name: string;
	steps: CourseStep[];
}
