import { CheckInStatus, GroundStatus } from '@prisma/client';
import { isNotLetInYet } from '../grounds/who-an-admin-did-not-let-in';
import { A_GROUND_THE_JOBS_LEAVE_ALONE, A_GROUND_IS_HELD } from '../grounds/a-ground-that-has-ended';
import { theEngagementMoment } from './the-engagement-release-moment';
import { nameToCall } from './a-name-to-call-them';
import { everyRowAPageAtATime } from '../whatsapp/every-row-a-page-at-a-time';
import { whoOnACheckInIsAway } from '../suites/who-is-away';
import { aNumberInWords } from './a-number-in-words';
import { hasBeenToldOnce, nowToldOnce, isAlreadyHeld } from './a-message-sent-once';

/**
 * WHO HAS GONE QUIET, SAID TO THE LEAD AS AN INSIGHT AND NOT AS A REMINDER (decision 109; spec sections 15 to 17 and 36, journeys 7 and 9).
 *
 * Two kinds of quiet, told apart from rows that already exist: somebody who has NEVER answered, and somebody who answered a session before and has not
 * answered the latest. The lead is told how many of each, in which check-in, and, for the second kind only, who (an answer before is a fact she can
 * already read on her board). Nothing is said about why, and a check-in is never assumed to be too long: the message says it has not been changed.
 *
 * JOURNEY 9: when MORE THAN HALF of one check-in's people, and at least three, have not answered the latest session, that is one thing about the team and
 * is said once as that. JOURNEY 7: when it is spread, three or more people across the lead's check-ins, it is said once across them, a sentence each.
 * One message a lead a week, and never about a check-in made before the release, stalled, ended or held.
 */
export const QUIET_SENDER = 'sendWhoHasGoneQuiet';
const DAY = 86_400_000;
export const QUIET_AFTER_DAYS = 7;

export interface AQuietCheckIn {
  label: string;
  /** Set only when ONE person closed ALL of what was closed in the last two weeks here: a plain fact about them, and never a comparison (decision 109 item 3). */
  closedAllBy?: { name: string; count: number } | null;
  /** People who can answer, besides the lead. */
  ofHowMany: number;
  neverAnswered: number;
  /** First names of those who answered before and have not answered the latest. */
  stoppedAfterAnswering: string[];
}

const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
const listed = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
export const quietIn = (c: AQuietCheckIn) => c.neverAnswered + c.stoppedAfterAnswering.length;

/** "two have never answered, and Omar and Vera answered before and have not answered since". */
function theKinds(c: AQuietCheckIn): string {
  const parts: string[] = [];
  if (c.neverAnswered > 0) parts.push(`${aNumberInWords(c.neverAnswered)} ${c.neverAnswered === 1 ? 'has' : 'have'} never answered`);
  if (c.stoppedAfterAnswering.length > 0) parts.push(`${listed(c.stoppedAfterAnswering)} answered before and ${c.stoppedAfterAnswering.length === 1 ? 'has' : 'have'} not answered since`);
  return parts.join(', and ');
}

/** Journey 9: most of one check-in's people. */
export function mostOfTheTeamIs(c: AQuietCheckIn): boolean {
  return quietIn(c) >= 3 && quietIn(c) * 2 > c.ofHowMany;
}

export function theTeamWords(firstName: string | null | undefined, c: AQuietCheckIn) {
  const n = quietIn(c);
  return {
    subject: `${capital(aNumberInWords(n))} of ${aNumberInWords(c.ofHowMany)} people on "${c.label}" have not answered the latest check-in`,
    lines: [
      `Hello ${firstName?.trim() || 'there'}. ${capital(aNumberInWords(n))} of the ${aNumberInWords(c.ofHowMany)} people on "${c.label}" have not answered the latest check-in, which opened more than a week ago.`,
      `${capital(theKinds(c))}.`,
      'Most of the team has not answered, so this looks like something about the team rather than about each person. Groundwork has not changed or shortened the check-in.',
      'If you want to know what is in the way, asking one of them directly is the quickest way to find out.',
    ],
    linkLabel: 'See who has answered',
  };
}

/** Journey 7: spread over several check-ins, or fewer than most of one. */
export function theAcrossWords(firstName: string | null | undefined, cs: AQuietCheckIn[]) {
  const quiet = cs.filter((c) => quietIn(c) > 0);
  const total = quiet.reduce((n, c) => n + quietIn(c), 0);
  const one = quiet.length === 1 ? quiet[0] : null;
  /* A positive fact is said only for a check-in where one person did all of it, as a plain fact with their name, and on its own line. Otherwise it is left out. */
  const positives = cs.filter((c) => !!c.closedAllBy && c.closedAllBy.count > 0)
    .map((c) => `${one ? '' : `In "${c.label}", `}${one ? capital(aNumberInWords(c.closedAllBy!.count)) : aNumberInWords(c.closedAllBy!.count)} ${c.closedAllBy!.count === 1 ? 'thing people said they would do was' : 'things people said they would do were'} done, ${c.closedAllBy!.count === 1 ? 'by' : c.closedAllBy!.count === 2 ? 'both by' : 'all by'} ${c.closedAllBy!.name}.`);
  return {
    subject: one
      ? `${capital(aNumberInWords(total))} ${total === 1 ? 'person has' : 'people have'} not answered the latest check-in in "${one.label}"`
      : `${capital(aNumberInWords(total))} people have not answered the latest check-in across ${aNumberInWords(quiet.length)} of your check-ins`,
    lines: [
      one
        ? `Hello ${firstName?.trim() || 'there'}. ${capital(aNumberInWords(total))} of the ${aNumberInWords(one.ofHowMany)} people in "${one.label}" ${total === 1 ? 'has' : 'have'} not answered the latest check-in.`
        : `Hello ${firstName?.trim() || 'there'}. ${capital(aNumberInWords(total))} people have not answered the latest check-in, across ${aNumberInWords(quiet.length)} of your check-ins.`,
      /* One check-in is named once, in the subject and the first line, not again in every sentence. */
      ...quiet.map((c) => (one ? `${capital(theKinds(c))}.` : `In "${c.label}", ${theKinds(c)}.`)),
      ...positives,
      'Groundwork has not changed or shortened any of them. If you want to know what is in the way, asking one of them directly is the quickest way to find out.',
    ],
    linkLabel: one ? 'See who has answered' : 'See your check-ins',
  };
}

const TERMINAL: GroundStatus[] = [...A_GROUND_THE_JOBS_LEAVE_ALONE, ...A_GROUND_IS_HELD];

/** One check-in's quiet people, from its rows. Null when it has no latest session old enough, or began before the release. */
export function theQuietIn(rows: any[], label: string, leadUserId: string, now: Date, release: Date, away: ReadonlySet<string> = new Set()): AQuietCheckIn | null {
  if (!rows.length) return null;
  const latest = Math.max(...rows.map((r) => r.sessionNumber ?? 0));
  const latestRows = rows.filter((r) => (r.sessionNumber ?? 0) === latest);
  const opened = Math.min(...latestRows.map((r) => new Date(r.createdAt).getTime()));
  if (opened < release.getTime() || now.getTime() - opened < QUIET_AFTER_DAYS * DAY) return null;
  const counted = latestRows.filter((r) => !r.participant?.managingOnly && !isNotLetInYet(r.participant) && r.participant?.userId !== leadUserId && !away.has(r.participantId));
  if (!counted.length) return null;
  let never = 0;
  const stopped: string[] = [];
  for (const r of counted) {
    if (r.status === CheckInStatus.COMPLETED) continue;
    const before = rows.some((x) => x.participantId === r.participantId && (x.sessionNumber ?? 0) < latest && x.status === CheckInStatus.COMPLETED);
    if (before) stopped.push(nameToCall(r.participant));
    else never++;
  }
  return { label, ofHowMany: counted.length, neverAnswered: never, stoppedAfterAnswering: stopped.filter((n) => !!n) };
}

export async function sendWhoHasGoneQuiet(
  deps: { prisma: any; email: { sendWhoHasGoneQuiet: (to: string, subject: string, lines: string[], linkLabel: string, linkUrl: string) => Promise<'sent' | 'held' | 'suppressed' | unknown> }; frontendUrl: string },
  now: Date = new Date(),
): Promise<{ tried: number }> {
  const { prisma } = deps;
  let release: Date;
  try { release = await theEngagementMoment(prisma, now); } catch { return { tried: 0 }; }
  const grounds: any[] = await everyRowAPageAtATime((page: any) => prisma.ground.findMany({
    /* Gated by the check-in's own date, as this file says: nothing about a check-in made before the engagement messages began. */
    where: { status: { notIn: TERMINAL }, createdAt: { gte: release } },
    select: { id: true, label: true, initiatorId: true },
    orderBy: { id: 'asc' },
    ...page,
  }), 1000);
  const byLead = new Map<string, { id: string; label: string }[]>();
  for (const g of grounds) byLead.set(g.initiatorId, [...(byLead.get(g.initiatorId) ?? []), g]);
  const base = (deps.frontendUrl || '').replace(/\/$/, '');
  const week = `${now.getUTCFullYear()}-${Math.floor((now.getTime() - Date.UTC(now.getUTCFullYear(), 0, 1)) / (7 * DAY))}`;
  let tried = 0;
  for (const [leadId, theirs] of byLead) {
    try {
      const once = `gone-quiet:${leadId}:${week}`;
      if (await hasBeenToldOnce(prisma, once)) continue;
      const found: (AQuietCheckIn & { groundId: string })[] = [];
      for (const g of theirs) {
        const rows: any[] = await prisma.checkIn.findMany({
          where: { groundId: g.id },
          select: { participantId: true, sessionNumber: true, status: true, createdAt: true, participant: { select: { userId: true, managingOnly: true, nameGiven: true, user: { select: { firstName: true, lastName: true, email: true, awaitingOrgApproval: true } } } } },
        });
        /* Somebody on approved leave is not one who has gone quiet. */
        const away = await Promise.resolve(whoOnACheckInIsAway(prisma, g.id, now)).catch(() => new Map());
        const q = theQuietIn(rows, g.label, leadId, now, release, new Set([...(away as Map<string, unknown>).keys()]));
        if (q && quietIn(q) > 0) {
          const closed: any[] = await Promise.resolve(prisma.groundCommitment?.findMany?.({ where: { groundId: g.id, status: 'DONE', participantId: { not: null }, settledAt: { gte: new Date(now.getTime() - 14 * DAY) } }, select: { participantId: true } })).catch(() => []) ?? [];
          const by = new Map<string, number>();
          for (const c of Array.isArray(closed) ? closed : []) by.set(c.participantId, (by.get(c.participantId) ?? 0) + 1);
          const onlyOne = by.size === 1 ? [...by][0] : null;
          const who = onlyOne ? rows.find((r) => r.participantId === onlyOne[0])?.participant : null;
          const name = who ? (who.userId === leadId ? 'you' : nameToCall(who)) : null;
          found.push({ ...q, groundId: g.id, closedAllBy: name && onlyOne ? { name, count: onlyOne[1] } : null });
        }
      }
      const total = found.reduce((n, c) => n + quietIn(c), 0);
      if (total < 3) continue;
      const user = await prisma.user.findUnique({ where: { id: leadId }, select: { email: true, firstName: true, deletedAt: true, isActive: true } });
      if (!user?.email || user.deletedAt || user.isActive === false) continue;
      const mostOf = found.find(mostOfTheTeamIs);
      if (await isAlreadyHeld(prisma, QUIET_SENDER, user.email)) continue;
      const w = mostOf ? theTeamWords(user.firstName, mostOf) : theAcrossWords(user.firstName, found);
      const link = mostOf ? `${base}/grounds/${mostOf.groundId}/board` : `${base}/grounds`;
      const went = await deps.email.sendWhoHasGoneQuiet(user.email, w.subject, w.lines, w.linkLabel, link);
      await nowToldOnce(prisma, once, went, { sender: QUIET_SENDER, to: user.email });
      if (went !== 'suppressed') tried++;
    } catch {
      /* One lead's message that could not be put together never stops the others. */
    }
  }
  return { tried };
}
