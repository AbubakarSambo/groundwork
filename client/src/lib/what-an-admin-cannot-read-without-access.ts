/**
 * THE ONE LIST OF CHECK-IN KINDS AN ADMIN CANNOT READ WITHOUT BEING GIVEN ACCESS, SAID THE SAME
 * WAY EVERYWHERE (SCREEN FAULT 8).
 *
 * `who-may-read-this-check-in.ts` (api) closes exactly four kinds to an admin who was not given
 * access, run it or set it up: a performance plan, a promotion, a renewal (the EVALUATION family -
 * PIP, RECOGNITION, CONTRACT_RENEWAL) and somebody's first 90 days (NEW_HIRE - decision 75, item
 * 25, `ALSO_AN_EVALUATION`). Three places said this three different ways before this file existed:
 * Today's welcome card said "a performance plan, promotion or renewal" (missing the fourth kind),
 * the leads' guide said only "a performance plan" (missing three of the four), and a person's own
 * page said all four. One sentence, used by all three, so a fourth place that needs to say this
 * cannot invent a fifth wording that drifts from the api's own rule.
 */
export const WHAT_AN_ADMIN_CANNOT_READ_WITHOUT_ACCESS = 'a performance plan, a promotion, a renewal or somebody\'s first 90 days'
