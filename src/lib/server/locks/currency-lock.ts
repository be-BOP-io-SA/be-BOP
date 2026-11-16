import { collections } from '../database';
import { differenceInMinutes } from 'date-fns';
import { setTimeout } from 'node:timers/promises';
import { processClosed } from '../process';
import { Lock } from '../lock';
import { runtimeConfig } from '../runtime-config';
import { FIAT_CURRENCIES, SATOSHIS_PER_BTC } from '$lib/types/Currency';
import { z } from 'zod';

const lock = new Lock('currency');

const fiatCurrencySet = new Set<string>(FIAT_CURRENCIES);

const coinbaseResponseSchema = z.object({
	data: z.object({
		rates: z.record(z.string())
	})
});

/**
 * Fetch exchange rates from Coinbase API, filter to fiat currencies, and save to database.
 */
export async function fetchAndSaveExchangeRates(): Promise<void> {
	const resp = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=BTC', {
		...{ autoSelectFamily: true }
	} as unknown as RequestInit);

	if (!resp.ok) {
		throw new Error(`Coinbase API returned ${resp.status}`);
	}

	const json = coinbaseResponseSchema.parse(await resp.json());
	const rates = json.data.rates;

	const currentExchangeRates = runtimeConfig.exchangeRate;

	Object.entries(rates)
		.filter(([currency]) => fiatCurrencySet.has(currency))
		.forEach(([currency, rate]) => {
			const number = Math.floor(+rate);
			if (!isNaN(number) && number > 0) {
				currentExchangeRates[currency] = number;
			}
		});

	// A rate is "units for 1 BTC". ZEC is worth a few hundredths of a BTC, so unlike the fiat
	// rates it keeps its decimals: 74.38 floored to 74 would price every order 0.5% off.
	const zec = +rates.ZEC;
	if (!isNaN(zec) && zec > 0) {
		currentExchangeRates.ZEC = zec;
	}

	// SAT is fixed, never from API
	currentExchangeRates.SAT = SATOSHIS_PER_BTC;

	await collections.runtimeConfig.updateOne(
		{
			_id: 'exchangeRate'
		},
		{
			$set: {
				updatedAt: new Date(),
				data: runtimeConfig.exchangeRate
			},
			$setOnInsert: {
				createdAt: new Date()
			}
		},
		{
			upsert: true
		}
	);
}

async function maintainExchangeRate() {
	while (!processClosed) {
		if (!lock.ownsLock) {
			await setTimeout(5_000);
			continue;
		}

		// Other APIs:
		// https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur,chf,usd,zar
		// https://api.coingate.com/v2/rates/merchant/${currencyPair.replace('_', '/')}
		// But we use Coinbase because it supports the most currencies

		try {
			const doc = await collections.runtimeConfig.findOne({ _id: 'exchangeRate' });

			if (doc && differenceInMinutes(new Date(), doc.updatedAt) < 10) {
				await setTimeout(5_000);
				continue;
			}

			await fetchAndSaveExchangeRates();
		} catch (err) {
			console.error(err);
		}

		await setTimeout(5_000);
	}
}

maintainExchangeRate();
