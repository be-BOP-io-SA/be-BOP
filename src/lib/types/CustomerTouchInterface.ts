export interface CustomerTouchInterface {
	enableCustomerLogin: boolean;
	categories?: Array<{
		cmsSlug: string;
		isArchived: boolean;
		label: string;
		position: number;
		slug: string;
	}>;
	timeoutNostrSeconds?: number;
	welcomeCmsSlug?: string;
}
