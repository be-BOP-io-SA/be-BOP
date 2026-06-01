import type { CountryAlpha2 } from './Country';
import type { Currency } from './Currency';

export interface DeliveryMethod {
	label: string;
	amount: number;
	currency: Currency;
}

export type DeliveryFees = Partial<
	Record<
		CountryAlpha2 | 'default',
		{
			amount: number;
			currency: Currency;
			// Base amount/currency = the implicit "Default" method; methods[] = additional named methods.
			methods?: DeliveryMethod[];
		}
	>
>;

export interface DeliveryZone {
	name: string;
	countries: CountryAlpha2[];
	amount: number;
	currency: Currency;
	// Absent = enabled (backward compat with zones created before this field existed).
	enabled?: boolean;
	methods?: DeliveryMethod[];
}

export const normalizeMethod = (label: string): string => label.trim().toLowerCase();
