import { collections } from '$lib/server/database.js';
import type { OrderTab } from '$lib/types/OrderTab.js';
import { error } from '@sveltejs/kit';
import type { ChangeStream, ChangeStreamDocument } from 'mongodb';

export async function GET({ locals }) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const { readable, writable } = new TransformStream();
	let writer: WritableStreamDefaultWriter<unknown> | null = writable.getWriter();

	function cleanup() {
		writer?.close();
		writer = null;
		changeStream?.close().catch(console.error);
		changeStream = null;
	}

	let changeStream: ChangeStream<OrderTab, ChangeStreamDocument<OrderTab>> | null =
		collections.orderTabs.watch([]);

	changeStream
		.on('change', async () => {
			if (!writer) {
				return;
			}
			try {
				await writer?.ready;
				await writer?.write(`data: {}\n\n`);
			} catch {
				cleanup();
			}
		})
		.on('error', () => {
			cleanup();
		});

	return new Response(readable, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
}
