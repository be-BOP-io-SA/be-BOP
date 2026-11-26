/**
 * How full a Lightning channel is, from 0 to 100: the share of its capacity no longer free to
 * receive. Null for a channel that reports no capacity yet.
 */
export function channelFillPercent(channel: {
	capacitySat?: number;
	inboundLiquiditySat?: number;
}): number | null {
	if (!channel.capacitySat || channel.inboundLiquiditySat === undefined) {
		return null;
	}
	return ((channel.capacitySat - channel.inboundLiquiditySat) / channel.capacitySat) * 100;
}

/** Zero turns the warning off. */
export function isPastFillWarning(fillPercent: number, warningPercent: number): boolean {
	return warningPercent > 0 && fillPercent >= warningPercent;
}
