import type { Timestamps } from './Timestamps';

export const MAX_DIGITAL_FILE_SIZE = 100_000_000;

export interface DigitalFile extends Timestamps {
	_id: string;
	productId?: string;
	name: string;
	storage: {
		key: string;
		size: number;
		url?: string;
	};
	secret?: string;
}
