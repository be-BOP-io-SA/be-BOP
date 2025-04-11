import { isIPv4 } from 'node:net';
import { building } from '$app/environment';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { rootDir } from './root-dir';
import ipModule from 'ip';
import { isAlpha2CountryCode, type CountryAlpha2 } from '$lib/types/Country';

const ipv4s: { start: bigint; end: bigint; country: string }[] = [];
const ipv6s: { start: bigint; end: bigint; country: string }[] = [];

if (!building) {
	{
		const ipv4csv = readFileSync(join(rootDir, 'assets/IP2LOCATION-LITE-DB1.CSV'), 'utf-8');

		console.log('Loading IPv4 database...');
		for (const line of ipv4csv.split('\n')) {
			const [start, end, country] = line.replaceAll('"', '').split(',');

			if (!start || !end || !country) {
				continue;
			}

			ipv4s.push({
				start: BigInt(start),
				end: BigInt(end),
				country
			});
		}
	}

	{
		console.log('Loading IPv6 database...');
		const ipv6csv = readFileSync(join(rootDir, 'assets/IP2LOCATION-LITE-DB1.IPV6.CSV'), 'utf-8');
		for (const line of ipv6csv.split('\n')) {
			const [start, end, country] = line.replaceAll('"', '').split(',');

			if (!start || !end || !country) {
				continue;
			}

			ipv6s.push({
				start: BigInt(start),
				end: BigInt(end),
				country
			});
		}
	}

	console.log('Done loading IP databases.');
}

function ipToInt(ip: string): { type: 'v4' | 'v6'; value: number | bigint } {
	if (isIPv4(ip)) {
		return {
			type: 'v4',
			value: BigInt(
				'0x' +
					ip
						.split('.')
						.map((group) => parseInt(group).toString(16).padStart(2, '0'))
						.join('')
			)
		};
	}
	return {
		type: 'v6',
		value: BigInt(
			'0x' +
				Array.from(ipModule.toBuffer(ip))
					.map((i) => i.toString(16).padStart(2, '0'))
					.join('')
		)
	};
}

const cache = new Map<string, CountryAlpha2 | undefined>();

export function countryFromIp(ip: string): CountryAlpha2 | undefined {
	if (ip === '::1' || ip === '127.0.0.1') {
		return 'FR';
	}
	const cached = cache.get(ip);
	if (cached) {
		// This moves the entry to the end of the Map, making it the most recently used
		cache.delete(ip);
		cache.set(ip, cached);

		return cached;
	}

	const ipInt = ipToInt(ip);

	const array = ipInt.type === 'v4' ? ipv4s : ipv6s;
	const value = ipInt.value;

	// Use binary search
	let left = 0;
	let right = array.length - 1;

	while (left <= right) {
		const mid = Math.floor((left + right) / 2);

		if (value >= array[mid].start && value <= array[mid].end) {
			const tmp = array[mid].country;
			const result = isAlpha2CountryCode(tmp) ? tmp : undefined;
			cache.set(ip, result);
			if (cache.size > 10_000) {
				// This deletes the oldest entry
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				cache.delete(cache.keys().next().value!);
			}

			return result;
		}

		if (value < array[mid].start) {
			right = mid - 1;
		} else {
			left = mid + 1;
		}
	}

	cache.set(ip, undefined);
}
