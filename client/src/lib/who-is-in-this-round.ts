/**
 * WHO IS IN A ROUND, THE SAME ANSWER THE SERVER GIVES.
 *
 * Hafsah's own ground, 21 Sep 2026: she set it up saying she just sets the targets, which made her
 * managing-only. The server's rule (api: the-lead-who-only-asks.ts, isSessionReadyForReport) is that
 * a managing-only lead still gives session 1 and is waited on for it, and is not a party from
 * session 2. The page counted `!managingOnly` everywhere, so her header read "1 of 1 checked in"
 * beside a roster of two, the notice said the report needed a second person while two were on it,
 * and the session row read "1 of 1 answered · Released" without her. One rule, mirrored here.
 */
export const THE_LEAD_ONLY_ASKS = ['TEAM_UPDATES', 'DISCOVERY', 'HELP_TEAM_UNDERSTAND']

/**
 * DECISION 77: SOMEBODY NOT LET IN YET IS NOT COUNTED EITHER (docs/answers-from-engine.md, request
 * 101 (b), ~line 2205). "Rukia's 'Reports' rows read 'Session 1, 27 Sept / 4 of 6 checked in' and
 * 'Session 2, 30 Sept / 2 of 6 checked in'", beside the headline's own "4 of 5 people have
 * answered this round." - Faraji Odhiambo, held at the organisation's door, was still in this
 * function's denominator, while the server's own count already leaves him out. A person still
 * held at the door was never going to answer, the same reason a managing-only lead is left out
 * past session 1 - so `notLetInYet` is checked here first, before anything else.
 */
export function countsInRound(
  p: { managingOnly?: boolean | null; notLetInYet?: boolean | null },
  sessionNumber: number | null | undefined,
  scenario: string | null | undefined,
): boolean {
  if (p.notLetInYet) return false
  if (!p.managingOnly) return true
  if (THE_LEAD_ONLY_ASKS.includes(scenario ?? '')) return false
  return (sessionNumber ?? 1) <= 1
}

export function whoIsInRound<T extends { managingOnly?: boolean | null; notLetInYet?: boolean | null }>(
  participants: T[],
  sessionNumber: number | null | undefined,
  scenario: string | null | undefined,
): T[] {
  return (participants ?? []).filter((p) => countsInRound(p, sessionNumber, scenario))
}
