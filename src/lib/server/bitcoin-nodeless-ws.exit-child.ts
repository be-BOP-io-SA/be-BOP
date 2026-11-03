// Child process of bitcoin-nodeless-ws.exit.test.ts, run by Node itself: watches three addresses on
// MEMPOOL_URL with the real WebSocket module, then does nothing, so only that module can keep it alive.
import { register } from 'node:module';
import type * as MempoolWebSocket from './bitcoin-nodeless-ws';

const libUrl = JSON.stringify(new URL('../', import.meta.url).href);
// The real bitcoin-nodeless opens a MongoDB connection on import, which would hold the process by itself.
const mempoolApiUrlStub = JSON.stringify(
	'data:text/javascript,' +
		encodeURIComponent('export const mempoolApiUrl = (path) => process.env.MEMPOOL_URL + path;')
);
const hooks = `
export async function resolve(specifier, context, next) {
	if (specifier === './bitcoin-nodeless') {
		return { url: ${mempoolApiUrlStub}, shortCircuit: true };
	}
	if (specifier.startsWith('$lib/')) {
		return { url: new URL(specifier.slice(5) + '.ts', ${libUrl}).href, shortCircuit: true };
	}
	return next(specifier, context);
}`;
register('data:text/javascript,' + encodeURIComponent(hooks));

const { watchMempoolAddresses, isAddressWatched } = (await import(
	new URL('./bitcoin-nodeless-ws.ts', import.meta.url).href
)) as typeof MempoolWebSocket;
const addresses = ['bc1qexit0', 'bc1qexit1', 'bc1qexit2'];
watchMempoolAddresses(addresses, { onActivity() {}, onBlock() {} });

function reportWhenWatching() {
	if (addresses.every(isAddressWatched)) {
		console.log('watching');
	} else {
		setTimeout(reportWhenWatching, 50);
	}
}
reportWhenWatching();
