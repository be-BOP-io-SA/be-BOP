import type { CountryAlpha2 } from './Country';
import type { Currency } from './Currency';

export type DeliveryFees = Partial<
	Record<CountryAlpha2 | 'default', { amount: number; currency: Currency }>
>;

export interface DeliveryZone {
	name: string;
	countries: CountryAlpha2[];
	amount: number;
	currency: Currency;
}
