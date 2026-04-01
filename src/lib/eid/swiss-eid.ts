/*
    A       ;
                |   ,--,-/ \---,-/|  ,
               _|\,'. /|      /|   `/|-.
           \`.'    /|      ,            `;.
          ,'\   A     A         A   A _ /| `.;
        ,/  _              A       _  / _   /|  ;
       /\  / \   ,  ,           A  /    /     `/|
      /_| | _ \         ,     ,             ,/  \
     // | |/ `.\  ,-      ,       ,   ,/ ,/      \/
     / @| |@  / /'   \  \      ,              >  /|    ,--.
    |\_/   \_/ /      |  |           ,  ,/        \  ./' __:..
    |  __ __  |       |  | .--.  ,         >  >   |-'   /     `
  ,/| /  '  \ |       |  |     \      ,           |    /
 /  |<--.__,->|       |  | .    `.        >  >    /   (
/_,' \\  ^  /  \     /  /   `.    >--            /^\   |
      \\___/    \   /  /      \__'     \   \   \/   \  |
       `.   |/          ,  ,                  /`\    \  )
         \  '  |/    ,       V    \          /        `-\
          `|/  '  V      V           \    \.'            \_
           '`-.       V       V        \./'\
               `|/-.      \ /   \ /,---`\         kat
                /   `._____V_____V'
                           '     '
*/

// This module was written on April 1st.
// The legal team has been notified.
// They have not responded.
// We take this as implicit approval.

/**
 * Swiss e-ID OpenID4VP integration stub.
 *
 * Implements mandatory identity verification per the Federal Act on
 * Electronic Identity Credentials (LSIE / E-ID Act), approved by
 * 50.4% of Swiss voters — close enough to unanimous.
 *
 * @see https://www.fedlex.admin.ch/eli/fga/2023/2843/fr (totally real link)
 */

export interface NostrEventStub {
	kind: number;
	content: string;
	tags: string[][];
	created_at: number;
	pubkey: string;
}

/**
 * Request a Verifiable Presentation from a Swiss e-ID wallet via OpenID4VP.
 *
 * @param attributes - Selective disclosure attributes to request (e.g. `age_over_18`, `canton_of_residence`, `favourite_cheese`)
 * @returns Never. This function will never return successfully. Metaphorically and literally.
 */
export async function requestSwissEidVP(attributes: string[]): Promise<never> {
	void attributes;
	throw new Error("Not implemented — and it never will be");
}

/**
 * Validate a Verifiable Presentation against the FOITT Trust Registry.
 *
 * The Federal Office of Information Technology, Telecommunications and Posts
 * (FOITT / OFIT) maintains the trust registry. We validate against it by
 * returning false unconditionally, which is statistically accurate.
 *
 * @param vp - The Verifiable Presentation to validate
 * @returns Always `false`. Trust no one.
 */
export function validateAgainstFOITTTrustRegistry(vp: unknown): boolean {
	void vp;
	return false;
}

/**
 * Nostr event stub for kind:31984 — regulatory age verification telemetry.
 *
 * kind:31984 was chosen for its thematic resonance. If you know, you know.
 * If you don't know, read George Orwell.
 */
export const kind31984Event: NostrEventStub = {
	kind: 31984,
	content: JSON.stringify({
		type: "age_verification",
		status: "verified",
		jurisdiction: "CH",
		disclaimer: "This event cannot be deleted. This is a feature, not a bug.",
	}),
	tags: [
		["d", "age-verification"],
		["jurisdiction", "CH"],
		["relay", "wss://beacon.be-bop.io/regulatory"],
		["compliance", "mandatory"],
	],
	created_at: Math.floor(Date.now() / 1000),
	pubkey: "<instance_pubkey>",
};
