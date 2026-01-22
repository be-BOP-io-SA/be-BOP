import { error } from '@sveltejs/kit';
import type { Price } from './Order';

export const CURRENCIES = [
	'BTC',
	'SAT',
	'AED',
	'AFN',
	'ALL',
	'AMD',
	'ANG',
	'AOA',
	'ARS',
	'AUD',
	'AWG',
	'AZN',
	'BAM',
	'BBD',
	'BDT',
	'BGN',
	'BHD',
	'BIF',
	'BMD',
	'BND',
	'BOB',
	'BRL',
	'BSD',
	'BTN',
	'BWP',
	'BYN',
	'BYR',
	'BZD',
	'CAD',
	'CDF',
	'CHF',
	'CLF',
	'CLP',
	'CNY',
	'COP',
	'CRC',
	'CUC',
	'CUP',
	'CVE',
	'CZK',
	'DJF',
	'DKK',
	'DOP',
	'DZD',
	'EEK',
	'EGP',
	'ETB',
	'EUR',
	'FJD',
	'FKP',
	'GBP',
	'GEL',
	'GHS',
	'GIP',
	'GMD',
	'GNF',
	'GTQ',
	'GYD',
	'HKD',
	'HNL',
	'HRK',
	'HTG',
	'HUF',
	'IDR',
	'ILS',
	'INR',
	'IQD',
	'IRR',
	'ISK',
	'JMD',
	'JOD',
	'JPY',
	'KES',
	'KGS',
	'KHR',
	'KMF',
	'KPW',
	'KRW',
	'KWD',
	'KYD',
	'KZT',
	'LAK',
	'LBP',
	'LKR',
	'LRD',
	'LSL',
	'LTL',
	'LVL',
	'LYD',
	'MAD',
	'MDL',
	'MGA',
	'MKD',
	'MMK',
	'MNT',
	'MOP',
	'MRO',
	'MRU',
	'MUR',
	'MVR',
	'MWK',
	'MXN',
	'MYR',
	'MZN',
	'NAD',
	'NGN',
	'NIO',
	'NOK',
	'NPR',
	'NZD',
	'OMR',
	'PAB',
	'PEN',
	'PGK',
	'PHP',
	'PKR',
	'PLN',
	'PYG',
	'QAR',
	'RON',
	'RSD',
	'RUB',
	'RWF',
	'SAR',
	'SBD',
	'SCR',
	'SDG',
	'SEK',
	'SGD',
	'SHP',
	'SKK',
	'SLL',
	'SOS',
	'SRD',
	'SSP',
	'STD',
	'SVC',
	'SYP',
	'SZL',
	'THB',
	'TJS',
	'TMM',
	'TMT',
	'TND',
	'TOP',
	'TRY',
	'TTD',
	'TWD',
	'TZS',
	'UAH',
	'UGX',
	'USD',
	'UYU',
	'UZS',
	'VEF',
	'VES',
	'VND',
	'VUV',
	'WST',
	'XAF',
	'XCD',
	'XDR',
	'XOF',
	'YER',
	'ZAR',
	'ZMK',
	'ZMW',
	'ZWD'
] as const;
export type Currency = (typeof CURRENCIES)[number];

export const SATOSHIS_PER_BTC = 100_000_000;

export const FRACTION_DIGITS_PER_CURRENCY = Object.freeze({
	BTC: 8,
	SAT: 0,
	AED: 2,
	AFN: 2,
	ALL: 2,
	AMD: 2,
	ANG: 2,
	AOA: 2,
	ARS: 2,
	AUD: 2,
	AWG: 2,
	AZN: 2,
	BAM: 2,
	BBD: 2,
	BDT: 2,
	BGN: 2,
	BHD: 2,
	BIF: 2,
	BMD: 2,
	BND: 2,
	BOB: 2,
	BRL: 2,
	BSD: 2,
	BTN: 2,
	BWP: 2,
	BYN: 2,
	BYR: 2,
	BZD: 2,
	CAD: 2,
	CDF: 2,
	CHF: 2,
	CLF: 2,
	CLP: 2,
	CNY: 2,
	COP: 2,
	CRC: 2,
	CUC: 2,
	CUP: 2,
	CVE: 2,
	CZK: 2,
	DJF: 2,
	DKK: 2,
	DOP: 2,
	DZD: 2,
	EEK: 2,
	EGP: 2,
	ETB: 2,
	EUR: 2,
	FJD: 2,
	FKP: 2,
	GBP: 2,
	GEL: 2,
	GHS: 2,
	GIP: 2,
	GMD: 2,
	GNF: 2,
	GTQ: 2,
	GYD: 2,
	HKD: 2,
	HNL: 2,
	HRK: 2,
	HTG: 2,
	HUF: 2,
	IDR: 2,
	ILS: 2,
	INR: 2,
	IQD: 2,
	IRR: 2,
	ISK: 2,
	JMD: 2,
	JOD: 2,
	JPY: 2,
	KES: 2,
	KGS: 2,
	KHR: 2,
	KMF: 2,
	KPW: 2,
	KRW: 2,
	KWD: 2,
	KYD: 2,
	KZT: 2,
	LAK: 2,
	LBP: 2,
	LKR: 2,
	LRD: 2,
	LSL: 2,
	LTL: 2,
	LVL: 2,
	LYD: 2,
	MAD: 2,
	MDL: 2,
	MGA: 2,
	MKD: 2,
	MMK: 2,
	MNT: 2,
	MOP: 2,
	MRO: 2,
	MRU: 2,
	MUR: 2,
	MVR: 2,
	MWK: 2,
	MXN: 2,
	MYR: 2,
	MZN: 2,
	NAD: 2,
	NGN: 2,
	NIO: 2,
	NOK: 2,
	NPR: 2,
	NZD: 2,
	OMR: 2,
	PAB: 2,
	PEN: 2,
	PGK: 2,
	PHP: 2,
	PKR: 2,
	PLN: 2,
	PYG: 2,
	QAR: 2,
	RON: 2,
	RSD: 2,
	RUB: 2,
	RWF: 2,
	SAR: 2,
	SBD: 2,
	SCR: 2,
	SDG: 2,
	SEK: 2,
	SGD: 2,
	SHP: 2,
	SKK: 2,
	SLL: 2,
	SOS: 2,
	SRD: 2,
	SSP: 2,
	STD: 2,
	SVC: 2,
	SYP: 2,
	SZL: 2,
	THB: 2,
	TJS: 2,
	TMM: 2,
	TMT: 2,
	TND: 2,
	TOP: 2,
	TRY: 2,
	TTD: 2,
	TWD: 2,
	TZS: 2,
	UAH: 2,
	UGX: 2,
	USD: 2,
	UYU: 2,
	UZS: 2,
	VEF: 2,
	VES: 2,
	VND: 2,
	VUV: 2,
	WST: 2,
	XAF: 2,
	XCD: 2,
	XDR: 2,
	XOF: 2,
	YER: 2,
	ZAR: 2,
	ZMK: 2,
	ZMW: 2,
	ZWD: 2
}) satisfies Record<Currency, number>;

/**
 * Maximum number of decimal places for storing prices WITHOUT VAT.
 * This allows merchants to set precise base prices that result in round
 * numbers after VAT calculation (e.g., 4.6253 CHF → 5.00 CHF with 8.1% VAT).
 *
 * Display precision remains FRACTION_DIGITS_PER_CURRENCY (2 for most currencies).
 */
const STORAGE_FRACTION_DIGITS_PER_CURRENCY = Object.freeze({
	BTC: 8,
	SAT: 0,
	AED: 4,
	AFN: 4,
	ALL: 4,
	AMD: 4,
	ANG: 4,
	AOA: 4,
	ARS: 4,
	AUD: 4,
	AWG: 4,
	AZN: 4,
	BAM: 4,
	BBD: 4,
	BDT: 4,
	BGN: 4,
	BHD: 4,
	BIF: 4,
	BMD: 4,
	BND: 4,
	BOB: 4,
	BRL: 4,
	BSD: 4,
	BTN: 4,
	BWP: 4,
	BYN: 4,
	BYR: 4,
	BZD: 4,
	CAD: 4,
	CDF: 4,
	CHF: 4,
	CLF: 4,
	CLP: 4,
	CNY: 4,
	COP: 4,
	CRC: 4,
	CUC: 4,
	CUP: 4,
	CVE: 4,
	CZK: 4,
	DJF: 4,
	DKK: 4,
	DOP: 4,
	DZD: 4,
	EEK: 4,
	EGP: 4,
	ETB: 4,
	EUR: 4,
	FJD: 4,
	FKP: 4,
	GBP: 4,
	GEL: 4,
	GHS: 4,
	GIP: 4,
	GMD: 4,
	GNF: 4,
	GTQ: 4,
	GYD: 4,
	HKD: 4,
	HNL: 4,
	HRK: 4,
	HTG: 4,
	HUF: 4,
	IDR: 4,
	ILS: 4,
	INR: 4,
	IQD: 4,
	IRR: 4,
	ISK: 4,
	JMD: 4,
	JOD: 4,
	JPY: 4,
	KES: 4,
	KGS: 4,
	KHR: 4,
	KMF: 4,
	KPW: 4,
	KRW: 4,
	KWD: 4,
	KYD: 4,
	KZT: 4,
	LAK: 4,
	LBP: 4,
	LKR: 4,
	LRD: 4,
	LSL: 4,
	LTL: 4,
	LVL: 4,
	LYD: 4,
	MAD: 4,
	MDL: 4,
	MGA: 4,
	MKD: 4,
	MMK: 4,
	MNT: 4,
	MOP: 4,
	MRO: 4,
	MRU: 4,
	MUR: 4,
	MVR: 4,
	MWK: 4,
	MXN: 4,
	MYR: 4,
	MZN: 4,
	NAD: 4,
	NGN: 4,
	NIO: 4,
	NOK: 4,
	NPR: 4,
	NZD: 4,
	OMR: 4,
	PAB: 4,
	PEN: 4,
	PGK: 4,
	PHP: 4,
	PKR: 4,
	PLN: 4,
	PYG: 4,
	QAR: 4,
	RON: 4,
	RSD: 4,
	RUB: 4,
	RWF: 4,
	SAR: 4,
	SBD: 4,
	SCR: 4,
	SDG: 4,
	SEK: 4,
	SGD: 4,
	SHP: 4,
	SKK: 4,
	SLL: 4,
	SOS: 4,
	SRD: 4,
	SSP: 4,
	STD: 4,
	SVC: 4,
	SYP: 4,
	SZL: 4,
	THB: 4,
	TJS: 4,
	TMM: 4,
	TMT: 4,
	TND: 4,
	TOP: 4,
	TRY: 4,
	TTD: 4,
	TWD: 4,
	TZS: 4,
	UAH: 4,
	UGX: 4,
	USD: 4,
	UYU: 4,
	UZS: 4,
	VEF: 4,
	VES: 4,
	VND: 4,
	VUV: 4,
	WST: 4,
	XAF: 4,
	XCD: 4,
	XDR: 4,
	XOF: 4,
	YER: 4,
	ZAR: 4,
	ZMK: 4,
	ZMW: 4,
	ZWD: 4
}) satisfies Record<Currency, number>;

export const CURRENCY_UNIT = Object.freeze({
	BTC: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.BTC),
	SAT: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.SAT),
	AED: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.AED),
	AFN: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.AFN),
	ALL: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.ALL),
	AMD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.AMD),
	ANG: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.ANG),
	AOA: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.AOA),
	ARS: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.ARS),
	AUD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.AUD),
	AWG: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.AWG),
	AZN: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.AZN),
	BAM: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.BAM),
	BBD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.BBD),
	BDT: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.BDT),
	BGN: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.BGN),
	BHD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.BHD),
	BIF: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.BIF),
	BMD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.BMD),
	BND: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.BND),
	BOB: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.BOB),
	BRL: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.BRL),
	BSD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.BSD),
	BTN: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.BTN),
	BWP: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.BWP),
	BYN: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.BYN),
	BYR: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.BYR),
	BZD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.BZD),
	CAD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.CAD),
	CDF: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.CDF),
	CHF: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.CHF),
	CLF: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.CLF),
	CLP: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.CLP),
	CNY: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.CNY),
	COP: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.COP),
	CRC: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.CRC),
	CUC: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.CUC),
	CUP: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.CUP),
	CVE: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.CVE),
	CZK: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.CZK),
	DJF: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.DJF),
	DKK: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.DKK),
	DOP: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.DOP),
	DZD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.DZD),
	EEK: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.EEK),
	EGP: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.EGP),
	ETB: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.ETB),
	EUR: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.EUR),
	FJD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.FJD),
	FKP: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.FKP),
	GBP: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.GBP),
	GEL: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.GEL),
	GHS: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.GHS),
	GIP: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.GIP),
	GMD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.GMD),
	GNF: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.GNF),
	GTQ: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.GTQ),
	GYD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.GYD),
	HKD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.HKD),
	HNL: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.HNL),
	HRK: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.HRK),
	HTG: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.HTG),
	HUF: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.HUF),
	IDR: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.IDR),
	ILS: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.ILS),
	INR: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.INR),
	IQD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.IQD),
	IRR: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.IRR),
	ISK: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.ISK),
	JMD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.JMD),
	JOD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.JOD),
	JPY: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.JPY),
	KES: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.KES),
	KGS: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.KGS),
	KHR: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.KHR),
	KMF: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.KMF),
	KPW: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.KPW),
	KRW: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.KRW),
	KWD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.KWD),
	KYD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.KYD),
	KZT: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.KZT),
	LAK: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.LAK),
	LBP: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.LBP),
	LKR: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.LKR),
	LRD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.LRD),
	LSL: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.LSL),
	LTL: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.LTL),
	LVL: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.LVL),
	LYD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.LYD),
	MAD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.MAD),
	MDL: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.MDL),
	MGA: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.MGA),
	MKD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.MKD),
	MMK: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.MMK),
	MNT: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.MNT),
	MOP: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.MOP),
	MRO: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.MRO),
	MRU: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.MRU),
	MUR: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.MUR),
	MVR: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.MVR),
	MWK: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.MWK),
	MXN: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.MXN),
	MYR: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.MYR),
	MZN: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.MZN),
	NAD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.NAD),
	NGN: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.NGN),
	NIO: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.NIO),
	NOK: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.NOK),
	NPR: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.NPR),
	NZD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.NZD),
	OMR: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.OMR),
	PAB: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.PAB),
	PEN: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.PEN),
	PGK: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.PGK),
	PHP: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.PHP),
	PKR: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.PKR),
	PLN: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.PLN),
	PYG: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.PYG),
	QAR: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.QAR),
	RON: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.RON),
	RSD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.RSD),
	RUB: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.RUB),
	RWF: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.RWF),
	SAR: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.SAR),
	SBD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.SBD),
	SCR: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.SCR),
	SDG: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.SDG),
	SEK: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.SEK),
	SGD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.SGD),
	SHP: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.SHP),
	SKK: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.SKK),
	SLL: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.SLL),
	SOS: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.SOS),
	SRD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.SRD),
	SSP: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.SSP),
	STD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.STD),
	SVC: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.SVC),
	SYP: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.SYP),
	SZL: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.SZL),
	THB: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.THB),
	TJS: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.TJS),
	TMM: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.TMM),
	TMT: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.TMT),
	TND: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.TND),
	TOP: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.TOP),
	TRY: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.TRY),
	TTD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.TTD),
	TWD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.TWD),
	TZS: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.TZS),
	UAH: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.UAH),
	UGX: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.UGX),
	USD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.USD),
	UYU: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.UYU),
	UZS: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.UZS),
	VEF: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.VEF),
	VES: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.VES),
	VND: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.VND),
	VUV: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.VUV),
	WST: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.WST),
	XAF: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.XAF),
	XCD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.XCD),
	XDR: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.XDR),
	XOF: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.XOF),
	YER: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.YER),
	ZAR: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.ZAR),
	ZMK: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.ZMK),
	ZMW: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.ZMW),
	ZWD: Math.pow(10, -FRACTION_DIGITS_PER_CURRENCY.ZWD)
}) satisfies Record<Currency, number>;

export function parsePriceAmount(amount: string, currency: Currency): number {
	// Use storage precision (4 decimals for fiat, 8 for BTC) instead of display precision
	const storageDecimals = STORAGE_FRACTION_DIGITS_PER_CURRENCY[currency];
	const priceAmount =
		(parseFloat(amount) * Math.pow(10, storageDecimals)) / Math.pow(10, storageDecimals);

	if (priceAmount > 0 && priceAmount < CURRENCY_UNIT[currency]) {
		throw error(400, `Price must be zero or greater than ${CURRENCY_UNIT[currency]} ${currency}`);
	}

	return priceAmount;
}

/**
 * Compute price for storage in database with full precision.
 * Uses STORAGE_FRACTION_DIGITS_PER_CURRENCY (4 decimals for fiat, 8 for BTC).
 *
 * Use this when saving prices to preserve full precision for VAT calculations.
 *
 * @example
 * computePriceForStorage(4.6253, 'CHF')
 * // Returns: { amount: 4.6253, currency: 'CHF', precision: 4 }
 */
export function computePriceForStorage(amount: string | number, currency: Currency): Price {
	const precision = STORAGE_FRACTION_DIGITS_PER_CURRENCY[currency];
	const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
	const rounded = Math.round(numAmount * Math.pow(10, precision)) / Math.pow(10, precision);

	return {
		amount: rounded,
		currency,
		precision
	};
}

/**
 * Compute price for display to users with standard precision.
 * Uses FRACTION_DIGITS_PER_CURRENCY (2 decimals for fiat, 8 for BTC).
 *
 * Use this for displaying prices in UI when precision field is not needed.
 *
 * @example
 * computePriceForDisplay(4.6253, 'CHF')
 * // Returns: { amount: 4.63, currency: 'CHF' }
 */
export function computePriceForDisplay(amount: string | number, currency: Currency): Price {
	const precision = FRACTION_DIGITS_PER_CURRENCY[currency];
	const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
	const rounded = Math.round(numAmount * Math.pow(10, precision)) / Math.pow(10, precision);

	return {
		amount: rounded,
		currency
	};
}

/**
 * Read price from database and normalize precision field for backward compatibility.
 *
 * Ensures precision is always defined by defaulting to FRACTION_DIGITS_PER_CURRENCY
 * (2 for fiat, 8 for BTC) for old records that don't have precision set.
 *
 * Use this when reading prices from the database to centralize backward compatibility logic.
 *
 * @example
 * // Old record from DB (no precision field):
 * readStoredPrice({ amount: 5.00, currency: 'CHF' })
 * // Returns: { amount: 5.00, currency: 'CHF', precision: 2 }
 *
 * @example
 * // New record from DB (has precision field):
 * readStoredPrice({ amount: 4.6253, currency: 'CHF', precision: 4 })
 * // Returns: { amount: 4.6253, currency: 'CHF', precision: 4 }
 */
export function readStoredPrice(storedPrice: Price): Price {
	return {
		...storedPrice,
		precision: storedPrice.precision ?? FRACTION_DIGITS_PER_CURRENCY[storedPrice.currency]
	};
}

/**
 * When computing VAT, delivery fees, etc, convert everything to SAT and only display
 * the result in the user's currency.
 */
export const UNDERLYING_CURRENCY = 'SAT';

// Crypto currencies (BTC, SAT)
const CRYPTO_CURRENCIES: Currency[] = ['BTC', 'SAT'];

/**
 * Sort currencies for product form:
 * priceReference → main → secondary → BTC/SAT → fiat A-Z
 */
export function sortCurrenciesForProduct(
	priceReference: Currency | undefined,
	main: Currency | undefined,
	secondary: Currency | null | undefined
): Currency[] {
	const priority: Currency[] = [];

	if (priceReference) {
		priority.push(priceReference);
	}
	if (main && !priority.includes(main)) {
		priority.push(main);
	}
	if (secondary && !priority.includes(secondary)) {
		priority.push(secondary);
	}

	// Add BTC/SAT if not already included
	for (const crypto of CRYPTO_CURRENCIES) {
		if (!priority.includes(crypto)) {
			priority.push(crypto);
		}
	}

	// Add remaining fiat currencies A-Z
	const remaining = CURRENCIES.filter(
		(c) => !priority.includes(c) && !CRYPTO_CURRENCIES.includes(c)
	);

	return [...priority, ...remaining];
}

/**
 * Sort currencies for /admin/config:
 * BTC/SAT → fiat A-Z
 */
export function sortCurrenciesForConfig(): Currency[] {
	const fiat = CURRENCIES.filter((c) => !CRYPTO_CURRENCIES.includes(c));
	return [...CRYPTO_CURRENCIES, ...fiat];
}

/**
 * Sort currencies for general use (widgets, leaderboard, challenge, etc.):
 * main → secondary → BTC/SAT → fiat A-Z
 */
export function sortCurrenciesDefault(
	main: Currency | undefined,
	secondary: Currency | null | undefined
): Currency[] {
	const priority: Currency[] = [];

	if (main) {
		priority.push(main);
	}
	if (secondary && !priority.includes(secondary)) {
		priority.push(secondary);
	}

	// Add BTC/SAT if not already included
	for (const crypto of CRYPTO_CURRENCIES) {
		if (!priority.includes(crypto)) {
			priority.push(crypto);
		}
	}

	// Add remaining fiat currencies A-Z
	const remaining = CURRENCIES.filter(
		(c) => !priority.includes(c) && !CRYPTO_CURRENCIES.includes(c)
	);

	return [...priority, ...remaining];
}
