import { isClinkConfigured, clinkStartPersistentListener } from '../clink';
import { refreshPromise } from '../runtime-config';

async function startClinkListener() {
	await refreshPromise;
	if (!isClinkConfigured()) return;

	try {
		await clinkStartPersistentListener();
		console.log('[CLINK] Persistent listener started on boot');
	} catch (err) {
		console.error(
			'[CLINK] Failed to start persistent listener on boot:',
			err instanceof Error ? err.message : err
		);
	}
}

startClinkListener();
