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
	timeoutNostrSeconds?: number;
	welcomeCmsSlug?: string;
}
