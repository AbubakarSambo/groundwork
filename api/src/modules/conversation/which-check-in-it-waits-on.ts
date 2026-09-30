/**
 * WHICH OTHER CHECK-IN A HANDOFF WAITS ON (request 18, D3), OR NONE.
 *
 * A wrong link would show one team's request on another team's board, so this answers only when it is
 * certain, and certain is decided here, in code, on names, never by the model:
 *   - only check-ins of the same organisation, still open, and never the handoff's own check-in;
 *   - the words the person said for the team ("Finance") must all be in exactly one check-in's name
 *     ("Finance, Q3"), after the plain words every team name carries ("team", "review", "Q3") are set aside;
 *   - where two check-ins fit, or the handoff's own check-in fits as well, nothing is linked.
 * Null is the ordinary answer: most handoffs wait on somebody in the same check-in or outside the company.
 */
export interface ACheckInToWaitOn {
  id: string;
  organizationId: string;
  label: string | null;
}

/** Words that say a team and not which one. */
const PLAIN = new Set([
  'the', 'a', 'an', 'of', 'and', 'for', 'to', 'in', 'on', 'our', 'their', 'your', 'my', 'team', 'teams', 'group', 'department', 'dept',
  'check', 'checkin', 'review', 'session', 'weekly', 'daily', 'monthly', 'quarterly', 'first', 'days', 'day', 'week', 'month',
  'year', 'plan', 'planning', 'people', 'folks', 'lot', 'guys', 'side', 'office',
]);

const words = (t: string): string[] =>
  t.toLowerCase().replace(/[’']s\b/g, '').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
    .filter((w) => w.length > 1 && !PLAIN.has(w) && !/^q[1-4]$/.test(w) && !/^\d+$/.test(w));

export function theCheckInItWaitsOn(
  saidTeam: string | null | undefined,
  here: { id: string; organizationId: string },
  checkIns: ACheckInToWaitOn[],
): string | null {
  const said = words(saidTeam ?? '');
  if (said.length === 0) return null;
  const fits = checkIns
    .filter((g) => g.organizationId === here.organizationId)
    .filter((g) => {
      const label = new Set(words(g.label ?? ''));
      return said.every((w) => label.has(w));
    });
  /* Exactly one fit, and it is not this check-in. Two fits, or this one among them, is not certain. */
  if (fits.length !== 1 || fits[0].id === here.id) return null;
  return fits[0].id;
}
