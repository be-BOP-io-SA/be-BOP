export interface CustomerTouchInterface {
	welcomeCmsSlug?: string;
	categories?: Array<{
		slug: string;
		cmsSlug: string;
		label: string;
		isArchived: boolean;
		position: number;
	}>;
}
