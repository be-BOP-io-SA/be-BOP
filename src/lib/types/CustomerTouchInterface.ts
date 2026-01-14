export interface CustomerTouchInterface {
	enableCustomerLogin: boolean;
	categories?: Array<{
		cmsSlug: string;
		isArchived: boolean;
		label: string;
		position: number;
		slug: string;
		tagId?: string;
	}>;
	timeoutDroppedSeconds?: number;
	timeoutNostrSeconds?: number;
	welcomeCmsSlug?: string;
}
