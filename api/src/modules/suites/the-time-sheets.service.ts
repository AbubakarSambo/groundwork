import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { theirRosterEntries, theirRosterEntry } from './a-roster-entry-and-its-sign-in';
import { inTheLeadsTeam } from './a-leads-team';
import { whoApprovesFor } from './who-approves';
import { couldBeNamed, decidesIt, everyRuleIn, theStepsFor, whoComesNext, whoDecidesNow, type DecidesNow } from './who-may-decide';
import { whyPassOn } from './a-request-waits-too-long';
import { aRequestsHistory, recordIt } from './a-request-is-recorded';
import type { PassedOn } from './the-leave-board.service';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';
import { anHoursRequest, whereItIsOnTheBoard, whereYourRequestIs, type WhereItStands } from './a-request-in-words';
import { firstNamesOf, readWorkflow, whoInWords, type AWorkflow } from './the-approval-steps';
import { saidAsADay } from './who-is-away';

/** The words the server says when it refuses, in plain full sentences. */
export const TIME_REFUSED = {
  notOn: 'The time sheets suite is not switched on.',
  onlyAdminsAndLeads: 'Only an admin or a lead can open this board.',
  notInIt: 'Only people in this organisation have time sheets here.',
  notYours: 'Only the person who approves these hours can approve them.',
  nothingToApprove: 'There are no hours to approve for that week.',
  nothingToRead: 'There are no hours here for you to read for that week.',
  onlyAnAdmin: 'Only an admin can say what each client agreed.',
  notAClient: 'That is not one of the clients or projects on the list.',
  badHours: 'Give a day and between a quarter of an hour and 24 hours for it.',
  badAgreement: 'Each agreement needs a client on the list, the work, the hours, and whether they are for the whole job or each month.',
};

export interface Reader { userId: string; organizationId: string }
type Day = string;

export interface AWeek {
  weekOf: Day;
  /** The clients and projects with hours this week, in the order the admin listed them. */
  clients: string[];
  people: {
    personId: string; name: string; minutes: Record<string, number>; total: number; approved: boolean; mayApprove: boolean;
    /** The days of this week that have hours, so a sentence can say which. */ days: Day[];
    /** Where these hours are, in a full sentence for this reader: "Wairimu has approved these hours, and they are now waiting for you." */
    where: string;
  }[];
}

/** A week's row as kept: the last step's approval, and where the week is among the steps (decision 85, build step 4). */
type WeekRow = {
  userId: string; weekOf: Date; approvedMinutes: number | null; approvedById?: string | null;
  seenMinutes?: number | null; step?: number | null; escalatedTo?: number | null; approvedByIds?: string[] | null;
};

/** Where a week is: its step, how far it was passed on, who approved so far, and whether the last step approved this total. */
interface WeekState { step: number; escalatedTo: number; approvedByIds: string[]; approved: boolean }

/**
 * A week's state for its total now. Hours added or changed since the steps approved start it again at
 * the first step, as a changed week waited again before steps existed.
 */
export function weekStateOf(row: WeekRow | undefined, total: number): WeekState {
  const approved = !!row && total > 0 && row.approvedMinutes === total;
  if (row && row.seenMinutes != null && row.seenMinutes === total) {
    return { step: row.step ?? 0, escalatedTo: row.escalatedTo ?? 0, approvedByIds: row.approvedByIds ?? [], approved };
  }
  return { step: 0, escalatedTo: 0, approvedByIds: approved && row?.approvedById ? [row.approvedById] : [], approved };
}

export interface Agreement { client: string; work: string; hours: number; span: 'whole' | 'month'; usedMinutes: number }

const DAY = 86_400_000;
const dayOf = (d: Date): Day => d.toISOString().slice(0, 10);
const atMidnight = (d: Day) => new Date(`${d}T00:00:00.000Z`);
/** The Monday a day's week starts on. */
export function mondayOf(d: Date): Date {
  const m = atMidnight(dayOf(d));
  return new Date(m.getTime() - ((m.getUTCDay() + 6) % 7) * DAY);
}
const WEEKS_BACK = 8;

type Entry = { userId: string; client: string; onDay: Date; minutes: number };

/**
 * TIME SHEETS (E3, #/suite/time, U.17). HOURS ARE FOR BILLING ONLY (decisions rule 10). Nothing
 * outside the suites reads them, so they never reach a check-in, its record, its report, a signal or a
 * review; a test scans the code for it. Nothing here rates how much anybody works.
 *
 * WHO READS WHAT, decided here and never on the screen:
 *   - nobody, while the suite is off;
 *   - an admin reads everybody's hours, week by week, and the hours against what each client agreed;
 *   - a lead reads only their own team's hours (a-leads-team.ts), which is what they need to approve;
 *   - whoever the rules name to approve somebody's hours (who-may-decide.ts) also reads that person's
 *     hours: a lead from another team, or a member, who opens the board as an "approver" and reads
 *     nobody else's hours and no client's agreement;
 *   - each person reads only their own hours (`mine`);
 *   - a colleague and a guest are refused the board.
 * WHO APPROVES is the one approval resolver (who-may-decide.ts): the person's line manager in the staff directory, or an admin when there is none. A week is
 * approved with the total the approver saw; hours added later make it wait again.
 */
@Injectable()
export class TimeSheetsService {
  constructor(
    private readonly prisma: PrismaService,
    /* Tells the approver, and then the person, on WhatsApp (decision 82, item 1). Optional so a test built by hand still runs. */
    @Optional() private readonly told?: ARequestToldOnWhatsApp,
  ) {}

  async board(reader: Reader, today = new Date()): Promise<{ reader: 'admin' | 'lead' | 'approver'; thisWeek: Day; weeks: AWeek[]; agreements: Agreement[] | null }> {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    /*
     * Whoever the rules name approves, whatever their role or team (who-may-decide.ts). A member the
     * rules could name opens the board as an approver and is served only the people whose hours wait
     * for them; any other member, and a guest, are refused, as before.
     */
    const asApprover = role !== 'ADMIN' && role !== 'LEAD';
    if (asApprover && !(role === 'MEMBER' && (await couldBeNamed(this.prisma, everyRuleIn(theStepsFor('time', answers)), reader.organizationId, { userId: reader.userId, role })))) {
      throw new ForbiddenException(TIME_REFUSED.onlyAdminsAndLeads);
    }

    const thisWeek = mondayOf(today);
    const from = new Date(thisWeek.getTime() - WEEKS_BACK * 7 * DAY);
    const entries = (await this.prisma.timeEntry.findMany({
      where: { organizationId: reader.organizationId, onDay: { gte: from } },
      select: { userId: true, client: true, onDay: true, minutes: true },
    })) as Entry[];
    const people = await this.directory(reader.organizationId, entries.map((e) => e.userId));
    const teamOf = role === 'ADMIN' ? () => true : role === 'LEAD' ? await this.theLeadsTeam(reader, people) : () => false;

    const approvals = (await this.prisma.timeWeek.findMany({
      where: { organizationId: reader.organizationId, weekOf: { gte: from } },
      select: { userId: true, weekOf: true, approvedMinutes: true, approvedById: true, seenMinutes: true, step: true, escalatedTo: true, approvedByIds: true },
    })) as WeekRow[];
    const rowOf = new Map(approvals.map((a) => [`${dayOf(a.weekOf)}|${a.userId}`, a]));
    const totals = new Map<string, number>();
    for (const e of entries) {
      const k = `${dayOf(mondayOf(e.onDay))}|${e.userId}`;
      totals.set(k, (totals.get(k) ?? 0) + e.minutes);
    }
    /*
     * A lead reads their own team's hours; anybody also reads each week of hours that waits for them to
     * approve, at the step it is on.
     */
    const approves = new Map<string, boolean>();
    const nowOf = new Map<string, { now: DecidesNow; state: WeekState }>();
    for (const [k, total] of totals) {
      const userId = k.split('|')[1];
      if (userId === reader.userId) continue;
      const state = weekStateOf(rowOf.get(k), total);
      const now = await this.now(reader.organizationId, userId, people, answers, state);
      nowOf.set(k, { now, state });
      approves.set(k, decidesIt(now.who, { userId: reader.userId, role }, userId));
    }
    const inScope = (e: Entry) => teamOf(e.userId) || approves.get(`${dayOf(mondayOf(e.onDay))}|${e.userId}`) === true;
    const mine = entries.filter((e) => e.userId !== reader.userId && inScope(e));
    const names = await this.names(mine.map((e) => e.userId));

    const byWeek = new Map<Day, Entry[]>();
    for (const e of mine) {
      const w = dayOf(mondayOf(e.onDay));
      byWeek.set(w, [...(byWeek.get(w) ?? []), e]);
    }
    const weeks: AWeek[] = [];
    for (const w of [...new Set([dayOf(thisWeek), ...byWeek.keys()])].sort()) {
      const es = byWeek.get(w) ?? [];
      const order = this.clientOrder(answers.clients, es);
      const rows: AWeek['people'] = [];
      for (const userId of [...new Set(es.map((e) => e.userId))]) {
        const theirs = es.filter((e) => e.userId === userId);
        const minutes: Record<string, number> = {};
        for (const c of order) minutes[c] = theirs.filter((e) => e.client === c).reduce((n, e) => n + e.minutes, 0);
        const total = theirs.reduce((n, e) => n + e.minutes, 0);
        const name = names.get(userId);
        if (!name) continue;
        const k = `${w}|${userId}`;
        const at = nowOf.get(k);
        const mayApprove = approves.get(k) === true;
        rows.push({
          personId: userId, name, minutes, total,
          days: [...new Set(theirs.map((e) => dayOf(e.onDay)))].sort(),
          approved: at?.state.approved === true,
          mayApprove,
          where: at ? whereItIsOnTheBoard(await this.whereItStands(at.state, at.now, mayApprove, reader.userId), true) : '',
        });
      }
      rows.sort((a, b) => a.name.localeCompare(b.name));
      const current = w === dayOf(thisWeek);
      if (current || rows.some((r) => !r.approved)) weeks.push({ weekOf: w, clients: order, people: rows });
    }

    return {
      reader: role === 'ADMIN' ? 'admin' : role === 'LEAD' ? 'lead' : 'approver',
      thisWeek: dayOf(thisWeek), weeks, agreements: role === 'ADMIN' ? await this.agreements(reader.organizationId, today) : null,
    };
  }

  /**
   * The approver of the step a week is on approves it, with the total they saw. At a step that is not
   * the last, the week moves to the next step and whoever approves that one is told; the last step's
   * approval ends it, and then the person is told. Hours cannot be declined.
   */
  async approve(reader: Reader, personId: string, weekOf: Day, today = new Date()) {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekOf ?? '')) throw new BadRequestException(TIME_REFUSED.nothingToApprove);
    const monday = mondayOf(atMidnight(weekOf));
    const people = await this.directory(reader.organizationId, [personId]);
    const entries = await this.prisma.timeEntry.findMany({
      where: { organizationId: reader.organizationId, userId: personId, onDay: { gte: monday, lt: new Date(monday.getTime() + 7 * DAY) } },
      select: { minutes: true, client: true, onDay: true },
    });
    const total = entries.reduce((n, e) => n + e.minutes, 0);
    const state = weekStateOf(await this.weekRow(reader.organizationId, personId, monday), total);
    const now = await this.now(reader.organizationId, personId, people, answers, state);
    if (personId === reader.userId || !decidesIt(now.who, { userId: reader.userId, role }, personId)) throw new ForbiddenException(TIME_REFUSED.notYours);
    if (total === 0) throw new BadRequestException(TIME_REFUSED.nothingToApprove);
    const where = { organizationId_userId_weekOf: { organizationId: reader.organizationId, userId: personId, weekOf: monday } };
    const approvedByIds = [...state.approvedByIds, reader.userId];
    await recordIt(this.prisma, { organizationId: reader.organizationId, suite: 'time', ref: `${personId}|${dayOf(monday)}`, kind: 'approved', byUserId: reader.userId, step: now.step, basis: { row: 'time_entries', minutes: total } });
    if (!now.last && !state.approved) {
      const next = { step: now.step + 1, escalatedTo: 0, stepSince: new Date(), seenMinutes: total, approvedByIds };
      await this.prisma.timeWeek.upsert({
        where,
        create: { organizationId: reader.organizationId, userId: personId, weekOf: monday, approvedMinutes: null, approvedById: null, approvedAt: null, ...next },
        update: next,
      });
      await this.tellWhoApproves(reader.organizationId, personId, monday, entries as Entry[], { ...next, approved: false });
      return this.board(reader, today);
    }
    await this.prisma.timeWeek.upsert({
      where,
      create: { organizationId: reader.organizationId, userId: personId, weekOf: monday, approvedMinutes: total, approvedById: reader.userId, seenMinutes: total, step: now.step, approvedByIds },
      update: { approvedMinutes: total, approvedById: reader.userId, approvedAt: new Date(), seenMinutes: total, step: now.step, approvedByIds },
    });
    await this.tellThePerson(reader.organizationId, personId, monday, entries as Entry[], reader.userId);
    return this.board(reader, today);
  }

  /**
   * One week's record of who did what, in plain sentences (decision 85, build step 5), for the people
   * who may already read those hours: the person, an admin, a lead of their team, and whoever approves
   * them now. Anybody else is told there are no hours to read.
   */
  async history(reader: Reader, personId: string, weekOf: Day): Promise<{ said: string[] }> {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekOf ?? '') || !role) throw new NotFoundException(TIME_REFUSED.nothingToRead);
    const monday = mondayOf(atMidnight(weekOf));
    const people = await this.directory(reader.organizationId, [personId]);
    let mayRead = personId === reader.userId || role === 'ADMIN' || (role === 'LEAD' && (await this.theLeadsTeam(reader, people))(personId));
    if (!mayRead) {
      const entries = await this.prisma.timeEntry.findMany({
        where: { organizationId: reader.organizationId, userId: personId, onDay: { gte: monday, lt: new Date(monday.getTime() + 7 * DAY) } },
        select: { minutes: true },
      });
      const total = entries.reduce((t, e) => t + e.minutes, 0);
      const state = weekStateOf(await this.weekRow(reader.organizationId, personId, monday), total);
      mayRead = total > 0 && !state.approved && decidesIt((await this.now(reader.organizationId, personId, people, answers, state)).who, { userId: reader.userId, role }, personId);
    }
    if (!mayRead) throw new NotFoundException(TIME_REFUSED.nothingToRead);
    return aRequestsHistory(this.prisma, reader.organizationId, 'time', `${personId}|${dayOf(monday)}`, reader.userId);
  }

  /** Who a week of hours waits for now, in words ("Omar in finance"), or null when it no longer waits. */
  async nowWaitingFor(organizationId: string, personId: string, weekOf: Day): Promise<string | null> {
    const answers = await this.suiteAnswers(organizationId);
    const monday = mondayOf(atMidnight(weekOf));
    const entries = await this.prisma.timeEntry.findMany({
      where: { organizationId, userId: personId, onDay: { gte: monday, lt: new Date(monday.getTime() + 7 * DAY) } },
      select: { minutes: true },
    });
    const total = entries.reduce((n, e) => n + e.minutes, 0);
    const state = weekStateOf(await this.weekRow(organizationId, personId, monday), total);
    if (!total || state.approved) return null;
    const now = await this.now(organizationId, personId, await this.directory(organizationId, [personId]), answers, state);
    return whoInWords(this.prisma, now.who, now.team);
  }

  /**
   * Once a day (a-request-waits-too-long.cron.ts): each week of hours that has waited the set number
   * of working days for one person, or whose approver is on approved leave today, moves to the next
   * rule on its step's list, and whoever that names is told. Nothing moves while the admin has set no
   * days. A week waits from when its last hours were sent, or from when it last moved.
   */
  async passOnWhatWaitsTooLong(organizationId: string, today = new Date()): Promise<PassedOn[]> {
    const answers = await this.suiteAnswers(organizationId).catch(() => null);
    if (!answers?.workflow?.escalateAfter) return [];
    const from = new Date(mondayOf(today).getTime() - WEEKS_BACK * 7 * DAY);
    const entries = (await this.prisma.timeEntry.findMany({
      where: { organizationId, onDay: { gte: from } },
      select: { userId: true, client: true, onDay: true, minutes: true, createdAt: true },
    })) as (Entry & { createdAt?: Date })[];
    if (!entries.length) return [];
    const rows = (await this.prisma.timeWeek.findMany({ where: { organizationId, weekOf: { gte: from } } })) as (WeekRow & { stepSince?: Date | null })[];
    const people = await this.directory(organizationId, entries.map((e) => e.userId));
    const byWeek = new Map<string, (Entry & { createdAt?: Date })[]>();
    for (const e of entries) {
      const k = `${dayOf(mondayOf(e.onDay))}|${e.userId}`;
      byWeek.set(k, [...(byWeek.get(k) ?? []), e]);
    }
    const out: PassedOn[] = [];
    for (const [k, es] of byWeek) {
      const [w, userId] = k.split('|');
      const total = es.reduce((t, e) => t + e.minutes, 0);
      const row = [...rows].reverse().find((r) => r.userId === userId && dayOf(new Date(r.weekOf)) === w);
      const state = weekStateOf(row, total);
      if (state.approved || !total) continue;
      const n = await whoComesNext(this.prisma, theStepsFor('time', answers), {
        organizationId, requesterUserId: userId,
        managerExternalId: people.get(userId)?.managerExternalId ?? null, team: people.get(userId)?.department ?? null,
      }, state);
      if (!n) continue;
      const sent = es.map((e) => e.createdAt ?? e.onDay).reduce((a, b) => (a > b ? a : b));
      const since = (row && row.seenMinutes === total && row.stepSince) || sent;
      const why = await whyPassOn(this.prisma, organizationId, n.now, since, today, answers.workflow.escalateAfter);
      if (!why) continue;
      const monday = atMidnight(w);
      const moved = { step: state.step, escalatedTo: n.next.at, stepSince: today, seenMinutes: total, approvedByIds: state.approvedByIds };
      await this.prisma.timeWeek.upsert({
        where: { organizationId_userId_weekOf: { organizationId, userId, weekOf: monday } },
        create: { organizationId, userId, weekOf: monday, approvedMinutes: null, approvedById: null, approvedAt: null, ...moved },
        update: moved,
      });
      await recordIt(this.prisma, {
        organizationId, suite: 'time', ref: k, kind: 'escalated', step: n.now.step, toUserId: n.next.who.kind === 'admin' ? null : n.next.who.userId,
        basis: { row: 'time_entries', minutes: total, fromUserId: n.now.who.kind === 'admin' ? null : n.now.who.userId, ...why },
      });
      await this.tellWhoApproves(organizationId, userId, monday, es, { ...state, escalatedTo: n.next.at }, answers);
      out.push({ ref: k, step: n.now.step, from: n.now.who, to: n.next.who, why });
    }
    return out;
  }

  /** Whoever approves the step a week is on is told on WhatsApp (decision 82, item 1). */
  async tellWhoApproves(organizationId: string, personId: string, monday: Date, entries: { client: string; onDay: Date; minutes: number }[], state: WeekState, answers?: { clients: string[]; approver: string | null; workflow?: AWorkflow }): Promise<void> {
    if (!this.told || !entries.length) return;
    try {
      const a = answers ?? (await this.suiteAnswers(organizationId));
      const now = await this.now(organizationId, personId, await this.directory(organizationId, [personId]), a, state);
      const first = await this.told.firstNameOf(personId);
      await this.told.waiting(organizationId, await this.told.approversOf(organizationId, now.who, personId), { ...this.inWords(personId, first, entries), ref: `${personId}|${dayOf(monday)}` });
    } catch { /* the hours stand */ }
  }

  /** The kept row of one person's week, read in code so a changed week is never missed. */
  private async weekRow(organizationId: string, userId: string, monday: Date): Promise<WeekRow | undefined> {
    const rows = (await this.prisma.timeWeek.findMany({ where: { organizationId, userId } }).catch(() => [])) as WeekRow[];
    return [...(rows ?? [])].reverse().find((r) => dayOf(new Date(r.weekOf)) === dayOf(monday));
  }

  /** Each person's own hours, week by week. Nobody else's. */
  async mine(reader: Reader, today = new Date()) {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    if (!role || role === 'GUEST') throw new ForbiddenException(TIME_REFUSED.notInIt);
    const from = new Date(mondayOf(today).getTime() - WEEKS_BACK * 7 * DAY);
    const entries = (await this.prisma.timeEntry.findMany({
      where: { organizationId: reader.organizationId, userId: reader.userId, onDay: { gte: from } },
      select: { userId: true, client: true, onDay: true, minutes: true },
    })) as Entry[];
    const approvals = (await this.prisma.timeWeek.findMany({
      where: { organizationId: reader.organizationId, userId: reader.userId, weekOf: { gte: from } },
      select: { userId: true, weekOf: true, approvedMinutes: true, approvedById: true, seenMinutes: true, step: true, escalatedTo: true, approvedByIds: true },
    })) as WeekRow[];
    const people = await this.directory(reader.organizationId, [reader.userId]);
    const weeks: { weekOf: Day; minutes: Record<string, number>; total: number; approved: boolean; where: string }[] = [];
    for (const w of [...new Set(entries.map((e) => dayOf(mondayOf(e.onDay))))].sort().reverse()) {
      const es = entries.filter((e) => dayOf(mondayOf(e.onDay)) === w);
      const minutes: Record<string, number> = {};
      for (const c of this.clientOrder(answers.clients, es)) minutes[c] = es.filter((e) => e.client === c).reduce((n, e) => n + e.minutes, 0);
      const total = es.reduce((n, e) => n + e.minutes, 0);
      const state = weekStateOf([...approvals].reverse().find((a) => dayOf(new Date(a.weekOf)) === w), total);
      const now = state.approved ? null : await this.now(reader.organizationId, reader.userId, people, answers, state);
      /* "Your hours for the week of Monday 28 September are approved by Wairimu and are now waiting for Omar in finance." */
      const where = whereYourRequestIs(`Your hours for the week of ${saidAsADay(w)}`, await this.whereItStands(state, now, false, reader.userId), true);
      weeks.push({ weekOf: w, minutes, total, approved: state.approved, where });
    }
    return { weeks };
  }

  /**
   * For the engine's say-back (week 21): the clients and projects on the admin's list and the first
   * name of the person who would approve these hours (null when it is an admin). Reads no hours.
   */
  async forChat(organizationId: string, userId: string): Promise<{ clients: string[]; approverFirstName: string | null }> {
    const answers = await this.suiteAnswers(organizationId);
    const role = await this.roleOf({ userId, organizationId });
    if (!role || role === 'GUEST') throw new ForbiddenException(TIME_REFUSED.notInIt);
    const who = await whoApprovesFor(this.prisma, { organizationId, personUserId: userId, suite: 'time' });
    return { clients: answers.clients, approverFirstName: who.kind === 'admin' ? null : who.firstName };
  }

  /**
   * Hours somebody gave, as the engine will record them once the person has confirmed them
   * (docs/requests-to-engine.md, request 22). There is no route: "There is no grid to fill in."
   */
  async record(organizationId: string, userId: string, entries: { client: string; onDay: Day; hours: number }[], said: { proposalId?: string | null } = {}) {
    const answers = await this.suiteAnswers(organizationId);
    const role = await this.roleOf({ userId, organizationId });
    if (!role || role === 'GUEST') throw new ForbiddenException(TIME_REFUSED.notInIt);
    const rows = (entries ?? []).map((e) => {
      const client = answers.clients.find((c) => c.toLowerCase() === (e.client ?? '').trim().toLowerCase());
      if (!client) throw new BadRequestException(TIME_REFUSED.notAClient);
      const minutes = Math.round((e.hours ?? 0) * 60);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(e.onDay ?? '') || !(minutes >= 15 && minutes <= 24 * 60)) throw new BadRequestException(TIME_REFUSED.badHours);
      return { organizationId, userId, client, onDay: atMidnight(e.onDay), minutes };
    });
    if (!rows.length) throw new BadRequestException(TIME_REFUSED.badHours);
    await this.prisma.timeEntry.createMany({ data: rows });
    /* One record of who did what (decision 85, build step 5): sent, for each week, after the say-back and the yes when there was one. */
    for (const w of new Set(rows.map((r) => dayOf(mondayOf(r.onDay))))) {
      const minutes = rows.filter((r) => dayOf(mondayOf(r.onDay)) === w).reduce((t, r) => t + r.minutes, 0);
      await recordIt(this.prisma, { organizationId, suite: 'time', ref: `${userId}|${w}`, kind: 'asked', byUserId: userId, basis: { row: 'time_entries', minutes, ...(said.proposalId ? { proposalId: said.proposalId } : {}) } });
    }
    /* Whoever approves the first step is told on WhatsApp too (decision 82, item 1): changed hours start again there. */
    if (this.told) {
      try {
        const now = await this.now(organizationId, userId, await this.directory(organizationId, [userId]), answers, { step: 0, escalatedTo: 0 });
        const first = await this.told.firstNameOf(userId);
        await this.told.waiting(organizationId, await this.told.approversOf(organizationId, now.who, userId), this.inWords(userId, first, rows));
      } catch { /* the hours stand */ }
    }
    return { recorded: rows.length };
  }

  /** Hours as every reader reads them: how many, on which clients, for which day or week. Never how much somebody works. */
  private inWords(userId: string, firstName: string, es: { client: string; onDay: Date; minutes: number }[]) {
    const minutes: Record<string, number> = {};
    for (const e of es) minutes[e.client] = (minutes[e.client] ?? 0) + e.minutes;
    const days = [...new Set(es.map((e) => dayOf(e.onDay)))].sort();
    return anHoursRequest(userId, dayOf(mondayOf(es[0].onDay)), firstName, minutes, es.reduce((t, e) => t + e.minutes, 0), days);
  }

  /** The person whose week was approved is told, on WhatsApp (decision 82, item 1). True when it went. */
  async tellThePerson(organizationId: string, personId: string, monday: Date, entries: { client: string; onDay: Date; minutes: number }[], deciderUserId: string): Promise<boolean> {
    if (!this.told || !entries.length) return false;
    const first = await this.told.firstNameOf(personId);
    const r = this.inWords(personId, first, entries);
    return this.told.decided(organizationId, { ...r, what: r.what.replace(/^approval of /, ''), ref: `${personId}|${dayOf(monday)}` }, 'approved', deciderUserId).catch(() => false);
  }

  /** An admin says what each client agreed. It replaces the list. */
  async setAgreements(reader: Reader, list: unknown, today = new Date()) {
    const answers = await this.suiteAnswers(reader.organizationId);
    if ((await this.roleOf(reader)) !== 'ADMIN') throw new ForbiddenException(TIME_REFUSED.onlyAnAdmin);
    const items = Array.isArray(list) ? list : [];
    const rows = items.map((x: any) => {
      const client = answers.clients.find((c) => c.toLowerCase() === String(x?.client ?? '').trim().toLowerCase());
      const work = String(x?.work ?? '').trim();
      const hours = Number(x?.hours);
      if (!client || !work || work.length > 200 || !Number.isInteger(hours) || hours < 1 || hours > 100_000 || !['whole', 'month'].includes(x?.span)) {
        throw new BadRequestException(TIME_REFUSED.badAgreement);
      }
      return { organizationId: reader.organizationId, client, work, hours, span: x.span as string };
    });
    await this.prisma.$transaction([
      this.prisma.timeAgreement.deleteMany({ where: { organizationId: reader.organizationId } }),
      this.prisma.timeAgreement.createMany({ data: rows }),
    ]);
    return this.board(reader, today);
  }

  // ---------------------------------------------------------------------------------------------

  private async agreements(organizationId: string, today: Date): Promise<Agreement[]> {
    const list = await this.prisma.timeAgreement.findMany({ where: { organizationId }, orderBy: { createdAt: 'asc' } });
    if (!list.length) return [];
    const entries = await this.prisma.timeEntry.findMany({
      where: { organizationId, client: { in: [...new Set(list.map((a) => a.client))] } },
      select: { client: true, onDay: true, minutes: true },
    });
    const month = dayOf(today).slice(0, 7);
    return list.map((a) => ({
      client: a.client,
      work: a.work,
      hours: a.hours,
      span: a.span === 'month' ? 'month' : 'whole',
      usedMinutes: entries
        .filter((e) => e.client === a.client && (a.span !== 'month' || dayOf(e.onDay).slice(0, 7) === month))
        .reduce((n, e) => n + e.minutes, 0),
    }));
  }

  private clientOrder(listed: string[], es: { client: string }[]): string[] {
    const used = new Set(es.map((e) => e.client));
    return [...listed.filter((c) => used.has(c)), ...[...used].filter((c) => !listed.includes(c)).sort()];
  }

  private async suiteAnswers(organizationId: string): Promise<{ clients: string[]; approver: string | null; workflow?: AWorkflow }> {
    const suite = await this.prisma.organizationSuite.findUnique({
      where: { organizationId_suite: { organizationId, suite: 'time' } },
      select: { isOn: true, answers: true },
    });
    if (!suite?.isOn) throw new NotFoundException(TIME_REFUSED.notOn);
    const a = (suite.answers ?? {}) as Record<string, unknown>;
    return {
      clients: Array.isArray(a.clients) ? a.clients.filter((c): c is string => typeof c === 'string') : [],
      approver: typeof a.approver === 'string' ? a.approver : null,
      /* The steps an admin set (the-approval-steps.ts). None: one step, as before. */
      workflow: await readWorkflow(this.prisma, organizationId, 'time'),
    };
  }

  private async roleOf(reader: Reader): Promise<string | null> {
    const m = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: reader.userId, organizationId: reader.organizationId } },
      select: { role: true },
    });
    return m?.role ?? null;
  }

  private async directory(organizationId: string, userIds: string[]) {
    /* Linked entries, and entries matched to their sign-in by address (a-roster-entry-and-its-sign-in.ts). */
    const ps = await theirRosterEntries(this.prisma, organizationId, userIds, { externalId: true, department: true, managerExternalId: true });
    return new Map([...ps].map(([userId, p]) => [userId, { externalId: p.externalId as string, department: p.department as string | null, managerExternalId: p.managerExternalId as string | null }]));
  }

  /** Who approves this person's week now, from the step it is on, by the one approval resolver (who-may-decide.ts). */
  private now(organizationId: string, personId: string, people: Map<string, { department: string | null; managerExternalId: string | null }>, answers: { approver: string | null; workflow?: AWorkflow }, state: { step: number; escalatedTo: number }): Promise<DecidesNow> {
    return whoDecidesNow(this.prisma, theStepsFor('time', answers), {
      organizationId, requesterUserId: personId,
      managerExternalId: people.get(personId)?.managerExternalId ?? null, team: people.get(personId)?.department ?? null,
    }, state);
  }

  /** Who approved a week so far and who it waits for now, as names; "you" for the reader. */
  private async whereItStands(state: WeekState, now: DecidesNow | null, readerApproves: boolean, readerUserId: string): Promise<WhereItStands> {
    return {
      status: state.approved ? 'approved' : 'waiting',
      approvedBy: await firstNamesOf(this.prisma, state.approvedByIds, readerUserId),
      waitingFor: !state.approved && now ? (readerApproves ? 'you' : await whoInWords(this.prisma, now.who, now.team, readerUserId)) : null,
    };
  }

  private async theLeadsTeam(reader: Reader, people: Map<string, { externalId: string; department: string | null; managerExternalId: string | null }>) {
    const me = await theirRosterEntry(this.prisma, reader.organizationId, reader.userId, { externalId: true, department: true });
    return (userId: string) => {
      const p = people.get(userId);
      return !!me && !!p && inTheLeadsTeam(me, p);
    };
  }

  /** Full names, never an address. */
  private async names(userIds: string[]) {
    const ids = [...new Set(userIds)];
    const us = ids.length ? await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true } }) : [];
    return new Map(us.map((u) => [u.id, [u.firstName, u.lastName].filter(Boolean).join(' ').trim()]));
  }
}
