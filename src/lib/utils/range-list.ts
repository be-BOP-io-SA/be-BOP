/**
 * Written with Copilot
 */

type Range = [number, number];

export class RangeList {
	private ranges: Range[];

	constructor(initialRange: Range) {
		if (initialRange[0] > initialRange[1]) {
			throw new Error('Invalid range: start must be less than or equal to end.');
		}
		this.ranges = [initialRange];
	}

	remove(rangeToRemove: Range): void {
		if (rangeToRemove[0] > rangeToRemove[1]) {
			throw new Error('Invalid range: start must be less than or equal to end.');
		}

		const newRanges: Range[] = [];

		for (const [start, end] of this.ranges) {
			// If the current range is completely before or after the range to remove, keep it as is
			if (end < rangeToRemove[0] || start > rangeToRemove[1]) {
				newRanges.push([start, end]);
			} else {
				// If the current range overlaps with the range to remove, split it if necessary
				if (start < rangeToRemove[0]) {
					newRanges.push([start, Math.min(end, rangeToRemove[0])]);
				}
				if (end > rangeToRemove[1]) {
					newRanges.push([Math.max(start, rangeToRemove[1]), end]);
				}
			}
		}

		this.ranges = newRanges.filter((x) => x[0] < x[1]);
	}

	getRemainingRanges(): Range[] {
		return this.ranges;
	}
}
