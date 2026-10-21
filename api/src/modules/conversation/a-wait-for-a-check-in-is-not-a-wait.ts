/**
 * A WAIT FOR SOMEBODY'S CHECK-IN IS NOT A WAIT ON THEIR WORK (the final real-model check, 21 October 2026, item 1).
 *
 * On Tuesday 13 October Grace said "I'm waiting for Kevin, Mercy, Joseph, and Peter to submit their check-ins so I can see their
 * deals in progress and what they've sold." The record kept it as a wait on each of them for "check-ins". So Mercy's and Joseph's
 * next check-in opened with "Grace is waiting on you for check-ins, due today", Kevin's own report said "Grace Achieng has been
 * waiting on you for check-ins since 13 October. Either do it, or give a date you can do it by.", and Grace's weekly letter said
 * "You say the work is waiting on Peter for check-ins." Their check-in is the thing Groundwork itself asks for and counts. Somebody
 * who has not checked in yet is shown as not checked in, never as holding up a colleague's work.
 *
 * THE RULE. A wait whose thing is the other person's check-in (or their update, answers or submission to it), on a person in this
 * check-in, is never recorded. One that was recorded before is removed when anybody on the check-in checks in next. It is removed,
 * not cleared: a cleared wait is read as "no longer waiting", and nobody was ever waiting on their work.
 */
import { DependencyStatus, PrismaClient } from '@prisma/client';

const THE_CHECK_IN = /^(?:(?:the|their|his|her|its|my|our|your|each|everyone'?s|everybody'?s|today'?s)\s+)*(?:(?:daily|weekly|own|team'?s?)\s+)*(?:check[\s-]?ins?|checkins?|updates?|answers?|submissions?|reports?)(?:\s+(?:for|on|in|to)\s+(?:the\s+)?(?:check[\s-]?in|sales team|team)[\w\s,]*)?$/i;
const SAYS_CHECK_IN = /\bcheck[\s-]?ins?\b|\bcheckins?\b/i;

const clean = (t: string) => String(t ?? '').trim().replace(/[.!?]+$/, '').replace(/\s+/g, ' ');

/**
 * Do these words name only people in this check-in ("Kevin, Mercy, Joseph, and Peter", "the reps" is not)? Each piece has to be
 * one of their first or full names.
 */
export function aLabelNamesOnlyPeopleHere(label: string | null | undefined, names: string[][]): boolean {
  const pieces = clean(label ?? '').toLowerCase().split(/\s*(?:,|\band\b|&|\/)\s*/).map((p) => p.trim()).filter(Boolean);
  if (!pieces.length) return false;
  const known = new Set<string>();
  for (const n of names) {
    const [first, ...rest] = n.filter(Boolean).map((x) => x.toLowerCase());
    if (first) known.add(first);
    if (first && rest.length) known.add([first, ...rest].join(' '));
  }
  return pieces.every((p) => known.has(p));
}

/**
 * Is this wait only a wait for the other person's check-in? The thing has to be their check-in (or their update, answers or
 * submission), and the one waited on has to be somebody in this check-in: a person matched here, or a label made only of their names.
 * "their updates" is read as their check-in only when it is people in this check-in; "check-ins" is read so on anybody here.
 */
export function aWaitForTheirCheckIn(
  wait: { what: string; onParticipantId?: string | null; onLabel?: string | null },
  namesHere: string[][] = [],
): boolean {
  const what = clean(wait.what);
  if (!what) return false;
  const onSomebodyHere = !!wait.onParticipantId || aLabelNamesOnlyPeopleHere(wait.onLabel, namesHere);
  if (!onSomebodyHere) return false;
  if (THE_CHECK_IN.test(what)) return true;
  /* "them to submit their check-ins", "Kevin's check-in": the words are about the check-in and nothing else they hand over. */
  return SAYS_CHECK_IN.test(what) && !/\b(?:quote|price|pricing|order|proposal|draft|document|slip|payment|sample|list|figures?|numbers?)\b/i.test(what);
}

/**
 * Removes every open wait on this check-in that is only a wait for somebody's check-in. Run after each check-in's waits are read, so
 * a wait recorded before this rule is gone the next time anybody checks in. Returns how many were removed.
 */
export async function removeTheWaitsForACheckIn(prisma: PrismaClient | any, groundId: string): Promise<number> {
  const people = await prisma.groundParticipant.findMany({
    where: { groundId },
    select: { id: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } },
  });
  const names: string[][] = people.map((p: any) => [p.user?.firstName ?? p.nameGiven ?? '', p.user?.lastName ?? ''].filter(Boolean));
  const open = await prisma.groundDependency.findMany({
    where: { groundId, status: { in: [DependencyStatus.WAITING, DependencyStatus.BLOCKING] } },
    select: { id: true, what: true, onParticipantId: true, onLabel: true },
  });
  const ids = open.filter((d: any) => aWaitForTheirCheckIn(d, names)).map((d: any) => d.id);
  if (!ids.length) return 0;
  await prisma.blockerTrace?.deleteMany?.({ where: { anchorDependencyId: { in: ids } } });
  await prisma.groundDependency.deleteMany({ where: { id: { in: ids } } });
  return ids.length;
}
