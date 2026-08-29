/**
 * WHETHER SOMEBODY IS STILL FINDING THEIR FEET, AND WHAT THAT SUPPRESSES.
 *
 * The spec asks for gates, and the reason it asks is one sentence buried in §11.1: detectors like
 * `no_checkin` must not fire against somebody still inside their onboarding window. That is the
 * load-bearing part. A product whose first act is to tell a new joiner they have failed to do
 * something is not one they will use, and the person it happens to has no way to know the finding
 * was about the calendar rather than about them.
 *
 * `no_checkin` currently uses time in role - a blunt substitute that says nothing about whether
 * anybody has actually shown them what to do. Gates are the real answer: the window is open while
 * required gates are outstanding, and it closes when they are done rather than when a fortnight has
 * passed.
 *
 * BUT TIME STILL BOUNDS IT. A gate nobody ever marks done would hold the window open forever, and
 * "onboarding" would become the permanent excuse for somebody nobody has looked at in a year. So
 * the window closes on whichever comes first: the gates clearing, or the backstop expiring.
 */
export const WINDOW_BACKSTOP_DAYS = 90;

export type GateStatus = { required: boolean; closed: boolean };

/**
 * Open while there is a required gate outstanding AND the backstop has not expired.
 *
 * Somebody with no track at all is NOT inside a window - no gates means nothing has been asked of
 * them, and treating an absent track as an open-ended exemption would let one unconfigured role
 * suppress every finding about everybody in it.
 */
export function stillOnboarding(
  gates: GateStatus[],
  startedInRole: Date | null,
  now: Date,
  backstopDays = WINDOW_BACKSTOP_DAYS,
): boolean {
  const outstanding = gates.filter((g) => g.required && !g.closed);
  if (!outstanding.length) return false;
  if (!startedInRole) return true;
  const days = (now.getTime() - startedInRole.getTime()) / 86_400_000;
  return days < backstopDays;
}

/**
 * What is left, in the order it was meant to be done.
 *
 * Returned as the gates themselves rather than a count, because the chat answers this question and
 * "you have 3 outstanding" is useless to somebody who wants to know which 3.
 */
export function whatIsLeft<T extends { required: boolean; closed: boolean; ordinal: number }>(gates: T[]): T[] {
  return gates.filter((g) => !g.closed).sort((a, b) => a.ordinal - b.ordinal);
}

export function sayWhatIsLeft(left: { name: string; required: boolean }[], roleName: string): string {
  if (!left.length) return `You are through everything ${roleName} asks for at the start.`;

  const required = left.filter((g) => g.required);
  const optional = left.filter((g) => !g.required);

  const parts = [`Still to do for ${roleName}:`];
  /* Required first and optional named as optional, because somebody working through a list treats
     everything on it as compulsory unless told otherwise, and then resents the whole list. */
  for (const g of required) parts.push(`- ${g.name}`);
  for (const g of optional) parts.push(`- ${g.name} (optional)`);
  return parts.join('\n');
}
