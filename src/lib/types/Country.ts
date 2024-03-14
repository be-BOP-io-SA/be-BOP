// Gotten from https://gist.githubusercontent.com/tadast/8827699/raw/f5cac3d42d16b78348610fc4ec301e9234f82821/countries_codes_and_coordinates.csv

import type { IterableElement } from 'type-fest';

export const COUNTRY_ALPHA2S = new Set([
	'AD',
	'AE',
	'AF',
	'AG',
	'AI',
	'AL',
	'AM',
	'AN',
	'AO',
	'AQ',
	'AR',
	'AS',
	'AT',
	'AU',
	'AW',
	'AZ',
	'BA',
	'BB',
	'BD',
	'BE',
	'BF',
	'BG',
	'BH',
	'BI',
	'BJ',
	'BM',
	'BN',
	'BO',
	'BQ',
	'BR',
	'BS',
	'BT',
	'BV',
	'BW',
	'BY',
	'BZ',
	'CA',
	'CC',
	'CD',
	'CF',
	'CG',
	'CH',
	'CI',
	'CK',
	'CL',
	'CM',
	'CN',
	'CO',
	'CR',
	'CU',
	'CV',
	'CW',
	'CX',
	'CY',
	'CZ',
	'DE',
	'DJ',
	'DK',
	'DM',
	'DO',
	'DZ',
	'EC',
	'EE',
	'EG',
	'EH',
	'ER',
	'ES',
	'ET',
	'FI',
	'FJ',
	'FK',
	'FM',
	'FO',
	'FR',
	'GA',
	'GB',
	'GD',
	'GE',
	'GF',
	'GG',
	'GH',
	'GI',
	'GL',
	'GM',
	'GN',
	'GP',
	'GQ',
	'GR',
	'GS',
	'GT',
	'GU',
	'GW',
	'GY',
	'HK',
	'HM',
	'HN',
	'HR',
	'HT',
	'HU',
	'IC',
	'ID',
	'IE',
	'IL',
	'IM',
	'IN',
	'IO',
	'IQ',
	'IR',
	'IS',
	'IT',
	'JE',
	'JM',
	'JO',
	'JP',
	'KE',
	'KG',
	'KH',
	'KI',
	'KM',
	'KN',
	'KP',
	'KR',
	'KW',
	'KY',
	'KZ',
	'LA',
	'LB',
	'LC',
	'LI',
	'LK',
	'LR',
	'LS',
	'LT',
	'LU',
	'LV',
	'LY',
	'MA',
	'MC',
	'MD',
	'ME',
	'MF',
	'MG',
	'MH',
	'MK',
	'ML',
	'MM',
	'MN',
	'MO',
	'MP',
	'MQ',
	'MR',
	'MS',
	'MT',
	'MU',
	'MV',
	'MW',
	'MX',
	'MY',
	'MZ',
	'NA',
	'NC',
	'NE',
	'NF',
	'NG',
	'NI',
	'NL',
	'NO',
	'NP',
	'NR',
	'NU',
	'NZ',
	'OM',
	'PA',
	'PE',
	'PF',
	'PG',
	'PH',
	'PK',
	'PL',
	'PM',
	'PN',
	'PR',
	'PS',
	'PT',
	'PW',
	'PY',
	'QA',
	'RE',
	'RO',
	'RS',
	'RU',
	'RW',
	'SA',
	'SB',
	'SC',
	'SD',
	'SE',
	'SG',
	'SH',
	'SI',
	'SJ',
	'SK',
	'SL',
	'SM',
	'SN',
	'SO',
	'SR',
	'SS',
	'ST',
	'SV',
	'SY',
	'SZ',
	'TC',
	'TD',
	'TF',
	'TG',
	'TH',
	'TJ',
	'TK',
	'TL',
	'TM',
	'TN',
	'TO',
	'TR',
	'TT',
	'TV',
	'TW',
	'TZ',
	'UA',
	'UG',
	'UM',
	'US',
	'UY',
	'UZ',
	'VA',
	'VC',
	'VE',
	'VG',
	'VI',
	'VN',
	'VU',
	'WF',
	'WS',
	'XK',
	'YE',
	'YT',
	'ZA',
	'ZM',
	'ZW'
] as const);

export type CountryAlpha2 = IterableElement<typeof COUNTRY_ALPHA2S>;

export const VAT_RATES = {
	AG: 15,
	BQ: 8,
	VG: 0,
	IC: 20,
	CD: 16,
	CG: 18.9,
	CW: 9,
	SZ: 15,
	XK: 18,
	LA: 7,
	MO: 0,
	NE: 19,
	KP: 15,
	ST: 15,
	SB: 15,
	KN: 17,
	LC: 12.5,
	MF: 5,
	SY: 0,
	TT: 12.5,
	UZ: 12,
	AF: 10,
	FO: 25,
	AL: 20,
	DZ: 19,
	AS: 0,
	AD: 9.5,
	AO: 14,
	AI: 13,
	AR: 27,
	AM: 20,
	AW: 7,
	AU: 10,
	AT: 20,
	AZ: 18,
	BS: 10,
	BH: 10,
	BD: 15,
	BB: 22,
	BY: 26,
	BE: 21,
	BZ: 12.5,
	BJ: 18,
	BM: 0,
	BT: 20,
	BO: 13,
	BA: 17,
	BW: 14,
	BR: 18,
	BN: 0,
	BG: 20,
	BF: 18,
	BI: 18,
	KH: 10,
	CM: 19.25,
	CA: 15,
	CV: 15,
	KY: 0,
	CF: 19,
	TD: 18,
	CL: 19,
	CN: 13,
	CO: 19,
	KM: 10,
	CK: 15,
	CR: 13,
	HR: 25,
	CU: 10,
	CY: 19,
	CZ: 21,
	DK: 25,
	DJ: 10,
	DM: 15,
	DO: 18,
	EC: 12,
	EG: 14,
	SV: 13,
	GQ: 15,
	ER: 5,
	EE: 20,
	ET: 15,
	FJ: 15,
	FI: 24,
	FR: 20,
	GF: 0,
	PF: 16,
	GA: 18,
	GM: 15,
	GE: 18,
	DE: 19,
	GH: 15,
	GI: 0,
	GR: 24,
	GL: 0,
	GD: 15,
	GP: 8.5,
	GU: 2,
	GT: 12,
	GG: 0,
	GN: 18,
	GW: 15,
	GY: 14,
	HT: 10,
	HN: 18,
	HK: 0,
	HU: 27,
	IS: 24,
	IN: 28,
	ID: 11,
	IR: 25,
	IQ: 0,
	IE: 23,
	IM: 20,
	IL: 17,
	IT: 22,
	CI: 21.31,
	JM: 100,
	JP: 10,
	JE: 5,
	JO: 26,
	KZ: 12,
	KE: 16,
	KI: 12.5,
	KW: 0,
	KG: 12,
	LV: 21,
	LB: 11,
	LS: 15,
	LR: 15,
	LY: 0,
	LI: 7.7,
	LT: 21,
	LU: 17,
	MK: 18,
	MG: 20,
	MW: 16.5,
	MY: 10,
	MV: 16,
	ML: 18,
	MT: 18,
	MH: 0,
	MQ: 8.5,
	MR: 18,
	MU: 15,
	MX: 16,
	MD: 20,
	MC: 20,
	MN: 10,
	ME: 21,
	MA: 20,
	MZ: 16,
	MM: 8,
	NA: 15,
	NR: 0,
	NP: 13,
	NL: 21,
	AN: 8,
	NC: 22,
	NZ: 15,
	NI: 15,
	NG: 7.5,
	NU: 12.5,
	NO: 25,
	OM: 5,
	PK: 25,
	PW: 10,
	PA: 15,
	PG: 10,
	PY: 10,
	PE: 18,
	PH: 18,
	PL: 23,
	PT: 23,
	PR: 11.5,
	QA: 0,
	RE: 8.5,
	RO: 19,
	RU: 20,
	RW: 18,
	WS: 15,
	SM: 17,
	SA: 15,
	SN: 18,
	RS: 20,
	SC: 15,
	SL: 15,
	SG: 8,
	SK: 20,
	SI: 22,
	SO: 5,
	ZA: 15,
	KR: 10,
	SS: 15,
	ES: 21,
	LK: 18,
	SD: 17,
	SR: 10,
	SE: 25,
	CH: 8.1,
	TW: 5,
	TJ: 18,
	TZ: 18,
	TH: 7,
	TL: 5,
	TG: 18,
	TO: 15,
	TN: 19,
	TR: 20,
	TM: 15,
	TV: 7,
	UG: 18,
	UA: 20,
	AE: 5,
	GB: 20,
	US: 10.5,
	UY: 22,
	VU: 15,
	VE: 16.5,
	VN: 10,
	YE: 90,
	ZM: 16,
	ZW: 15,
	FM: 0,
	MS: 0,
	MP: 0,
	PS: 16
} satisfies Partial<Record<CountryAlpha2, number>>;

export function vatRate(country: CountryAlpha2 | undefined): number {
	if (!country) {
		return 0;
	}
	return VAT_RATES[country as keyof typeof VAT_RATES] || 0;
}

export function isAlpha2CountryCode(countryCode: string | undefined): countryCode is CountryAlpha2 {
	return COUNTRY_ALPHA2S.has(countryCode as CountryAlpha2);
}
