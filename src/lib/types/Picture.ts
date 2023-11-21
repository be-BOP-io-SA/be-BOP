import type { Timestamps } from './Timestamps';
import type { Slider } from './slider';
export const TAGTYPES = ['main', 'full', 'wide', 'slim', 'avatar'] as const;
export type TagType = (typeof TAGTYPES)[number];
export const LOGOTYPES = ['light', 'dark'] as const;
export type LogoType = (typeof LOGOTYPES)[number];

export interface ImageData {
	key: string;
	width: number;
	height: number;
	size: number;
	url?: string;
}

export interface Picture extends Timestamps {
	_id: string;
	productId?: string;
	tag?: {
		_id: string;
		type: 'main' | 'full' | 'wide' | 'slim' | 'avatar';
	};
	slider?: {
		_id: Slider['_id'];
		url?: string;
		openNewTab?: boolean;
	};
	theme?: {
		_id: string;
		type: 'light' | 'dark';
	};
	name: string;

	storage: {
		original: ImageData;
		formats: ImageData[];
	};
}

export const DEFAULT_LOGO = 'https://coyo.dev/icons/logo.png';
