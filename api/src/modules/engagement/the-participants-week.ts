import { GroundStatus } from '@prisma/client';
import { theConfirmedWaits, theNoteBesideTheClaim } from '../grounds/a-wait-is-the-speakers-account';
import { A_GROUND_NO_MESSAGE_IS_ABOUT } from '../grounds/a-ground-that-has-ended';
import { nameToCall, aNameToList } from './a-name-to-call-them';
import { aNumberInWords } from './a-number-in-words';
import { theEngagementMoment } from './the-engagement-release-moment';
import { thereIsASessionToCome } from './heres-what-is-new';
import { theOwnWeekOf, theOwnKept } from '../grounds/your-board';
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

const TERMINAL: GroundStatus[] = A_GROUND_NO_MESSAGE_IS_ABOUT;
const cap = (t: string) => `${t.charAt(0).toUpperCase()}${t.slice(1)}`;
const listed = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const trimmed = (t: string) => t.trim().replace(/[.!?]+$/, '');
const quoted = (xs: string[]) => xs.map((x) => `"${trimmed(x)}"`);
const thing = (n: number) => (n === 1 ? 'thing' : 'things');
/**
 * Who the person is waiting on, when it only says the thing again: "You are waiting for "who owns the distributor next step" from the person who owns the distributor
 * next step." (found on the test bed). When most of the words of the one are in the other, the "from" adds nothing and is left off.
 */
const WORDS_THAT_SAY_NOTHING = new Set(['the', 'a', 'an', 'of', 'to', 'for', 'from', 'who', 'person', 'someone', 'somebody', 'is', 'on', 'and', 'in', 'by', 'with']);
const wordsOf = (t: string) => new Set(t.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w && !WORDS_THAT_SAY_NOTHING.has(w)));
export function saysTheSameThing(what: string, from: string): boolean {
  const a = wordsOf(what);
  const b = wordsOf(from);
  if (!a.size || !b.size) return false;
  let shared = 0;
  for (const w of b) if (a.has(w)) shared += 1;
  return shared / b.size >= 0.6;
}

export interface TheirWeek {
  /** What they kept and settled in the last four weeks, in check-ins still going. */
  kept: { kept: number; of: number } | null;
  /** What they said they would do, still open, in their own words. */
  open: string[];
  /** What they are waiting on, in their own words, and from whom where they and the check-in let it be said. */
  waitingOn: { what: string; from: string | null }[];
  /** What waits on them, as the board serves it: who is null where the check-in does not let them see. */
  waitingOnYou: { who: string | null; what: string; checkIn: string }[];
  /**
   * WHAT SOMEBODY SAYS WAITS ON THEM, AND THEY HAVE NOT SAID SO (decision 137; decision 139, must-fix 4). Fatuma was emailed three weeks
   * running that Kevin was waiting for the final prices from her; she had sent them. A wait only the speaker claims is the speaker's account:
   * it is told to her as what they said, and never counted as a request waiting on her.
   */
  saidToWaitOnYou?: { who: string | null; what: string; checkIn: string; note?: string }[];
  /**
   * The check-ins whose report is ready for this person to read, by name (decision 117, D14). The "your report is ready" email goes at most twice
   * for a report; after that the report is told here, in the regular summary, and only here.
   */
  reportsReady?: string[];
}

/** The email, or null where nothing useful is left to say. Full sentences, numbers in words, no colon anywhere. */
export function theirWeekInWords(firstName: string | null | undefined, w: TheirWeek) {
  /* A kept count of nothing is not said: "You kept none of two" is a verdict, and the open things below it say what is true. */
  const kept = w.kept && w.kept.of > 0 && w.kept.kept > 0 ? w.kept : null;
  const facts: string[] = [];
  if (kept) facts.push(kept.of === kept.kept && kept.of === 1 ? 'You kept the one thing you said you would do' : kept.of === kept.kept ? `You kept all ${aNumberInWords(kept.of)} things you said you would do` : `You kept ${aNumberInWords(kept.kept)} of the ${aNumberInWords(kept.of)} ${thing(kept.of)} you said you would do`);
  if (w.waitingOnYou.length) facts.push(`${aNumberInWords(w.waitingOnYou.length)} ${w.waitingOnYou.length === 1 ? 'request is' : 'requests are'} waiting on you`);
  const reports = (w.reportsReady ?? []).filter((l) => !!l?.trim());
  if (reports.length) facts.push(reports.length === 1 ? 'Your report is ready to read' : `${cap(aNumberInWords(reports.length))} of your reports are ready to read`);
  if (!facts.length && w.open.length) facts.push(`${cap(aNumberInWords(w.open.length))} ${thing(w.open.length)} you said you would do ${w.open.length === 1 ? 'is' : 'are'} still open`);
  if (!facts.length && w.waitingOn.length) facts.push(`You are waiting on ${aNumberInWords(w.waitingOn.length)} ${thing(w.waitingOn.length)}`);
  if (!facts.length) return null;
  const subject = facts.map((f, i) => (i ? `${f.charAt(0).toLowerCase()}${f.slice(1)}` : cap(f))).join('; ');

  const lines = [`Hello ${firstName?.trim() || 'there'}. Here is your week in Groundwork. Only you can read this.`];
  if (kept) lines.push(kept.of === 1 ? 'You kept the one thing you said you would do in the last four weeks.' : kept.kept === kept.of ? `You kept all ${aNumberInWords(kept.of)} things you said you would do in the last four weeks.` : `You kept ${aNumberInWords(kept.kept)} of the ${aNumberInWords(kept.of)} things you said you would do in the last four weeks.`);
  if (reports.length) lines.push(reports.length === 1 ? `Your report for "${trimmed(reports[0])}" is ready to read.` : `Your reports for ${listed(quoted(reports.slice(0, 3)))} are ready to read.`);
  if (w.open.length) {
    const shown = w.open.slice(0, 3);
    lines.push(`${cap(aNumberInWords(w.open.length))} ${thing(w.open.length)} you said you would do ${w.open.length === 1 ? 'is' : 'are'} still open, ${listed(quoted(shown))}${w.open.length > 3 ? `, and ${aNumberInWords(w.open.length - 3)} more` : ''}.`);
  }
  for (const d of w.waitingOn.slice(0, 3)) lines.push(`You are waiting for "${trimmed(d.what)}"${d.from && !saysTheSameThing(d.what, d.from) ? ` from ${d.from}` : ''}.`);
  for (const r of w.waitingOnYou.slice(0, 3)) lines.push(`${cap(r.who ?? 'somebody')} ${r.who === 'you' ? 'are' : 'is'} waiting for "${trimmed(r.what)}" from you in "${r.checkIn}".`);
  for (const r of (w.saidToWaitOnYou ?? []).slice(0, 3)) {
    const who = cap(r.who && r.who !== 'you' ? r.who : 'somebody');
    lines.push(`${who} says the work is waiting for "${trimmed(r.what)}" from you in "${r.checkIn}". That is what ${who === 'Somebody' ? 'they' : who} said, and you have not said it yourself. Say in your check-in whether it is yours to give.${r.note ? ` ${r.note}` : ''}`);
  }
  return { subject, lines, linkLabel: 'Open your page' };
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
  /* WHAT IS REALLY STILL GOING (decision 109 item 2): an answer since the engagement messages began, or a session still to come. A check-in left
     open that nobody has answered since, and that has nothing more to come, is dead, and is never written about. Unreadable moment: nothing is sent. */
  let began: Date;
  try { began = await theEngagementMoment(prisma, now); } catch { return { tried: 0 }; }
  const rows: any[] = await everyRowAPageAtATime((page: any) => prisma.groundParticipant.findMany({
    where: { userId: { not: null }, managingOnly: false, ground: { status: { notIn: TERMINAL } } },
    select: {
      id: true, userId: true, groundId: true, partyType: true,
      ground: { select: { label: true, report: { select: { releasedAt: true } }, runsUntilEnded: true, endsAt: true, timelineDays: true, createdAt: true } },
      checkIns: { where: { status: 'COMPLETED', completedAt: { gte: began } }, select: { id: true }, take: 1 },
    },
    orderBy: { id: 'asc' },
    ...page,
  }), 1000);
  const open = new Map<string, { labels: Set<string>; participantIds: string[]; groundIds: string[]; reportsReady: Set<string> }>();
  for (const r of rows) {
    const stillGoing = (r.checkIns?.length ?? 0) > 0 || thereIsASessionToCome(r.ground, now);
    if (!stillGoing) continue;
    const o = open.get(r.userId) ?? { labels: new Set<string>(), participantIds: [], groundIds: [], reportsReady: new Set<string>() };
    /* Their own report is ready: it was released, they are a person who checks in, and they have answered since the messages began. */
    if (r.ground?.report?.releasedAt && r.partyType === 'PARTICIPANT' && (r.checkIns?.length ?? 0) > 0) o.reportsReady.add(r.ground.label);
    o.labels.add(r.ground.label);
    o.groundIds.push(r.groundId);
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
      /* What they are waiting on: their own handoffs, in their own words, in check-ins still going. Who they wait on is said only where they named a
         person who is somebody the check-in lets them see (peers visible), or in their own words for it. */
      const waits: any[] = await prisma.groundDependency.findMany({
        where: { fromParticipantId: { in: mine.participantIds }, status: { in: ['WAITING', 'BLOCKING'] }, clearedAt: null },
        select: { what: true, onLabel: true, ground: { select: { label: true, peersVisibleToEachOther: true } }, onParticipant: { select: { nameGiven: true, user: { select: { firstName: true, lastName: true } } } } },
        orderBy: { createdAt: 'asc' },
      });
      /* What they kept, only from check-ins still going: their own settled commitments there, in the last four weeks. */
      const commitments: any[] = await Promise.resolve(prisma.groundCommitment.findMany({
        where: { groundId: { in: mine.groundIds }, participantId: { in: mine.participantIds }, status: { in: ['DONE', 'NOT_DONE'] } },
        select: { status: true, createdAt: true, settledAt: true },
      })).catch(() => []);
      const own = theOwnWeekOf(board);
      /* Which of the waits on them only the speaker claims: no promise of theirs in that check-in names it (decision 137). */
      const onThem: any[] = await Promise.resolve(prisma.groundDependency.findMany({
        where: { onParticipantId: { in: mine.participantIds }, status: { in: ['WAITING', 'BLOCKING'] }, clearedAt: null },
        select: { id: true, groundId: true, onParticipantId: true, what: true, triedSaid: true, ground: { select: { label: true } } },
      })).catch(() => []);
      const confirmed = await theConfirmedWaits(prisma, Array.isArray(onThem) ? onThem : []);
      const onlyClaimed = new Map((Array.isArray(onThem) ? onThem : []).filter((d) => !confirmed.has(d.id)).map((d) => [`${d.ground?.label ?? ''}|${(d.what ?? '').trim().toLowerCase()}`, theNoteBesideTheClaim(d)] as [string, string]));
      const isOnlyClaimed = (i: { what: string; checkIn: string }) => onlyClaimed.has(`${i.checkIn}|${(i.what ?? '').trim().toLowerCase()}`);
      const askedOfThem = own.askedOfYou.filter((i) => inOpen(i.checkIn));
      const week: TheirWeek = {
        kept: theOwnKept(Array.isArray(commitments) ? commitments : [], now),
        open: own.open.filter((s) => inOpen(s.checkIn)).map((s) => s.text),
        waitingOn: waits.filter((d) => inOpen(d.ground?.label)).filter((d) => !!d.what?.trim()).map((d) => ({
          what: d.what,
          from: d.onLabel?.trim() || (d.ground?.peersVisibleToEachOther !== false ? (d.onParticipant && aNameToList(nameToCall(d.onParticipant)) ? nameToCall(d.onParticipant) : null) : null),
        })),
        waitingOnYou: askedOfThem.filter((i) => !isOnlyClaimed(i)),
        saidToWaitOnYou: askedOfThem.filter(isOnlyClaimed).map((i) => ({ ...i, note: onlyClaimed.get(`${i.checkIn}|${(i.what ?? '').trim().toLowerCase()}`) })),
        reportsReady: [...mine.reportsReady],
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
