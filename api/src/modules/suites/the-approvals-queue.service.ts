import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AN_ADMIN_SWITCHES_IT_ON } from './a-suite-that-is-off-says-what-to-do';
import { decidesIt, theStepsFor, whoDecidesNow, type DecidesNow } from './who-may-decide';
import { dutiesFrom } from './who-holds-each-duty';
import { loadLookups, type Lookups } from './the-lookups';
import { WORKFLOWS_ROW, workflowsFrom, type AWorkflow } from './the-approval-steps';
import { LEAVE_RULES_ROW, leaveRulesFrom, type LeaveRules } from './the-leave-rules';
import { SPEND_RULES_ROW, spendRulesFrom } from './the-spending-rules';
import { DUTIES_ROW } from './who-holds-each-duty';
import { workingDays } from './the-leave-board.service';
import { workingDaysSince } from './a-request-waits-too-long';
import { leaveInWords, spendInWords, whatTheMoneyIsFor, whereItIsOnTheBoard } from './a-request-in-words';
import { theClashSaid, whoIsOffNamed } from './a-leave-request-as-the-approver-reads-it';
import { saidAsADay } from './who-is-away';

/**
 * THE APPROVER'S QUEUE (suites at scale for 100-person organisations; decision 85's "who sees what at
 * each stage"): everything that waits for this one person to approve or decline, leave and spending
 * together, oldest first, a page at a time, with the counts of the whole of it.
 *
 * WHO READS WHAT. Only what waits for the reader: a request is in their queue when the one approval
 * resolver (who-may-decide.ts) says they decide it now, which is the same answer the boards give and
 * the same one that lets them approve it. That is the person's manager, or head, or whoever holds the
 * budget or finance or HR, or an admin for any admin, or a stand-in while the person named is on
 * approved leave. Nobody's own request is ever in their queue, and a person nothing waits for reads an
 * empty queue, never somebody else's. The requester is not served here at all (their own requests are
 * on their own leave and spending pages), and a guest, or anybody outside the organisation, is refused.
 *
 * ONE READ. A fixed number of queries, however many people and requests there are: the memberships,
 * the directory, the suites' answers (one read for all six rows), who is away today, the waiting leave,
 * the waiting spending, and for the page itself the names and the leave already approved in the same
 * teams. Every request is decided in memory from those (the-lookups.ts), and only the page asked for is
 * put into words. The spec counts the queries at a hundred people and a hundred and fifty requests.
 *
 * NOTHING HERE DECIDES, SENDS OR CHANGES ANYTHING.
 */

export const THE_QUEUE_PAGE = 25;
export const THE_QUEUE_LONGEST_PAGE = 100;

export interface AQueueItem {
  /** The leave or spending request's id. */
  id: string;
  suite: 'leave' | 'spend';
  /** Who asked: their full name, and first name. */
  name: string;
  firstName: string;
  team: string | null;
  /** When it started waiting for the person it waits for now (an earlier step's approval, or being passed on, restarts it). */
  waitingSince: string;
  /** Working days it has waited. */
  workingDaysWaiting: number;
  /** Whether it has waited as long as the organisation allows before it is passed on, when the organisation has set that. */
  pastTheDeadline: boolean;
  /** The request in a full sentence: "Aisha asked for leave from Monday 12 October to Friday 16 October, which is 5 working days." */
  says: string;
  /** How long it has waited, in a full sentence. */
  waitedSays: string;
  /** Where it is: "It is waiting for you." or "Wairimu has approved it, and it is now waiting for you." */
  where: string;
  /** Spending only: the amount, and the line as the prototype reads it ("Grace: KES 120,000 for two tablets for the field team"). */
  amount: number | null;
  line: string | null;
  /** Leave only: the first and last day. */
  startsOn: string | null;
  endsOn: string | null;
  /**
   * Leave only: others in the same team already off on those days, by approved leave, with how many and who, and the sentence
   * (the same one the leave board says). Null when the person has no team, or nobody is off.
   */
  clash: { count: number; names: string[]; says: string } | null;
  /** Set when the reader reads this only because they stand in for somebody on leave: who, until when, and the sentence. */
  standingIn: { name: string; until: string | null; says: string } | null;
}

export interface TheQueue {
  /** The reader's whole queue, whichever page is read. */
  counts: { all: number; leave: number; spend: number; pastTheDeadline: number };
  page: number;
  pageSize: number;
  pages: number;
  /** Oldest first, then by id so a page never repeats or skips a request. */
  items: AQueueItem[];
  /** One full sentence for the top of the page. */
  says: string;
}

const NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const inWords = (n: number) => (n >= 0 && n <= 10 ? NUMBERS[n] : String(n));
const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
const dayOf = (d: Date) => d.toISOString().slice(0, 10);
const num = (x: unknown) => Number(x ?? 0);
/** Who is away, when the person named for this step is and somebody stands in for them. */
const standingInForOf = (now: DecidesNow): string | null => (now.who.kind === 'person' && now.who.standingInFor ? now.who.standingInFor : null);
const overlaps = (a: { startsOn: Date; endsOn: Date }, b: { startsOn: Date; endsOn: Date }) => a.startsOn <= b.endsOn && b.startsOn <= a.endsOn;

/** The sentence at the top of the queue. */
export function theQueueSaid(counts: TheQueue['counts']): string {
  if (!counts.all) return 'Nothing is waiting for you to approve or decline.';
  const parts = [counts.leave ? `${inWords(counts.leave)} for leave` : null, counts.spend ? `${inWords(counts.spend)} to spend` : null].filter(Boolean);
  const head = `${capital(inWords(counts.all))} ${counts.all === 1 ? 'request is' : 'requests are'} waiting for you to approve or decline${parts.length === 2 ? `: ${parts.join(' and ')}` : ''}.`;
  return counts.pastTheDeadline
    ? `${head} ${capital(inWords(counts.pastTheDeadline))} of them ${counts.pastTheDeadline === 1 ? 'has' : 'have'} waited longer than your organisation allows before a request is passed on.`
    : head;
}

type Row = {
  id: string; userId: string; status: string; step?: number | null; escalatedTo?: number | null; stepSince?: Date | null; approvedByIds?: string[] | null;
  askedAt?: Date | null; createdAt?: Date | null;
  startsOn?: Date; endsOn?: Date; kind?: string; amount?: unknown; what?: string; team?: string | null; category?: string | null;
};

@Injectable()
export class ApprovalsQueueService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * One person's queue. `page` counts from 1; `pageSize` is at most 100. `suite` narrows it to leave or spending, and the counts
   * still say the whole of it.
   */
  async queue(
    reader: { userId: string; organizationId: string },
    input: { page?: unknown; pageSize?: unknown; suite?: unknown } = {},
    today = new Date(),
  ): Promise<TheQueue> {
    const org = reader.organizationId;
    const suites = await this.suiteRows(org);
    const leaveOn = !!suites.leave?.isOn;
    const spendOn = !!suites.spend?.isOn;
    const lookups = await loadLookups(this.prisma, org, today, { duties: dutiesFrom(suites[DUTIES_ROW]?.answers) });
    const role = lookups.roles.get(reader.userId) ?? null;
    if (!role || role === 'GUEST') throw new ForbiddenException('Only people in this organisation can read what waits for them.');
    if (!leaveOn && !spendOn) throw new NotFoundException(`Neither leave nor spending is switched on. ${AN_ADMIN_SWITCHES_IT_ON}`);

    const workflows = workflowsFrom(suites[WORKFLOWS_ROW]?.answers);
    const leaveAnswers = {
      workflow: workflows.leave as AWorkflow | undefined,
      rules: leaveRulesFrom(suites[LEAVE_RULES_ROW]?.answers) as LeaveRules,
    };
    const spendRules = spendRulesFrom(suites[SPEND_RULES_ROW]?.answers);
    const sa = (suites.spend?.answers ?? {}) as Record<string, unknown>;
    const spendAnswers = {
      currency: typeof sa.currency === 'string' ? sa.currency : null,
      limit: typeof sa.limit === 'number' ? sa.limit : null,
      above: typeof sa.above === 'string' ? sa.above : null,
      workflow: workflows.spend as AWorkflow | undefined,
      thresholds: spendRules.thresholds,
    };

    const [leaveRows, spendRows] = await Promise.all([
      leaveOn ? (this.prisma.leaveRequest.findMany({ where: { organizationId: org, status: 'waiting', userId: { not: reader.userId } } }) as Promise<Row[]>) : Promise.resolve([] as Row[]),
      spendOn ? (this.prisma.spendRequest.findMany({ where: { organizationId: org, status: 'waiting', userId: { not: reader.userId } } }) as Promise<Row[]>) : Promise.resolve([] as Row[]),
    ]);

    /* Who decides each request now, in memory, and which are the reader's. */
    type Mine = { suite: 'leave' | 'spend'; row: Row; now: DecidesNow; since: Date; days?: number };
    const mine: Mine[] = [];
    const asker = (r: Row) => ({ organizationId: org, requesterUserId: r.userId, managerExternalId: lookups.entryOf.get(r.userId)?.managerExternalId ?? null });
    for (const r of leaveRows ?? []) {
      const days = workingDays(r.startsOn as Date, r.endsOn as Date);
      const now = await whoDecidesNow(this.prisma, theStepsFor('leave', leaveAnswers, days), { ...asker(r), team: lookups.entryOf.get(r.userId)?.department ?? null }, r, { lookups, on: today });
      if (decidesIt(now.who, { userId: reader.userId, role }, r.userId)) mine.push({ suite: 'leave', row: r, now, since: r.stepSince ?? r.askedAt ?? today, days });
    }
    for (const r of spendRows ?? []) {
      const team = r.team?.trim() || lookups.entryOf.get(r.userId)?.department?.trim() || null;
      const now = await whoDecidesNow(this.prisma, theStepsFor('spend', spendAnswers, num(r.amount)), { ...asker(r), team }, r, { lookups, on: today });
      if (decidesIt(now.who, { userId: reader.userId, role }, r.userId)) mine.push({ suite: 'spend', row: r, now, since: r.stepSince ?? r.createdAt ?? today });
    }

    /* Oldest first, and by id after that, so no two pages ever hold the same request. */
    mine.sort((a, b) => a.since.getTime() - b.since.getTime() || a.row.id.localeCompare(b.row.id));
    const allow = (suite: 'leave' | 'spend') => workflows[suite]?.escalateAfter;
    const late = (m: Mine) => { const a = allow(m.suite); return !!a && workingDaysSince(m.since, today) >= a; };
    const counts = {
      all: mine.length, leave: mine.filter((m) => m.suite === 'leave').length, spend: mine.filter((m) => m.suite === 'spend').length,
      pastTheDeadline: mine.filter(late).length,
    };

    const shown = input.suite === 'leave' || input.suite === 'spend' ? mine.filter((m) => m.suite === input.suite) : mine;
    const pageSize = Math.min(THE_QUEUE_LONGEST_PAGE, Math.max(1, Math.floor(Number(input.pageSize)) || THE_QUEUE_PAGE));
    const pages = Math.max(1, Math.ceil(shown.length / pageSize));
    const page = Math.min(pages, Math.max(1, Math.floor(Number(input.page)) || 1));
    const onThePage = shown.slice((page - 1) * pageSize, page * pageSize);

    return {
      counts, page, pageSize, pages, says: theQueueSaid(counts),
      items: await this.putIntoWords(onThePage, { reader, lookups, spendAnswers, late, today }),
    };
  }

  /** Only the page asked for is put into words: its names, and the leave already approved in its teams. */
  private async putIntoWords(
    page: { suite: 'leave' | 'spend'; row: Row; now: DecidesNow; since: Date; days?: number }[],
    c: { reader: { userId: string; organizationId: string }; lookups: Lookups; spendAnswers: { currency: string | null }; late: (m: any) => boolean; today: Date },
  ): Promise<AQueueItem[]> {
    if (!page.length) return [];
    const org = c.reader.organizationId;
    const leaveOnPage = page.filter((m) => m.suite === 'leave').map((m) => m.row);
    const approved = leaveOnPage.length
      ? ((await this.prisma.leaveRequest.findMany({
          where: {
            organizationId: org, status: 'approved',
            startsOn: { lte: new Date(Math.max(...leaveOnPage.map((r) => (r.endsOn as Date).getTime()))) },
            endsOn: { gte: new Date(Math.min(...leaveOnPage.map((r) => (r.startsOn as Date).getTime()))) },
          },
          select: { userId: true, startsOn: true, endsOn: true },
        })) as { userId: string; startsOn: Date; endsOn: Date }[])
      : [];
    const ids = [...page.flatMap((m) => [m.row.userId, ...(m.row.approvedByIds ?? []), ...(standingInForOf(m.now) ? [standingInForOf(m.now) as string] : [])]), ...approved.map((a) => a.userId)];
    const names = await this.namesOf(ids);
    const fullOf = (id: string) => names.get(id)?.full ?? '';
    const firstOf = (id: string) => names.get(id)?.first ?? '';
    const you = (id: string) => (id === c.reader.userId ? 'you' : firstOf(id));

    return page.map((m): AQueueItem => {
      const r = m.row;
      const waited = workingDaysSince(m.since, c.today);
      const first = firstOf(r.userId);
      const team = (m.suite === 'spend' ? r.team?.trim() : null) || c.lookups.entryOf.get(r.userId)?.department?.trim() || null;
      const approvedBy = (r.approvedByIds ?? []).map(you).filter(Boolean);
      const where = whereItIsOnTheBoard({ status: 'waiting', approvedBy, waitingFor: 'you' });
      const pastTheDeadline = c.late(m);
      const waitedSays = waited === 0 ? 'It was asked for today.' : `It has waited ${waited} working ${waited === 1 ? 'day' : 'days'}.`;
      const covering = standingInForOf(m.now);
      const until = covering ? c.lookups.away.get(covering) ?? null : null;
      const standingIn = covering
        ? { name: firstOf(covering), until, says: `You are standing in for ${firstOf(covering)}, who is on leave${until ? ` until ${saidAsADay(until)}` : ''}.` }
        : null;
      if (m.suite === 'leave') {
        const startsOn = dayOf(r.startsOn as Date); const endsOn = dayOf(r.endsOn as Date);
        const days = m.days ?? workingDays(r.startsOn as Date, r.endsOn as Date);
        const off = team
          ? whoIsOffNamed([...new Set(approved.filter((a) => a.userId !== r.userId && c.lookups.entryOf.get(a.userId)?.department?.trim() === team && overlaps(a, r as { startsOn: Date; endsOn: Date })).map((a) => a.userId))]
              .map((id) => ({ id, first: firstOf(id), full: fullOf(id) })))
          : { count: 0, names: [] as string[] };
        return {
          id: r.id, suite: 'leave', name: fullOf(r.userId), firstName: first, team, waitingSince: m.since.toISOString(), workingDaysWaiting: waited, pastTheDeadline,
          says: `${first} asked for ${leaveInWords(startsOn, endsOn)}, which is ${days} working ${days === 1 ? 'day' : 'days'}.`,
          waitedSays, where, amount: null, line: null, startsOn, endsOn,
          clash: team && off.count ? { count: off.count, names: off.names, says: theClashSaid(team, off.names, startsOn === endsOn) } : null,
          standingIn,
        };
      }
      const amount = num(r.amount);
      return {
        id: r.id, suite: 'spend', name: fullOf(r.userId), firstName: first, team, waitingSince: m.since.toISOString(), workingDaysWaiting: waited, pastTheDeadline,
        says: `${first} asked to spend ${c.spendAnswers.currency ? `${c.spendAnswers.currency} ` : ''}${amount.toLocaleString('en-US')} on ${whatTheMoneyIsFor(r.what ?? '')}.`,
        waitedSays, where, amount, line: `${first}: ${spendInWords(amount, c.spendAnswers.currency, r.what ?? '')}`, startsOn: null, endsOn: null, clash: null, standingIn,
      };
    }).filter((i) => i.name);
  }

  /** First and full names, by sign-in, in one query. Never an address. */
  private async namesOf(ids: string[]): Promise<Map<string, { first: string; full: string }>> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return new Map();
    const us = await this.prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, firstName: true, lastName: true } });
    return new Map((us ?? []).map((u) => [u.id, { first: u.firstName?.trim() || '', full: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() }]));
  }

  /** The six rows the queue reads, in one query: the two suites and the four kinds of rule kept beside them. */
  private async suiteRows(organizationId: string): Promise<Record<string, { isOn: boolean; answers: unknown } | undefined>> {
    const rows = await this.prisma.organizationSuite.findMany({
      where: { organizationId, suite: { in: ['leave', 'spend', WORKFLOWS_ROW, LEAVE_RULES_ROW, SPEND_RULES_ROW, DUTIES_ROW] } },
      select: { suite: true, isOn: true, answers: true },
    });
    return Object.fromEntries((rows ?? []).map((r) => [r.suite, { isOn: r.isOn, answers: r.answers }]));
  }
}
