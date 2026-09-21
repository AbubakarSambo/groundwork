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
export const THE_LEAD_ONLY_ASKS = ['TEAM_UPDATES', 'DISCOVERY']

export function countsInRound(
  p: { managingOnly?: boolean | null },
  sessionNumber: number | null | undefined,
  scenario: string | null | undefined,
): boolean {
  if (!p.managingOnly) return true
  if (THE_LEAD_ONLY_ASKS.includes(scenario ?? '')) return false
  return (sessionNumber ?? 1) <= 1
}

export function whoIsInRound<T extends { managingOnly?: boolean | null }>(
  participants: T[],
  sessionNumber: number | null | undefined,
  scenario: string | null | undefined,
): T[] {
  return (participants ?? []).filter((p) => countsInRound(p, sessionNumber, scenario))
}
