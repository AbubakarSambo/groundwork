import { GroundStatus } from '@prisma/client';
import { A_GROUND_THE_JOBS_LEAVE_ALONE, A_GROUND_IS_HELD } from '../grounds/a-ground-that-has-ended';
import { everyRowAPageAtATime } from '../whatsapp/every-row-a-page-at-a-time';

/**
 * THE PARTICIPANT'S WEEK, BY EMAIL (decision 109; engagement spec section 25), FROM THEIR OWN YOU BOARD.
 *
 * What a person reads is only what is already theirs, each piece from where they already read it: what they said they would do and have kept (their
 * own record), what is still open from them, what they are waiting on (their own words), and what is waiting on them. The last is served by the You
 * board with its own naming rule: who asked is named only where the check-in lets its people see each other, or where the reader runs it, and
 * otherwise it says "somebody". Never a colleague's own commitment, sentence or number; never how anybody's answers were rated; never a label on
 * anybody. The subject says what happened to them, in counts, and carries no name.
 *
 * EXISTING CLIENTS ONLY GET BETTER (decision 109 item 2): a check-in that has stalled, ended or is held is left out of this, so nobody is written
 * to about one. If nothing useful is left, nothing is sent (spec 26).
 */
export const PARTICIPANT_WEEK_SENDER = 'sendYourWeek';

const TERMINAL: GroundStatus[] = [...A_GROUND_THE_JOBS_LEAVE_ALONE, ...A_GROUND_IS_HELD];
const things = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const listed = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const quoted = (xs: string[]) => xs.map((x) => `"${x.trim().replace(/[.!?]+$/, '')}"`);

export interface TheirWeek {
  /** From the board's own "kept lately". */
  kept: { kept: number; of: number } | null;
  /** What they said they would do, still open, in their own words. */
  open: string[];
  /** What they are waiting on, in their own words. */
  waitingOn: string[];
  /** What waits on them, as the board serves it: who is null where the check-in does not let them see. */
  waitingOnYou: { who: string | null; what: string; checkIn: string }[];
}

/** The email, or null where nothing useful is left to say. */
export function theirWeekInWords(firstName: string | null | undefined, w: TheirWeek) {
  const facts: string[] = [];
  if (w.kept && w.kept.of > 0) facts.push(`You kept ${w.kept.kept} of ${w.kept.of} things you said you would do`);
  if (w.waitingOnYou.length) facts.push(`${things(w.waitingOnYou.length, 'request is', 'requests are')} waiting on you`);
  if (!facts.length && w.open.length) facts.push(`${things(w.open.length, 'thing you said you would do is', 'things you said you would do are')} still open`);
  if (!facts.length && !w.waitingOn.length) return null;
  if (!facts.length) facts.push(`You are waiting on ${things(w.waitingOn.length, 'thing', 'things')}`);
  const lines = [`Hello ${firstName?.trim() || 'there'}. Here is your week in Groundwork. Only you can read this.`];
  if (w.kept && w.kept.of > 0) lines.push(`Your progress: you kept ${w.kept.kept} of the ${w.kept.of} things you said you would do in the last four weeks.`);
  if (w.open.length) lines.push(`Still open from you: ${listed(quoted(w.open.slice(0, 3)))}${w.open.length > 3 ? `, and ${w.open.length - 3} more` : ''}.`);
  if (w.waitingOn.length) lines.push(`You are waiting on: ${listed(quoted(w.waitingOn.slice(0, 3)))}${w.waitingOn.length > 3 ? `, and ${w.waitingOn.length - 3} more` : ''}.`);
  if (w.waitingOnYou.length) {
    lines.push(`${things(w.waitingOnYou.length, 'request is', 'requests are')} waiting on you: ${listed(w.waitingOnYou.slice(0, 3).map((r) => `${r.who ?? 'somebody'} is waiting for "${r.what.trim().replace(/[.!?]+$/, '')}" in "${r.checkIn}"`))}.`);
  }
  return { subject: facts.join('; '), lines, linkLabel: 'Open your page' };
}

/**
 * The sweep. Every person with a check-in still going gets at most one email, built from their own board. The sender decides whether it may go
 * (the opt-out, the one routine message a day, quiet hours). Returns how many were tried.
 */
export async function sendTheParticipantsWeeks(
  deps: {
    prisma: any;
    board: { forReader: (reader: { userId: string; email: string; organizationId: string; role: string }) => Promise<any> };
    email: { sendYourWeek: (to: string, subject: string, lines: string[], linkLabel: string, linkUrl: string) => Promise<unknown> };
    frontendUrl: string;
  },
  now: Date = new Date(),
): Promise<{ tried: number }> {
  const { prisma } = deps;
  const rows: any[] = await everyRowAPageAtATime((page: any) => prisma.groundParticipant.findMany({
    where: { userId: { not: null }, managingOnly: false, ground: { status: { notIn: TERMINAL } } },
    select: { id: true, userId: true, ground: { select: { label: true } } },
    orderBy: { id: 'asc' },
    ...page,
  }), 1000);
  const open = new Map<string, { labels: Set<string>; participantIds: string[] }>();
  for (const r of rows) {
    const o = open.get(r.userId) ?? { labels: new Set<string>(), participantIds: [] };
    o.labels.add(r.ground.label);
    o.participantIds.push(r.id);
    open.set(r.userId, o);
  }
  const link = `${(deps.frontendUrl || '').replace(/\/$/, '')}/you`;
  let tried = 0;
  for (const [userId, mine] of open) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true, role: true, organizationId: true, isActive: true, deletedAt: true, awaitingOrgApproval: true } });
      if (!user?.email || user.deletedAt || user.isActive === false || user.awaitingOrgApproval) continue;
      const board = await deps.board.forReader({ userId, email: user.email, organizationId: user.organizationId, role: user.role });
      const inOpen = (label: string) => mine.labels.has(label);
      /* What they are waiting on: their own handoffs, in their own words, in check-ins still going. */
      const own: any[] = await prisma.groundDependency.findMany({
        where: { fromParticipantId: { in: mine.participantIds }, status: { in: ['WAITING', 'BLOCKING'] }, clearedAt: null },
        select: { what: true, ground: { select: { label: true } } },
        orderBy: { createdAt: 'asc' },
      });
      const week: TheirWeek = {
        kept: board?.keptLately ? { kept: board.keptLately.kept, of: board.keptLately.of } : null,
        open: (board?.saidYoudDo ?? []).filter((s: any) => s.state === 'open' && inOpen(s.checkIn)).map((s: any) => s.text),
        waitingOn: own.filter((d) => inOpen(d.ground?.label)).map((d) => d.what).filter((t: string) => !!t?.trim()),
        waitingOnYou: (board?.askedOfYou?.items ?? []).filter((i: any) => inOpen(i.checkIn)).map((i: any) => ({ who: i.who ?? null, what: i.what, checkIn: i.checkIn })),
      };
      const words = theirWeekInWords(user.firstName, week);
      if (!words) continue;
      await deps.email.sendYourWeek(user.email, words.subject, words.lines, words.linkLabel, link);
      tried++;
    } catch {
      /* One person's email that could not be put together never stops the others. */
    }
  }
  return { tried };
}
