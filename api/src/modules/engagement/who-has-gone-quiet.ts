import { CheckInStatus, GroundStatus } from '@prisma/client';
import { isNotLetInYet } from '../grounds/who-an-admin-did-not-let-in';
import { A_GROUND_THE_JOBS_LEAVE_ALONE, A_GROUND_IS_HELD } from '../grounds/a-ground-that-has-ended';
import { theReleaseMoment } from '../grounds/the-release-moment';
import { theFirstNameOfAParticipant } from '../reports/a-title-is-not-a-first-name';
import { everyRowAPageAtATime } from '../whatsapp/every-row-a-page-at-a-time';
import { aNumberInWords } from './a-number-in-words';
import { hasBeenToldOnce, nowToldOnce } from './a-message-sent-once';

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
      'Because it is most of the team, this is one thing about the team and not several people to be reminded one at a time. Groundwork has not changed or shortened the check-in.',
      'If you want to know what is in the way, asking one of them directly is the quickest way to find out.',
    ],
    linkLabel: 'See who has answered',
  };
}

/** Journey 7: spread over several check-ins. */
export function theAcrossWords(firstName: string | null | undefined, cs: AQuietCheckIn[]) {
  const quiet = cs.filter((c) => quietIn(c) > 0);
  const total = quiet.reduce((n, c) => n + quietIn(c), 0);
  return {
    subject: `${capital(aNumberInWords(total))} people have stopped answering across ${aNumberInWords(quiet.length)} of your check-ins`,
    lines: [
      `Hello ${firstName?.trim() || 'there'}. ${capital(aNumberInWords(total))} people have not answered the latest check-in, across ${aNumberInWords(quiet.length)} of your check-ins.`,
      ...quiet.map((c) => `In "${c.label}", ${theKinds(c)}.`),
      'Groundwork has not changed or shortened any of them. If you want to know what is in the way, asking one of them directly is the quickest way to find out.',
    ],
    linkLabel: 'See your check-ins',
  };
}

const TERMINAL: GroundStatus[] = [...A_GROUND_THE_JOBS_LEAVE_ALONE, ...A_GROUND_IS_HELD];

/** One check-in's quiet people, from its rows. Null when it has no latest session old enough, or began before the release. */
export function theQuietIn(rows: any[], label: string, leadUserId: string, now: Date, release: Date): AQuietCheckIn | null {
  if (!rows.length) return null;
  const latest = Math.max(...rows.map((r) => r.sessionNumber ?? 0));
  const latestRows = rows.filter((r) => (r.sessionNumber ?? 0) === latest);
  const opened = Math.min(...latestRows.map((r) => new Date(r.createdAt).getTime()));
  if (opened < release.getTime() || now.getTime() - opened < QUIET_AFTER_DAYS * DAY) return null;
  const counted = latestRows.filter((r) => !r.participant?.managingOnly && !isNotLetInYet(r.participant) && r.participant?.userId !== leadUserId);
  if (!counted.length) return null;
  let never = 0;
  const stopped: string[] = [];
  for (const r of counted) {
    if (r.status === CheckInStatus.COMPLETED) continue;
    const before = rows.some((x) => x.participantId === r.participantId && (x.sessionNumber ?? 0) < latest && x.status === CheckInStatus.COMPLETED);
    if (before) stopped.push(theFirstNameOfAParticipant(r.participant) ?? '');
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
  try { release = await theReleaseMoment(prisma, now); } catch { return { tried: 0 }; }
  const grounds: any[] = await everyRowAPageAtATime((page: any) => prisma.ground.findMany({
    where: { status: { notIn: TERMINAL } },
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
          select: { participantId: true, sessionNumber: true, status: true, createdAt: true, participant: { select: { userId: true, managingOnly: true, nameGiven: true, user: { select: { firstName: true, lastName: true, awaitingOrgApproval: true } } } } },
        });
        const q = theQuietIn(rows, g.label, leadId, now, release);
        if (q && quietIn(q) > 0) found.push({ ...q, groundId: g.id });
      }
      const total = found.reduce((n, c) => n + quietIn(c), 0);
      if (total < 3) continue;
      const user = await prisma.user.findUnique({ where: { id: leadId }, select: { email: true, firstName: true, deletedAt: true, isActive: true } });
      if (!user?.email || user.deletedAt || user.isActive === false) continue;
      const mostOf = found.find(mostOfTheTeamIs);
      const w = mostOf ? theTeamWords(user.firstName, mostOf) : theAcrossWords(user.firstName, found);
      const link = mostOf ? `${base}/grounds/${mostOf.groundId}/board` : `${base}/grounds`;
      const went = await deps.email.sendWhoHasGoneQuiet(user.email, w.subject, w.lines, w.linkLabel, link);
      if (went !== 'suppressed') { await nowToldOnce(prisma, once); tried++; }
    } catch {
      /* One lead's message that could not be put together never stops the others. */
    }
  }
  return { tried };
}
