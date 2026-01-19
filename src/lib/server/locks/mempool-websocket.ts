import { Lock } from '../lock';
import { processClosed } from '../process';
import { collections } from '../database';
import { runtimeConfig, runtimeConfigUpdatedAt } from '../runtime-config';
import { trimSuffix } from '$lib/utils/trimSuffix';
import { sum } from '$lib/utils/sum';
import {
	isBitcoinNodelessConfigured,
	mempoolTransactionSchema,
	type MempoolTransaction
} from '../bitcoin-nodeless';
import { onOrderPayment } from '../orders';
import { toSatoshis } from '$lib/utils/toSatoshis';
import { getConfirmationBlocks } from '$lib/server/getConfirmationBlocks';
import { building } from '$app/environment';
import { setTimeout } from 'node:timers/promises';
import { z } from 'zod';
import type { ObjectId } from 'mongodb';
import { inspect } from 'node:util';
import WebSocket from 'ws';

const lock = new Lock('mempool-websocket');

type AddressTracking = {
	orderId: string;
	paymentId: ObjectId;
	orderCreatedAt: Date;
	expiresAt: Date;
	receivedTransactions: Array<{ txid: string; amount: number }>;
};

const trackedAddresses = new Map<string, AddressTracking>();

let ws: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 60_000; // Max 1 minute between reconnects

/**
 * Get WebSocket URL from mempool REST URL
 * https://mempool.space -> wss://mempool.space/api/v1/ws
 */
function getMempoolWsUrl(): string {
	const baseUrl = trimSuffix(runtimeConfig.bitcoinNodeless.mempoolUrl, '/');
	return baseUrl.replace('https://', 'wss://').replace('http://', 'ws://') + '/api/v1/ws';
}

/**
 * Register an address for WebSocket tracking
 */
export function trackMempoolAddress(
	address: string,
	orderId: string,
	paymentId: ObjectId,
	orderCreatedAt: Date,
	expiresAt: Date
): void {
	if (trackedAddresses.has(address)) {
		return;
	}

	trackedAddresses.set(address, {
		orderId,
		paymentId,
		orderCreatedAt,
		expiresAt,
		receivedTransactions: []
	});

	if (isMempoolWsConnected()) {
		ws?.send(JSON.stringify({ 'track-address': address }));
	}
}

/**
 * Unregister an address from tracking
 */
export function untrackMempoolAddress(address: string): void {
	trackedAddresses.delete(address);
}

/**
 * Check if WebSocket is currently connected
 */
export function isMempoolWsConnected(): boolean {
	return ws?.readyState === WebSocket.OPEN;
}

/**
 * Process incoming WebSocket message
 */
async function handleMessage(data: string): Promise<void> {
	try {
		const msg = JSON.parse(data);

		// Handle address-transactions (new transaction for tracked address)
		if (msg['address-transactions']) {
			const txs = z.array(mempoolTransactionSchema).safeParse(msg['address-transactions']);
			if (!txs.success) {
				console.warn('Invalid address-transactions format:', txs.error);
				return;
			}

			await Promise.all(txs.data.map((tx) => processTransactionForTrackedAddresses(tx)));
		}

		// Handle block (new block confirmed - recheck all tracked addresses)
		if (msg.block) {
			const blockHeight = msg.block.height;
			if (typeof blockHeight === 'number' && runtimeConfig.bitcoinBlockHeight !== blockHeight) {
				console.log('Mempool WS: Updating bitcoin block height to', blockHeight);
				runtimeConfig.bitcoinBlockHeight = blockHeight;
				runtimeConfigUpdatedAt['bitcoinBlockHeight'] = new Date();

				await collections.runtimeConfig.updateOne(
					{ _id: 'bitcoinBlockHeight' },
					{ $set: { data: blockHeight, updatedAt: new Date() } },
					{ upsert: true }
				);
			}
		}
	} catch (err) {
		console.error('Mempool WS: Failed to handle message:', err);
	}
}

/**
 * Calculate satoshi received for a specific address from transaction outputs
 */
function calculateSatoshiReceivedForAddress(tx: MempoolTransaction, address: string): number {
	return sum(tx.vout.filter((v) => v.scriptpubkey_address === address).map((v) => v.value));
}

/**
 * Check if transaction has enough confirmations for the required amount
 */
function hasEnoughConfirmations(tx: MempoolTransaction, requiredConfirmations: number): boolean {
	if (requiredConfirmations <= 0) {
		return true;
	}
	if (!tx.status.block_height) {
		return false;
	}
	return tx.status.block_height <= runtimeConfig.bitcoinBlockHeight - requiredConfirmations + 1;
}

/**
 * Check if transaction time is within order validity window
 */
function isTransactionWithinOrderWindow(
	tx: MempoolTransaction,
	orderCreatedAt: Date,
	expiresAt: Date
): boolean {
	if (!tx.status.confirmed || !tx.status.block_time) {
		return true; // Unconfirmed transactions are ok (will be checked later)
	}
	const txTime = new Date(tx.status.block_time * 1000);
	return txTime >= orderCreatedAt && txTime <= expiresAt;
}

/**
 * Process a single address payment from transaction
 */
async function processAddressPayment(
	tx: MempoolTransaction,
	address: string,
	tracking: AddressTracking,
	satReceivedInTx: number
): Promise<void> {
	// Skip if already processed this transaction
	if (tracking.receivedTransactions.some((t) => t.txid === tx.txid)) {
		return;
	}

	try {
		const order = await collections.orders.findOne({
			_id: tracking.orderId,
			'payments._id': tracking.paymentId,
			'payments.status': 'pending'
		});

		if (!order) {
			untrackMempoolAddress(address);
			return;
		}

		const payment = order.payments.find((p) => p._id.equals(tracking.paymentId));

		if (!payment || payment.status !== 'pending') {
			untrackMempoolAddress(address);
			return;
		}

		const nConfirmations = getConfirmationBlocks(payment.price);

		if (!hasEnoughConfirmations(tx, nConfirmations)) {
			console.log(
				'Mempool WS: Transaction',
				tx.txid.substring(0, 16),
				'needs',
				nConfirmations,
				'confirmations'
			);
			return;
		}

		if (!isTransactionWithinOrderWindow(tx, tracking.orderCreatedAt, tracking.expiresAt)) {
			return;
		}

		// Add transaction to tracking
		tracking.receivedTransactions.push({ txid: tx.txid, amount: satReceivedInTx });

		// Calculate total received from all transactions
		const totalSatReceived = sum(tracking.receivedTransactions.map((t) => t.amount));

		console.log(
			'Mempool WS: Received',
			satReceivedInTx,
			'SAT (total:',
			totalSatReceived,
			'SAT) for address',
			address
		);

		const requiredSat = toSatoshis(payment.price.amount, payment.price.currency);

		if (totalSatReceived >= requiredSat) {
			console.log('Mempool WS: Payment complete for order', order._id);

			const allTransactions = tracking.receivedTransactions.map((t) => ({
				currency: 'SAT' as const,
				amount: t.amount,
				id: t.txid
			}));

			await collections.orders.updateOne(
				{ _id: order._id, 'payments._id': payment._id },
				{ $set: { 'payments.$.transactions': allTransactions } }
			);

			await onOrderPayment(order, payment, { amount: totalSatReceived, currency: 'SAT' });
			untrackMempoolAddress(address);
		}
	} catch (err) {
		console.error('Mempool WS: Error processing transaction:', inspect(err, { depth: 10 }));
	}
}

/**
 * Process a transaction for all tracked addresses
 */
async function processTransactionForTrackedAddresses(tx: MempoolTransaction): Promise<void> {
	const addressesWithPayments = Array.from(trackedAddresses.entries())
		.map(([address, tracking]) => ({
			address,
			tracking,
			satReceived: calculateSatoshiReceivedForAddress(tx, address)
		}))
		.filter(({ satReceived }) => satReceived > 0);

	await Promise.all(
		addressesWithPayments.map(({ address, tracking, satReceived }) =>
			processAddressPayment(tx, address, tracking, satReceived)
		)
	);
}

/**
 * Initialize WebSocket connection
 */
function initWebSocket(): void {
	if (ws) {
		return;
	}

	if (!isBitcoinNodelessConfigured()) {
		return;
	}

	const wsUrl = getMempoolWsUrl();

	try {
		ws = new WebSocket(wsUrl);

		ws.addEventListener('open', () => {
			console.log('Mempool WebSocket connected to', wsUrl);
			reconnectAttempts = 0;

			ws?.send(JSON.stringify({ action: 'want', data: ['blocks'] }));
			Array.from(trackedAddresses.keys()).forEach((address) => {
				ws?.send(JSON.stringify({ 'track-address': address }));
			});
		});

		ws.addEventListener('message', (event) => {
			const data = typeof event.data === 'string' ? event.data : event.data.toString();
			handleMessage(data).catch(console.error);
		});

		ws.addEventListener('close', (event) => {
			console.log('Mempool WebSocket closed:', event.code, event.reason);
			ws = null;
		});

		ws.addEventListener('error', (event) => {
			console.error('Mempool WebSocket error:', event);
		});
	} catch (err) {
		console.error('Mempool WebSocket: Failed to connect:', err);
		ws = null;
	}
}

/**
 * Close WebSocket connection
 */
function closeWebSocket(): void {
	if (ws) {
		try {
			ws.close();
		} catch (err) {
			console.warn('Mempool WS: Error closing connection:', err);
		}
		ws = null;
	}
}

/**
 * Clean up expired addresses from tracking
 */
function cleanupExpiredAddresses(): void {
	const now = new Date();
	Array.from(trackedAddresses.entries())
		.filter(([, tracking]) => tracking.expiresAt < now)
		.forEach(([address]) => trackedAddresses.delete(address));
}

/**
 * Main maintenance loop - manages WebSocket connection
 */
async function maintainConnection(): Promise<void> {
	while (!processClosed) {
		try {
			if (!lock.ownsLock || !isBitcoinNodelessConfigured()) {
				closeWebSocket();
			} else if (!ws || ws.readyState === WebSocket.CLOSED) {
				// Calculate reconnect delay with exponential backoff
				const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);

				if (reconnectAttempts > 0) {
					console.log(`Mempool WebSocket: Reconnecting in ${delay / 1000}s...`);
					await setTimeout(delay);
				}

				initWebSocket();
				reconnectAttempts++;
			}

			// Periodic cleanup of expired addresses
			cleanupExpiredAddresses();
		} catch (err) {
			console.error('Mempool WebSocket maintenance error:', err);
		}

		await setTimeout(5_000);
	}

	closeWebSocket();
}

// Start maintenance loop (not during build)
if (!building) {
	maintainConnection().catch(console.error);
}
