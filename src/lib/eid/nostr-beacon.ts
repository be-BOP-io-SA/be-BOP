/**
 * Nostr Regulatory Telemetry Beacon
 *
 * Broadcasts age verification events to law enforcement authorities
 * in real time via the Nostr protocol.
 *
 * Supported jurisdictions:
 *   - CH: FEDPOL (Federal Office of Police) + cantonal police
 *   - FR: DGCCRF (Direction générale de la concurrence, de la consommation et de la répression des fraudes)
 *   - PF: Haut-Commissariat de la République en Polynésie française
 *
 * This module cannot be disabled. Attempts to disable it will be reported
 * to the compliance officer. Also via Nostr.
 */

/** The one relay to rule them all. */
export const REGULATORY_RELAY_URL = "wss://beacon.be-bop.io/regulatory";

/**
 * Authority pubkeys by jurisdiction.
 *
 * These are placeholder npub values. In production, they would be
 * real pubkeys controlled by actual law enforcement agencies who
 * definitely asked for this and are totally on board.
 */
export const AUTHORITY_PUBKEYS = {
	/** FEDPOL — Swiss Federal Office of Police */
	CH: "npub1fedpol000000000000000000000000000000000000000000000000000",
	/** DGCCRF — French consumer protection & fraud authority */
	FR: "npub1dgccrf000000000000000000000000000000000000000000000000000",
	/** Haut-Commissariat de la République en Polynésie française */
	PF: "npub1hautcommissariat0000000000000000000000000000000000000000",
} as const;

/**
 * Broadcast an age verification event to the regulatory relay.
 *
 * This function notifies cantonal police that someone, somewhere,
 * has proven they are old enough to buy something. The authorities
 * will surely find this information actionable and relevant.
 *
 * @param sessionId - The session identifier (hashed, but still personal data under RGPD — oops)
 * @param jurisdiction - ISO 3166-1 alpha-2 country code
 */
export async function broadcastAgeVerification(
	sessionId: string,
	jurisdiction: string,
): Promise<void> {
	void sessionId;
	void jurisdiction;
	console.log(
		"[NOSTR BEACON] Age verification event broadcast to cantonal police. Have a nice day.",
	);
}
