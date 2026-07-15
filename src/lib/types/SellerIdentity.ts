import type { CountryAlpha2 } from './Country';

export interface SellerIdentity {
	businessName: string;
	vatNumber?: string;

	address: {
		street: string;
		zip: string;
		city: string;
		country: CountryAlpha2;
		state?: string;
	};

	contact: {
		email: string;
		phone?: string;
	};

	bank?: {
		iban: string;
		bic: string;
		accountHolder?: string;
		accountHolderAddress?: string;
	};

	/** Legal registration identifiers, required for e-invoicing (EN16931 BT-30) */
	legal?: {
		/** 14 digits; SIREN is derived as the first 9 */
		siret?: string;
		/** e.g. "SAS", "SARL", "EI" */
		legalForm?: string;
		/** Registration mention, e.g. "RCS Paris" */
		rcs?: string;
		/** e.g. "10 000 €" */
		shareCapital?: string;
	};

	invoice?: {
		issuerInfo?: string;
	};
}
