import type { LanguageKey } from '$lib/translations';
import type { Currency } from './Currency';
import type { Order } from './Order';
import type { Timestamps } from './Timestamps';

export interface ChallengeTranslatableFields {
	name: string;
}
export type Challenge = Timestamps &
	ChallengeTranslatableFields & {
		_id: string;
		translations?: Partial<Record<LanguageKey, Partial<ChallengeTranslatableFields>>>;

		/* If empty, works on all products */
		productIds: string[];

		recurring: false | 'monthly';

		progress: number;

		beginsAt: Date;
		endsAt: Date;
		event?: {
			type: 'progress';
			at: Date;
			order: Order['_id'];
			amount: number;
		}[];
		ratio?: 'total' | 'global' | 'perProduct';
		globalRatio?: number;
		perProductRatio?: Record<string, number>;
	} & (
		| {
				goal: {
					amount: number;
					currency?: undefined;
				};

				/**
				 * totalProducts: The goal is to sell a certain number of products
				 */
				mode: 'totalProducts';
		  }
		| {
				goal: {
					currency: Currency;
					amount: number;
				};

				/**
				 * moneyAmount: The goal is to earn a certain amount of money
				 */
				mode: 'moneyAmount';
		  }
	);
