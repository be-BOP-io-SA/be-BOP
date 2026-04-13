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

export interface CourseStep {
	id: string;
	text: string;
	attachTo?: {
		element: string;
		on?: PopperPlacement;
	};
	buttons?: Array<{
		text: string;
		action: string;
	}>;
}

export interface Course {
	id: string;
	name: string;
	steps: CourseStep[];
}
