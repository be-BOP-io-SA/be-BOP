import type { Tag } from './Tag';

export interface PrintTicketOptions {
	mode: 'all' | 'newlyOrdered';
	tagFilter?: Tag['_id'];
}
