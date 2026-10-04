import { CheckInStatus, GroundStatus } from '@prisma/client';
import { theFirstNameOfAParticipant } from '../reports/a-title-is-not-a-first-name';
import { isNotLetInYet } from '../grounds/who-an-admin-did-not-let-in';
import { A_GROUND_THE_JOBS_LEAVE_ALONE, A_GROUND_IS_HELD } from '../grounds/a-ground-that-has-ended';
import { everyRowAPageAtATime } from '../whatsapp/every-row-a-page-at-a-time';

/**
 * THE LEAD'S WEEKLY LETTER (docs/anchor-scenario-plan.md, piece 29; the prototype's "one weekly letter",
 * C1/every-email-and-message; docs/anchor-scenario.md, section 23: "Email can carry the fuller weekly
 * summary").
 *
 * Friday afternoon, short, and only what is the lead's. For each check-in the lead started from the
 * anchor link, it says what the record of the past seven days shows: how many people checked in, how
 * many said what they will do next, how many of the things people said they would do were done, how
 * many handoffs are still waiting, and who did not check in. It is built only from counts and from the
 * first names of people who did not check in, as the lead's morning WhatsApp already names them. It
 * never holds anything anybody said, nothing from Ask Groundwork, and no one person's load across
 * check-ins: each check-in is counted on its own and never added to another.
 *
 * The weekly WhatsApp insight is not this: it waits on Needs Hafsah, item 2.
 */

const NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const aNumber = (n: number) => (n <= 10 ? NUMBERS[n] : String(n));
const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
const listed = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

export const THE_SUBJECT = "Your team's week";
export const THE_LINK_SAYS = "See this week's picture";

/** One check-in's week, counted. */
export interface AWeekInOneCheckIn {
  groundId: string;
  label: string;
  /** People who can answer: not managing only, and let in. */
  ofHowMany: number;
  checkedIn: number;
  /** First names of those who did not check in; the lead herself is 'you'. */
  notYet: string[];
  /** People who said what they will do next this week. */
  saidWhatNext: number;
  /** Things people said they would do that were settled as done this week. */
  done: number;
  /** Handoffs still waiting on someone. */
  waiting: number;
}

/** The sentences for one check-in, in order. Nothing is said that the count does not hold. */
export function theWeekInSentences(w: AWeekInOneCheckIn): string[] {
  const out: string[] = [];
  if (w.checkedIn <= 0) out.push('Nobody has checked in this week.');
  else if (w.checkedIn >= w.ofHowMany) out.push(w.ofHowMany === 1 ? 'This week, the one person who can answer checked in.' : `This week, all ${w.ofHowMany} people checked in.`);
  else out.push(`This week, ${w.checkedIn} of ${w.ofHowMany} people checked in.`);
  if (w.saidWhatNext > 0) out.push(`${capital(aNumber(w.saidWhatNext))} ${w.saidWhatNext === 1 ? 'person' : 'people'} said what they will do next.`);
  if (w.done > 0) out.push(`${capital(aNumber(w.done))} ${w.done === 1 ? 'thing' : 'things'} people said they would do ${w.done === 1 ? 'was' : 'were'} done.`);
  if (w.waiting > 0) out.push(`${capital(aNumber(w.waiting))} ${w.waiting === 1 ? 'handoff is' : 'handoffs are'} still waiting on someone.`);
  if (w.checkedIn > 0 && w.notYet.length) {
    const named = w.notYet.slice(0, w.notYet.length > 3 ? 2 : 3);
    const others = w.notYet.length - named.length;
    const who = listed(others > 0 ? [...named, others === 1 ? 'one other person' : `${others} others`] : named);
    out.push(`${capital(who)} did not check in.`);
  }
  return out;
}

export interface TheLetter {
  subject: string;
  /** One paragraph each, as plain sentences. A check-in's own name is a paragraph of its own only when there is more than one. */
  lines: string[];
  linkLabel: string;
  linkPath: 'board' | 'grounds';
  /** The one check-in the link opens, when there is one. */
  groundId: string | null;
}

/** The whole letter. Null when no check-in has anybody who can answer, so there is nothing to say. */
export function theLeadsLetter(weeks: AWeekInOneCheckIn[]): TheLetter | null {
  const counted = weeks.filter((w) => w.ofHowMany > 0);
  if (!counted.length) return null;
  const moving = counted.some((w) => w.saidWhatNext > 0 || w.done > 0);
  const lines = [moving ? 'Your team is starting to move.' : "Here is your team's week."];
  for (const w of counted) {
    if (counted.length > 1) lines.push(`"${w.label}"`);
    lines.push(theWeekInSentences(w).join(' '));
  }
  return { subject: THE_SUBJECT, lines, linkLabel: THE_LINK_SAYS, linkPath: counted.length === 1 ? 'board' : 'grounds', groundId: counted.length === 1 ? counted[0].groundId : null };
}

const TERMINAL: GroundStatus[] = [...A_GROUND_THE_JOBS_LEAVE_ALONE, ...A_GROUND_IS_HELD];
const WEEK = 7 * 86_400_000;

/**
 * Counts one check-in's last seven days. Reads nothing anybody said: only who finished, counts of
 * commitments and handoffs, and first names.
 */
export async function theWeekOf(prisma: any, g: { id: string; label: string; initiatorId: string }, now: Date): Promise<AWeekInOneCheckIn> {
  const since = new Date(now.getTime() - WEEK);
  const [people, finished, saidNext, done, waiting] = await Promise.all([
    prisma.groundParticipant.findMany({ where: { groundId: g.id }, select: { id: true, userId: true, managingOnly: true, nameGiven: true, user: { select: { firstName: true, lastName: true, awaitingOrgApproval: true } } } }),
    prisma.checkIn.findMany({ where: { groundId: g.id, status: CheckInStatus.COMPLETED, completedAt: { gte: since, lte: now } }, select: { participantId: true } }),
    prisma.groundCommitment.findMany({ where: { groundId: g.id, participantId: { not: null }, createdAt: { gte: since, lte: now } }, select: { participantId: true } }),
    prisma.groundCommitment.count({ where: { groundId: g.id, status: 'DONE', settledAt: { gte: since, lte: now } } }),
    prisma.groundDependency.count({ where: { groundId: g.id, status: { not: 'CLEARED' } } }),
  ]);
  const counted = (people as any[]).filter((p) => !p.managingOnly && !isNotLetInYet(p));
  const countedIds = new Set(counted.map((p) => p.id));
  const finishedIds = new Set((finished as any[]).map((r) => r.participantId).filter((id: string) => countedIds.has(id)));
  const notYet = counted
    .filter((p) => !finishedIds.has(p.id))
    .map((p) => (p.userId && p.userId === g.initiatorId ? 'you' : theFirstNameOfAParticipant(p) ?? ''))
    .filter((n: string) => !!n)
    .sort((a: string, b: string) => (a === 'you' ? -1 : b === 'you' ? 1 : 0));
  const saidNextBy = new Set((saidNext as any[]).map((r) => r.participantId).filter((id: string) => countedIds.has(id)));
  return { groundId: g.id, label: g.label, ofHowMany: counted.length, checkedIn: finishedIds.size, notYet, saidWhatNext: saidNextBy.size, done: done as number, waiting: waiting as number };
}

/**
 * Every lead with a check-in started from the anchor link that is still going gets one letter. The
 * sender decides whether it may go (stop link, quiet hours, a bounced address). Returns how many were tried.
 */
export async function sendTheLeadsWeeklyLetters(
  deps: { prisma: any; email: { sendTheLeadsWeeklyLetter: (to: string, subject: string, lines: string[], linkLabel: string, linkUrl: string) => Promise<unknown> }; frontendUrl: string },
  now: Date = new Date(),
): Promise<{ tried: number }> {
  const { prisma } = deps;
  const grounds: any[] = await everyRowAPageAtATime((page: any) => prisma.ground.findMany({
    where: { startedFrom: 'anchor', status: { notIn: TERMINAL } },
    select: { id: true, label: true, initiatorId: true },
    ...page,
  }), 1000);
  const byLead = new Map<string, { id: string; label: string; initiatorId: string }[]>();
  for (const g of grounds) byLead.set(g.initiatorId, [...(byLead.get(g.initiatorId) ?? []), g]);

  const base = (deps.frontendUrl || '').replace(/\/$/, '');
  let tried = 0;
  for (const [leadId, theirs] of byLead) {
    try {
      const user = await prisma.user.findUnique({ where: { id: leadId }, select: { email: true, deletedAt: true } });
      if (!user?.email || user.deletedAt) continue;
      const weeks: AWeekInOneCheckIn[] = [];
      for (const g of theirs) weeks.push(await theWeekOf(prisma, g, now));
      const letter = theLeadsLetter(weeks);
      if (!letter) continue;
      const linkUrl = letter.linkPath === 'board' ? `${base}/grounds/${letter.groundId}/board` : `${base}/grounds`;
      await deps.email.sendTheLeadsWeeklyLetter(user.email, letter.subject, letter.lines, letter.linkLabel, linkUrl);
      tried++;
    } catch {
      /* One lead's letter that could not be put together never stops the others. */
    }
  }
  return { tried };
}
