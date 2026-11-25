/**
 * The back office a shop works in: the full one, or the PoS one, for a shop that only takes
 * payments on its terminals. Both run on the same engine; the PoS one shows fewer menu entries.
 */
export const BACK_OFFICE_MODES = ['full', 'pos'] as const;
export type BackOfficeMode = (typeof BACK_OFFICE_MODES)[number];
