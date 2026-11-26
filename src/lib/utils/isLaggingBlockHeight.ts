// A lagging backend or a reorg answers a few blocks back; a larger drop means another network or server.
export const MAX_BLOCK_HEIGHT_LAG = 6;

/** True for the same height too, so a repeated tip is not saved again; lowering to a lagging one would undercount confirmations. */
export function isLaggingBlockHeight(height: number, current: number): boolean {
	return height <= current && current - height <= MAX_BLOCK_HEIGHT_LAG;
}
