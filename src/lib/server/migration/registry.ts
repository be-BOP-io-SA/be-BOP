import type { MigrationConnector } from './connector';
import { wordpressConnector } from './connectors/wordpress';

const connectors: Record<string, MigrationConnector> = {
	[wordpressConnector.id]: wordpressConnector as unknown as MigrationConnector
};

export function listConnectors(): MigrationConnector[] {
	return Object.values(connectors);
}

export function getConnector(id: string): MigrationConnector | undefined {
	return connectors[id];
}
