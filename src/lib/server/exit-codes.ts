/**
 * Exit codes that be-BOP emits to signal intent to a supervising orchestrator.
 * The orchestrator reads $EXIT_STATUS and acts accordingly.
 * Source of truth for the contract — see docs/exit-codes.md.
 */

export const EXIT_CLEAN_SHUTDOWN = 0;
export const EXIT_RESTART = 100;
export const EXIT_UPDATE_LATEST = 101;
const EXIT_ROLLBACK_BASE = 110;
export const ROLLBACK_MAX_STEP = 10;

export function rollbackExitCode(stepsBack: number): number {
	if (!Number.isInteger(stepsBack) || stepsBack < 1 || stepsBack > ROLLBACK_MAX_STEP) {
		throw new Error(
			`rollback step must be an integer between 1 and ${ROLLBACK_MAX_STEP}, got ${stepsBack}`
		);
	}
	return EXIT_ROLLBACK_BASE + stepsBack - 1;
}
