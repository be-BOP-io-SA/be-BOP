export interface CustomerTouchInterface {
	enableCustomerLogin: boolean;
	categories?: Array<{
		cmsSlug: string;
		isArchived: boolean;
		isCmsOnly?: boolean;
		label: string;
		position: number;
		slug: string;
		tagId?: string;
	}>;
	helpRequestNpub?: string;
	helpRequestCooldownSeconds?: number;
	timeoutDroppedSeconds?: number;
	timeoutNostrSeconds?: number;
	welcomeCmsSlug?: string;
}
