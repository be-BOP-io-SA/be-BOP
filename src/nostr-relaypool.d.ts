/**
 * `nostr-relaypool` ships no declarations at all, and its `exports` map points straight at
 * the ESM bundle — so under SvelteKit 2's `moduleResolution: "bundler"` there is nothing for
 * TypeScript to read. Classic resolution used to infer from the JavaScript; bundler does not.
 *
 * Only the three members be-BOP calls are declared. Delete this file if the package ever
 * publishes types.
 */
declare module 'nostr-relaypool' {
	import type { Event, Filter } from 'nostr-tools';

	export class RelayPool {
		constructor(relays?: string[], options?: Record<string, unknown>);

		subscribe(
			filters: Filter[],
			relays: string[] | undefined,
			onEvent: (
				event: Event,
				isAfterEose: boolean,
				relayURL: string | undefined
			) => void | Promise<void>,
			maxDelayMs?: number,
			onEose?: (relayURL: string, minCreatedAt: number) => void,
			options?: Record<string, unknown>
		): () => void;

		publish(event: Event, relays: string[]): void;

		close(): Promise<void>;
	}
}
