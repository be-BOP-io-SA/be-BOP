import { collections } from '../database';
import { differenceInMinutes } from 'date-fns';
import { setTimeout } from 'node:timers/promises';
import { processClosed } from '../process';
import { Lock } from '../lock';
import { runtimeConfig } from '../runtime-config';
import { typedKeys } from '$lib/utils/typedKeys';

const lock = new Lock('currency');

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

			const resp = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=BTC', {
				...{ autoSelectFamily: true }
			} as unknown as RequestInit);

			if (!resp.ok) {
				throw new Error(`Coinbase API returned ${resp.status}`);
			}

			const json: { data: { rates: Record<string, string> }; currency: string } = await resp.json();
			const rates = json.data.rates;

			const currentExchangeRates = runtimeConfig.exchangeRate;

			for (const currency of typedKeys(currentExchangeRates)) {
				if (currency in rates) {
					const number = Math.floor(+rates[currency]);
					if (!isNaN(number)) {
						currentExchangeRates[currency] = number;
					}
				}
			}

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
		} catch (err) {
			console.error(err);
		}

		await setTimeout(5_000);
	}
}

maintainExchangeRate();
