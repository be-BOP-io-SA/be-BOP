import type { Timestamps } from './Timestamps';

export interface TagFamily extends Timestamps {
	_id: string;
	name: string;
	order: number;
}
