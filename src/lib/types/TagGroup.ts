import type { Timestamps } from './Timestamps';

export interface TagGroup extends Timestamps {
	_id: string;
	name: string;
	tagIds: string[];
	order: number;
}
