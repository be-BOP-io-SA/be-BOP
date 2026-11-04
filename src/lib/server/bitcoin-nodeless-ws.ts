import { z } from 'zod';
import { mempoolApiUrl } from './bitcoin-nodeless';
import { isWithin } from '$lib/utils/isWithin';
import { deepEquals } from '$lib/utils/deep-equals';

const MAX_SOCKETS = 5;
// mempool.space accepts 10 addresses per connection; a self-hosted mempool announces its own limit.
const DEFAULT_MAX_PER_CONNECTION = 10;
const MAX_RETRY_DELAY_MS = 60_000;
// A socket whose messages stopped within this time of opening counts as flapping, so its reconnect delay keeps growing.
const STABLE_OPEN_MS = 60_000;
const CONNECT_TIMEOUT_MS = 30_000;
const PING_AFTER_SILENCE_MS = 30_000;
// A half-open socket never fires close, so silence is the only sign it is dead.
const DEAD_AFTER_SILENCE_MS = 60_000;
// An order loop turn can outlast the ping window, so liveness and retries run on their own clock.
const LIVENESS_TICK_MS = 5_000;

export type MempoolEvents = {
	onActivity(address: string): void;
	onBlock(height: number): void;
};

type Slot = { addresses: string[]; retries: number } & (
	| { state: 'connecting'; socket: WebSocket; startedAt: number }
	| {
			state: 'open';
			socket: WebSocket;
			openedAt: number;
			lastMessageAt: number;
			pinged: boolean;
	  }
	| { state: 'waiting-retry'; failedAt: number }
);
type LiveSlot = Exclude<Slot, { state: 'waiting-retry' }>;

let endpoint = { url: '', maxPerConnection: DEFAULT_MAX_PER_CONNECTION };
let slots: Slot[] = [];
let wanted: string[] = [];
let events: MempoolEvents | undefined;
let livenessTimer: ReturnType<typeof setInterval> | undefined;
const warned = new Set<string>();

const block = z.object({ height: z.number().int() });

const mempoolMessage = z.object({
	block: block.optional(),
	blocks: z.array(block).optional(),
	'multi-address-transactions': z.record(z.unknown()).optional(),
	'track-addresses-error': z.string().optional()
});

function mempoolWsUrl(): string {
	return mempoolApiUrl('/api/v1/ws').replace(/^http/, 'ws');
}

export function watchMempoolAddresses(addresses: string[], handlers: MempoolEvents): void {
	events = handlers;
	wanted = [...new Set(addresses)];
	reconcile(Date.now());
}

export function isAddressWatched(address: string): boolean {
	return slots.some((slot) => slot.state === 'open' && slot.addresses.includes(address));
}

export function resetMempoolWebSocket() {
	if (!import.meta.env.VITEST) {
		throw new Error('resetMempoolWebSocket should only be used in tests');
	}
	closeAll();
	endpoint = { url: '', maxPerConnection: DEFAULT_MAX_PER_CONNECTION };
	wanted = [];
	events = undefined;
	warned.clear();
}

function reconcile(now: number): void {
	const url = mempoolWsUrl();
	if (endpoint.url !== url) {
		closeAll();
		endpoint = { url, maxPerConnection: DEFAULT_MAX_PER_CONNECTION };
	}
	if (!endpoint.maxPerConnection) {
		closeAll();
		return;
	}
	slots = slots.map((slot) => checkLiveness(slot, now));
	const assignments = assign(
		slots.map((slot) => slot.addresses),
		endpoint.maxPerConnection
	);
	const next: Slot[] = [];
	assignments.forEach((addresses, i) => {
		const slot = slots.at(i);
		if (!addresses.length) {
			if (slot) {
				closeSlot(slot);
			}
			return;
		}
		next.push(slot ? applyAddresses(slot, addresses, now) : connect(addresses, 0, now));
	});
	slots = next;
	syncLivenessTimer();
}

function syncLivenessTimer(): void {
	if (slots.length && !livenessTimer) {
		livenessTimer = setInterval(() => reconcile(Date.now()), LIVENESS_TICK_MS);
		// Open sockets hold the process anyway; once all are down awaiting a retry, the timer alone must not.
		livenessTimer.unref();
	} else if (!slots.length && livenessTimer) {
		clearInterval(livenessTimer);
		livenessTimer = undefined;
	}
}

/** Stable assignment, so only a socket whose list changed resubscribes. */
function assign(current: string[][], max: number): string[][] {
	const wantedSet = new Set(wanted);
	const taken = new Set<string>();
	const lists = current.map((addresses) => {
		const kept = addresses.filter((a) => wantedSet.has(a) && !taken.has(a)).slice(0, max);
		kept.forEach((a) => taken.add(a));
		return kept;
	});
	const unassigned = wanted.filter((a) => !taken.has(a));
	for (const list of lists) {
		list.push(...unassigned.splice(0, max - list.length));
	}
	while (unassigned.length && lists.length < MAX_SOCKETS) {
		lists.push(unassigned.splice(0, max));
	}
	return lists;
}

function checkLiveness(slot: Slot, now: number): Slot {
	switch (slot.state) {
		case 'connecting':
			return isWithin(CONNECT_TIMEOUT_MS, slot.startedAt, now) ? slot : failSlot(slot, now);
		case 'open':
			if (!isWithin(DEAD_AFTER_SILENCE_MS, slot.lastMessageAt, now)) {
				return failSlot(slot, now);
			}
			if (!slot.pinged && !isWithin(PING_AFTER_SILENCE_MS, slot.lastMessageAt, now)) {
				send(slot.socket, { action: 'ping' });
				return { ...slot, pinged: true };
			}
			return slot;
		case 'waiting-retry':
			return slot;
	}
}

function applyAddresses(slot: Slot, addresses: string[], now: number): Slot {
	switch (slot.state) {
		case 'waiting-retry':
			return isWithin(retryDelay(slot.retries), slot.failedAt, now)
				? { ...slot, addresses }
				: connect(addresses, slot.retries, now);
		case 'connecting':
			return { ...slot, addresses };
		case 'open':
			if (!deepEquals(slot.addresses, addresses)) {
				send(slot.socket, { 'track-addresses': addresses });
			}
			return { ...slot, addresses };
	}
}

function retryDelay(retries: number): number {
	return Math.min(1000 * 2 ** (retries - 1), MAX_RETRY_DELAY_MS);
}

function connect(addresses: string[], retries: number, now: number): Slot {
	let socket: WebSocket;
	try {
		socket = new WebSocket(endpoint.url);
	} catch (err) {
		console.error('Cannot open mempool WebSocket:', err instanceof Error ? err.message : err);
		return { addresses, retries: retries + 1, state: 'waiting-retry', failedAt: now };
	}
	socket.addEventListener('open', () => onOpen(socket));
	socket.addEventListener('message', (event) => onMessage(socket, event.data));
	socket.addEventListener('close', () => failSocket(socket));
	socket.addEventListener('error', () => failSocket(socket));
	return { addresses, retries, state: 'connecting', socket, startedAt: now };
}

function failSlot(slot: LiveSlot, now: number): Slot {
	slot.socket.close();
	const wasStable = slot.state === 'open' && slot.lastMessageAt - slot.openedAt >= STABLE_OPEN_MS;
	return {
		addresses: slot.addresses,
		retries: wasStable ? 1 : slot.retries + 1,
		state: 'waiting-retry',
		failedAt: now
	};
}

function slotIndexOf(socket: WebSocket): number {
	return slots.findIndex((slot) => slot.state !== 'waiting-retry' && slot.socket === socket);
}

function failSocket(socket: WebSocket): void {
	const index = slotIndexOf(socket);
	const slot = slots[index];
	if (slot && slot.state !== 'waiting-retry') {
		slots[index] = failSlot(slot, Date.now());
	}
}

/** Closes the sockets of a mempool URL changed since they opened, so they cannot report the old network. */
function followMempoolUrlChange(): boolean {
	if (endpoint.url === mempoolWsUrl()) {
		return false;
	}
	reconcile(Date.now());
	return true;
}

function onOpen(socket: WebSocket): void {
	if (followMempoolUrlChange()) {
		return;
	}
	const index = slotIndexOf(socket);
	const slot = slots[index];
	if (slot?.state !== 'connecting') {
		return;
	}
	send(socket, { action: 'want', data: ['blocks'] });
	send(socket, { 'track-addresses': slot.addresses });
	const now = Date.now();
	slots[index] = {
		addresses: slot.addresses,
		retries: slot.retries,
		state: 'open',
		socket,
		openedAt: now,
		lastMessageAt: now,
		pinged: false
	};
	// A transaction broadcast while this socket was down sent no message, so its addresses need a check.
	slot.addresses.forEach((address) => events?.onActivity(address));
}

function onMessage(socket: WebSocket, data: unknown): void {
	if (followMempoolUrlChange()) {
		return;
	}
	const index = slotIndexOf(socket);
	const slot = slots[index];
	if (slot?.state !== 'open') {
		return;
	}
	slots[index] = { ...slot, lastMessageAt: Date.now(), pinged: false };

	const message = parseMessage(data);
	if (!message) {
		warnOnce(
			'unreadable',
			'Ignoring unreadable mempool WebSocket message:',
			String(data).slice(0, 200)
		);
		return;
	}

	const trackError = message['track-addresses-error'];
	if (trackError !== undefined) {
		onTrackAddressesError(socket, trackError);
		return;
	}

	const heights = [...(message.blocks ?? []), ...(message.block ? [message.block] : [])].map(
		(b) => b.height
	);
	if (heights.length) {
		events?.onBlock(Math.max(...heights));
	}
	for (const address of Object.keys(message['multi-address-transactions'] ?? {})) {
		if (wanted.includes(address)) {
			events?.onActivity(address);
		}
	}
}

function parseMessage(data: unknown): z.infer<typeof mempoolMessage> | undefined {
	if (typeof data !== 'string') {
		return undefined;
	}
	try {
		const parsed = mempoolMessage.safeParse(JSON.parse(data));
		return parsed.success ? parsed.data : undefined;
	} catch {
		return undefined;
	}
}

function onTrackAddressesError(socket: WebSocket, error: string): void {
	const max = Number(/maximum of (\d+)/.exec(error)?.[1]);
	if (max === 0) {
		console.warn(
			'Mempool WebSocket does not track addresses on this server, polling over HTTP only'
		);
		endpoint.maxPerConnection = 0;
		reconcile(Date.now());
		return;
	}
	if (!(max >= 1)) {
		warnOnce('track-addresses-error', 'Mempool WebSocket refused address tracking:', error);
		failSocket(socket);
		return;
	}
	if (max >= endpoint.maxPerConnection) {
		// Answer to a list sent before the limit was lowered; the smaller list is already on its way.
		return;
	}
	endpoint.maxPerConnection = max;
	reconcile(Date.now());
}

function warnOnce(key: string, ...args: unknown[]): void {
	if (!warned.has(key)) {
		warned.add(key);
		console.warn(...args);
	}
}

function closeAll(): void {
	slots.forEach(closeSlot);
	slots = [];
	syncLivenessTimer();
}

function closeSlot(slot: Slot): void {
	if (slot.state !== 'waiting-retry') {
		slot.socket.close();
	}
}

function send(socket: WebSocket, message: unknown): void {
	socket.send(JSON.stringify(message));
}
