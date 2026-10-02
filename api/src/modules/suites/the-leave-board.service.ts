import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { theirRosterEntries, theirRosterEntry } from './a-roster-entry-and-its-sign-in';
import { inTheLeadsTeam } from './a-leads-team';
import { couldBeNamed, decidesIt, everyRuleIn, theStepsFor, whoComesNext, whoDecidesNow, type DecidesNow, type WhoDecides } from './who-may-decide';
import { whyPassOn, type WhyPassedOn } from './a-request-waits-too-long';
import { aRequestsHistory, recordIt } from './a-request-is-recorded';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';
import { aLeaveRequest, leaveInWords, whereItIsOnTheBoard, whereYourRequestIs, type WhereItStands } from './a-request-in-words';
import { firstNamesOf, readWorkflow, whoInWords, type AWorkflow } from './the-approval-steps';
import { ownedInWords, whatTheyOwnWhileAway } from './what-they-own-while-away';
import { aLeaveRequestAsTheApproverReadsIt } from './a-leave-request-as-the-approver-reads-it';

/** The words the server says when it refuses, in plain full sentences. */
export const LEAVE_REFUSED = {
  notOn: 'The leave suite is not switched on.',
  onlyAdminsAndLeads: 'Only an admin or a lead can open this board.',
  notInIt: 'Only people in this organisation can ask for leave here.',
  notFound: 'That request was not found.',
  notYours: 'Only the person who approves this request can decide it.',
  alreadyDecided: 'This request has already been decided.',
  badDates: 'Give a first and a last day, with the last day on or after the first.',
  badStandIn: 'The stand-in has to be somebody else in this organisation.',
};

export interface Reader { userId: string; organizationId: string }

/** One request passed on because it waited too long, or its approver was away. */
export interface PassedOn { ref: string; step: number; from: WhoDecides; to: WhoDecides; why: WhyPassedOn }

/** A day as a person reads it, with no time of day: "2026-10-01". */
export type Day = string;

export interface Waiting {
  id: string;
  name: string;
  startsOn: Day;
  endsOn: Day;
  /** Working days this request takes. */
  days: number;
  /** Days left this year before this request, when the organisation has said how many each person has. */
  daysLeft: number | null;
  /** The department the overlap is counted in, or null when the directory gives none. */
  team: string | null;
  /** The first names of others in the same team already off on any of those days. */
  alsoOff: string[];
  standIn: string | null;
  /** Whether this reader is the one who approves it. */
  mayDecide: boolean;
  /** Where it is, in a full sentence for this reader: "Wairimu has approved it, and it is now waiting for you." */
  where: string;
  /**
   * What the person owns that falls in those days (decision 85, build step 7), each a full sentence:
   * "Aisha owns “Project X milestone” on Sales, Q3, due on Thursday 1 October." Only what this reader
   * may already read (what-they-own-while-away.ts).
   */
  owns: string[];
  /**
   * The whole request as the person who decides it reads it, in full sentences: who asked for which
   * days, the days left, who else in the team is off, the stand-in and what the person owns then.
   */
  said: string[];
}

/**
 * Who the board is served to: an admin, a lead, or a member who reads it only because a request waits
 * for them to decide ("approver"). An approver is served only the requests they decide, and in "off"
 * only their own leave.
 */
export type BoardReader = 'admin' | 'lead' | 'approver';

export interface Off { id: string; name: string; startsOn: Day; endsOn: Day; kind: 'annual' }

export interface MyLeave {
  perYear: number | null;
  daysLeft: number | null;
  requests: {
    id: string; startsOn: Day; endsOn: Day; days: number; status: 'waiting' | 'approved' | 'declined'; standIn: string | null;
    /** Where it is, in a full sentence: "Your leave from ... is approved by Wairimu and is now waiting for Omar in finance." */
    where: string;
  }[];
}

type Row = {
  id: string; organizationId: string; userId: string; startsOn: Date; endsOn: Date; kind: string;
  standInUserId: string | null; status: string; decidedById: string | null; decidedAt: Date | null;
  /* Where it is among the approval steps (decision 85, build step 4). Rows read before steps existed have none: step one. */
  step?: number | null; escalatedTo?: number | null; stepSince?: Date | null; approvedByIds?: string[] | null;
};

/** Who approved the steps so far. A request decided before steps were kept names only who decided it. */
const approversOf = (r: Pick<Row, 'status' | 'decidedById' | 'approvedByIds'>): string[] =>
  r.approvedByIds?.length ? r.approvedByIds : r.status === 'approved' && r.decidedById ? [r.decidedById] : [];

const DAY = 86_400_000;
const dayOf = (d: Date): Day => d.toISOString().slice(0, 10);
const atMidnight = (d: Day): Date => new Date(`${d}T00:00:00.000Z`);

/** Monday to Friday between two days, both counted. Public holidays are not known here. */
export function workingDays(from: Date, to: Date): number {
  let n = 0;
  for (let t = from.getTime(); t <= to.getTime(); t += DAY) {
    const w = new Date(t).getUTCDay();
    if (w !== 0 && w !== 6) n++;
  }
  return n;
}

/** Working days of a request that fall in one calendar year. */
function workingDaysIn(year: number, from: Date, to: Date): number {
  const start = new Date(Math.max(from.getTime(), Date.UTC(year, 0, 1)));
  const end = new Date(Math.min(to.getTime(), Date.UTC(year, 11, 31)));
  return end < start ? 0 : workingDays(start, end);
}

const overlaps = (a: { startsOn: Date; endsOn: Date }, b: { startsOn: Date; endsOn: Date }) =>
  a.startsOn <= b.endsOn && b.startsOn <= a.endsOn;

/**
 * THE LEAVE BOARD (E2, #/suite/leave, U.17). Who reads what is decided here, never on the screen:
 *   - nobody, while the leave suite is off;
 *   - an admin reads every request waiting and everybody off in the next two weeks;
 *   - a lead reads only their own team's (a-leads-team.ts): what is waiting, with the days left and
 *     who else in the team is off those days, which is only what is needed to decide, and who in the
 *     team is off in the next two weeks;
 *   - whoever the rules name to decide a request (who-may-decide.ts) also reads that request, with
 *     the days left and who else in the team is off those days: a lead from another team, or a member,
 *     who opens the board as an "approver" and reads nothing else of anybody's leave;
 *   - each person reads only their own requests and their own days left (`mine`);
 *   - a colleague reads nothing of anybody else's leave, and nobody reads a reason, because none is
 *     kept.
 * WHO DECIDES is the one approval resolver (who-may-decide.ts): the person's manager in the directory,
 * when that manager is a lead or an admin here, or else any admin. Nobody decides their own. Nothing here reaches a check-in or its report.
 */
@Injectable()
export class LeaveBoardService {
  constructor(
    private readonly prisma: PrismaService,
    /* Tells the approver, and then the person, on WhatsApp (decision 82, item 1). Optional so a test built by hand still runs. */
    @Optional() private readonly told?: ARequestToldOnWhatsApp,
  ) {}

  async board(reader: Reader, today = new Date()): Promise<{ reader: BoardReader; waiting: Waiting[]; off: Off[] }> {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    /*
     * Whoever the rules name decides, whatever their role or team (who-may-decide.ts). A member the
     * rules could name opens the board as an approver and is served only what waits for them; any
     * other member, and a guest, are refused, as before.
     */
    const asApprover = role !== 'ADMIN' && role !== 'LEAD';
    if (asApprover && !(role === 'MEMBER' && (await couldBeNamed(this.prisma, everyRuleIn(theStepsFor('leave', answers)), reader.organizationId, { userId: reader.userId, role })))) {
      throw new ForbiddenException(LEAVE_REFUSED.onlyAdminsAndLeads);
    }

    const rows = (await this.prisma.leaveRequest.findMany({
      where: { organizationId: reader.organizationId, status: { in: ['waiting', 'approved'] } },
      orderBy: { startsOn: 'asc' },
    })) as Row[];
    const people = await this.directory(reader.organizationId, rows);
    const names = await this.names(rows);

    const inScope = role === 'ADMIN'
      ? (_userId: string) => true
      : role === 'LEAD' ? await this.theLeadsTeam(reader, people) : (_userId: string) => false;

    const approved = rows.filter((r) => r.status === 'approved');
    const waiting: Waiting[] = [];
    for (const r of rows.filter((x) => x.status === 'waiting' && x.userId !== reader.userId)) {
      /* A lead reads their own team's requests; anybody also reads each request that waits for them to decide. */
      const now = await this.now(r, people, answers);
      const decides = decidesIt(now.who, { userId: reader.userId, role }, r.userId);
      if (!inScope(r.userId) && !decides) continue;
      const team = people.get(r.userId)?.department?.trim() || null;
      const alsoOff = team
        ? approved.filter((a) => a.userId !== r.userId && people.get(a.userId)?.department?.trim() === team && overlaps(a, r))
            .map((a) => names.get(a.userId)?.first).filter((n): n is string => !!n)
        : [];
      const first = names.get(r.userId)?.first ?? '';
      const days = workingDays(r.startsOn, r.endsOn);
      const daysLeft = this.daysLeft(answers.perYear, approved.filter((a) => a.userId === r.userId), r.startsOn.getUTCFullYear());
      const standIn = r.standInUserId ? names.get(r.standInUserId)?.full ?? null : null;
      /* What the person owns in those days, read for this reader (decision 85, build step 7). */
      const owns = ownedInWords(first, await whatTheyOwnWhileAway(this.prisma, { ...reader, role }, r.userId, r.startsOn, r.endsOn).catch(() => ({ owned: [], hidden: 1 })));
      waiting.push({
        id: r.id,
        name: names.get(r.userId)?.full ?? '',
        startsOn: dayOf(r.startsOn),
        endsOn: dayOf(r.endsOn),
        days,
        daysLeft,
        team,
        alsoOff: [...new Set(alsoOff)],
        standIn,
        mayDecide: decides,
        where: whereItIsOnTheBoard(await this.whereItStands(r, now, decides ? reader.userId : undefined, reader.userId)),
        owns,
        said: aLeaveRequestAsTheApproverReadsIt({
          firstName: first, startsOn: dayOf(r.startsOn), endsOn: dayOf(r.endsOn), days, daysLeft, team,
          alsoOff: [...new Set(alsoOff)], standIn, owns,
        }),
      });
    }

    const from = atMidnight(dayOf(today));
    const to = new Date(from.getTime() + 13 * DAY);
    const off: Off[] = approved
      .filter((r) => inScope(r.userId) || r.userId === reader.userId)
      .filter((r) => overlaps(r, { startsOn: from, endsOn: to }))
      .map((r) => ({ id: r.id, name: names.get(r.userId)?.full ?? '', startsOn: dayOf(r.startsOn), endsOn: dayOf(r.endsOn), kind: 'annual' as const }));

    return { reader: role === 'ADMIN' ? 'admin' : role === 'LEAD' ? 'lead' : 'approver', waiting: waiting.filter((w) => w.name), off: off.filter((o) => o.name) };
  }

  /** Each person's own requests and days left. Nobody else's. */
  async mine(reader: Reader, today = new Date()): Promise<MyLeave> {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    if (!role || role === 'GUEST') throw new ForbiddenException(LEAVE_REFUSED.notInIt);
    const rows = (await this.prisma.leaveRequest.findMany({
      where: { organizationId: reader.organizationId, userId: reader.userId },
      orderBy: { startsOn: 'desc' },
    })) as Row[];
    const names = await this.names(rows);
    const people = await this.directory(reader.organizationId, rows);
    const where = new Map<string, string>();
    for (const r of rows) {
      const now = r.status === 'waiting' ? await this.now(r, people, answers) : null;
      where.set(r.id, whereYourRequestIs(`Your ${leaveInWords(dayOf(r.startsOn), dayOf(r.endsOn))}`, await this.whereItStands(r, now, undefined, reader.userId)));
    }
    return {
      perYear: answers.perYear,
      daysLeft: this.daysLeft(answers.perYear, rows.filter((r) => r.status === 'approved'), today.getUTCFullYear()),
      requests: rows.map((r) => ({
        id: r.id,
        startsOn: dayOf(r.startsOn),
        endsOn: dayOf(r.endsOn),
        days: workingDays(r.startsOn, r.endsOn),
        status: (r.status as 'waiting' | 'approved' | 'declined'),
        standIn: r.standInUserId ? names.get(r.standInUserId)?.full ?? null : null,
        where: where.get(r.id) ?? '',
      })),
    };
  }

  /**
   * The approver of the step it is on decides. Only while it is waiting. An approval at a step that is
   * not the last moves it to the next step, and whoever decides that one is told; only the last step's
   * approval, or a decline at any step, ends it, and then the person who asked is told.
   */
  async decide(reader: Reader, id: string, outcome: 'approved' | 'declined') {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    const row = (await this.prisma.leaveRequest.findUnique({ where: { id } })) as Row | null;
    if (!row || row.organizationId !== reader.organizationId) throw new NotFoundException(LEAVE_REFUSED.notFound);
    const people = await this.directory(reader.organizationId, [row]);
    const now = await this.now(row, people, answers);
    if (row.userId === reader.userId || !decidesIt(now.who, { userId: reader.userId, role }, row.userId)) throw new ForbiddenException(LEAVE_REFUSED.notYours);
    if (row.status !== 'waiting') throw new BadRequestException(LEAVE_REFUSED.alreadyDecided);
    const approvedByIds = [...(row.approvedByIds ?? []), ...(outcome === 'approved' ? [reader.userId] : [])];
    await recordIt(this.prisma, { organizationId: row.organizationId, suite: 'leave', ref: id, kind: outcome, byUserId: reader.userId, step: now.step, basis: { row: 'leave_requests', id } });
    if (outcome === 'approved' && !now.last) {
      const next = { ...row, step: now.step + 1, escalatedTo: 0, stepSince: new Date(), approvedByIds };
      await this.prisma.leaveRequest.update({ where: { id }, data: { step: next.step, escalatedTo: 0, stepSince: next.stepSince, approvedByIds } });
      await this.tellWhoDecides(next, people, answers);
      return this.board(reader);
    }
    await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: outcome, decidedById: reader.userId, decidedAt: new Date(), approvedByIds },
    });
    await this.tellThePerson(row, outcome, reader.userId);
    return this.board(reader);
  }

  /**
   * Who a request waits for now, in words, for the approver who has just approved a step ("Omar in
   * finance"), or null when it no longer waits.
   */
  async nowWaitingFor(organizationId: string, id: string): Promise<string | null> {
    const row = (await this.prisma.leaveRequest.findUnique({ where: { id } }).catch(() => null)) as Row | null;
    if (!row || row.organizationId !== organizationId || row.status !== 'waiting') return null;
    const answers = await this.suiteAnswers(organizationId);
    const now = await this.now(row, await this.directory(organizationId, [row]), answers);
    return whoInWords(this.prisma, now.who, now.team);
  }

  /**
   * Once a day (a-request-waits-too-long.cron.ts): each request that has waited the set number of
   * working days for one person, or whose approver is on approved leave today, moves to the next rule
   * on its step's list, and whoever that names is told. Nothing moves while the admin has set no days.
   */
  async passOnWhatWaitsTooLong(organizationId: string, today = new Date()): Promise<PassedOn[]> {
    const answers = await this.suiteAnswers(organizationId).catch(() => null);
    if (!answers?.workflow?.escalateAfter) return [];
    const rows = (await this.prisma.leaveRequest.findMany({ where: { organizationId, status: 'waiting' } })) as (Row & { askedAt?: Date })[];
    if (!rows.length) return [];
    const people = await this.directory(organizationId, rows);
    const out: PassedOn[] = [];
    for (const r of rows) {
      const n = await whoComesNext(this.prisma, theStepsFor('leave', answers), {
        organizationId, requesterUserId: r.userId,
        managerExternalId: people.get(r.userId)?.managerExternalId ?? null, team: people.get(r.userId)?.department ?? null,
      }, r);
      if (!n) continue;
      const why = await whyPassOn(this.prisma, organizationId, n.now, r.stepSince ?? r.askedAt ?? today, today, answers.workflow.escalateAfter);
      if (!why) continue;
      const moved = { ...r, escalatedTo: n.next.at, stepSince: today };
      await this.prisma.leaveRequest.update({ where: { id: r.id }, data: { escalatedTo: n.next.at, stepSince: today } });
      await recordIt(this.prisma, {
        organizationId, suite: 'leave', ref: r.id, kind: 'escalated', step: n.now.step, toUserId: n.next.who.kind === 'admin' ? null : n.next.who.userId,
        basis: { row: 'leave_requests', id: r.id, fromUserId: n.now.who.kind === 'admin' ? null : n.now.who.userId, ...why },
      });
      await this.tellWhoDecides(moved, people, answers);
      out.push({ ref: r.id, step: n.now.step, from: n.now.who, to: n.next.who, why });
    }
    return out;
  }

  /**
   * One request's record of who did what, in plain sentences (decision 85, build step 5), for the
   * people who may already read it: the person who asked, an admin, a lead of their team, and whoever
   * decides it now. Anybody else is told it was not found.
   */
  async history(reader: Reader, id: string): Promise<{ said: string[] }> {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    const row = (await this.prisma.leaveRequest.findUnique({ where: { id } })) as Row | null;
    if (!row || row.organizationId !== reader.organizationId || !role) throw new NotFoundException(LEAVE_REFUSED.notFound);
    const people = await this.directory(reader.organizationId, [row]);
    const mayRead = row.userId === reader.userId || role === 'ADMIN'
      || (role === 'LEAD' && (await this.theLeadsTeam(reader, people))(row.userId))
      || (row.status === 'waiting' && decidesIt((await this.now(row, people, answers)).who, { userId: reader.userId, role }, row.userId));
    if (!mayRead) throw new NotFoundException(LEAVE_REFUSED.notFound);
    return aRequestsHistory(this.prisma, reader.organizationId, 'leave', id, reader.userId);
  }

  /** Whoever decides the step a request is on is told on WhatsApp (decision 82, item 1). */
  async tellWhoDecides(row: Row, people?: Map<string, any>, answers?: { perYear: number | null; approver: string | null; workflow?: AWorkflow }): Promise<void> {
    if (!this.told) return;
    try {
      const a = answers ?? (await this.suiteAnswers(row.organizationId));
      const now = await this.now(row, people ?? (await this.directory(row.organizationId, [row])), a);
      const first = await this.told.firstNameOf(row.userId);
      await this.told.waiting(row.organizationId, await this.told.approversOf(row.organizationId, now.who, row.userId), aLeaveRequest(row.id, row.userId, first, dayOf(row.startsOn), dayOf(row.endsOn)));
    } catch { /* the request stands */ }
  }

  /** The person who asked is told what was decided, on WhatsApp (decision 82, item 1). True when it went. */
  async tellThePerson(row: { id: string; organizationId: string; userId: string; startsOn: Date; endsOn: Date }, outcome: 'approved' | 'declined', deciderUserId: string): Promise<boolean> {
    if (!this.told) return false;
    const first = await this.told.firstNameOf(row.userId);
    return this.told.decided(row.organizationId, aLeaveRequest(row.id, row.userId, first, dayOf(row.startsOn), dayOf(row.endsOn)), outcome, deciderUserId).catch(() => false);
  }

  /**
   * A request for time off, as the engine will record it once the person has confirmed it
   * (docs/requests-to-engine.md, request 21). There is no route for it: nobody fills in a form.
   */
  async ask(organizationId: string, userId: string, input: { startsOn: Day; endsOn: Day; standInUserId?: string | null; proposalId?: string | null }) {
    await this.suiteAnswers(organizationId);
    const role = await this.roleOf({ userId, organizationId });
    if (!role || role === 'GUEST') throw new ForbiddenException(LEAVE_REFUSED.notInIt);
    const ok = /^\d{4}-\d{2}-\d{2}$/;
    if (!ok.test(input.startsOn ?? '') || !ok.test(input.endsOn ?? '')) throw new BadRequestException(LEAVE_REFUSED.badDates);
    const startsOn = atMidnight(input.startsOn);
    const endsOn = atMidnight(input.endsOn);
    if (Number.isNaN(startsOn.getTime()) || Number.isNaN(endsOn.getTime()) || endsOn < startsOn) throw new BadRequestException(LEAVE_REFUSED.badDates);
    const standIn = input.standInUserId ?? null;
    if (standIn) {
      const theirs = await this.roleOf({ userId: standIn, organizationId });
      if (standIn === userId || !theirs || theirs === 'GUEST') throw new BadRequestException(LEAVE_REFUSED.badStandIn);
    }
    const created = await this.prisma.leaveRequest.create({
      data: { organizationId, userId, startsOn, endsOn, standInUserId: standIn },
      select: { id: true },
    });
    /* One record of who did what (decision 85, build step 5): asked, after the say-back and the yes when there was one. */
    if (created?.id) await recordIt(this.prisma, { organizationId, suite: 'leave', ref: created.id, kind: 'asked', byUserId: userId, basis: { row: 'leave_requests', id: created.id, ...(input.proposalId ? { proposalId: input.proposalId } : {}) } });
    /* Whoever decides the first step is told on WhatsApp too (decision 82, item 1). */
    if (this.told && created?.id) {
      await this.tellWhoDecides({ id: created.id, organizationId, userId, startsOn, endsOn, kind: 'annual', standInUserId: standIn, status: 'waiting', decidedById: null, decidedAt: null });
    }
    return created;
  }

  // ---------------------------------------------------------------------------------------------

  private daysLeft(perYear: number | null, approved: Row[], year: number): number | null {
    if (perYear == null) return null;
    const used = approved.reduce((n, r) => n + workingDaysIn(year, r.startsOn, r.endsOn), 0);
    return Math.max(0, perYear - used);
  }

  /** Who decides this request now, from the step it is on, by the one approval resolver (who-may-decide.ts). */
  private now(r: Row, people: Map<string, any>, answers: { approver: string | null; workflow?: AWorkflow }): Promise<DecidesNow> {
    return whoDecidesNow(this.prisma, theStepsFor('leave', answers), {
      organizationId: r.organizationId, requesterUserId: r.userId,
      managerExternalId: people.get(r.userId)?.managerExternalId ?? null, team: people.get(r.userId)?.department ?? null,
    }, r);
  }

  /** Who approved it so far, who it waits for now and who declined it, as names; "you" for the reader. */
  private async whereItStands(r: Row, now: DecidesNow | null, readerDecides: string | undefined, readerUserId: string): Promise<WhereItStands> {
    const approvedBy = await firstNamesOf(this.prisma, approversOf(r), readerUserId);
    const status = r.status as WhereItStands['status'];
    return {
      status, approvedBy,
      waitingFor: status === 'waiting' && now ? (readerDecides ? 'you' : await whoInWords(this.prisma, now.who, now.team, readerUserId)) : null,
      declinedBy: status === 'declined' && r.decidedById ? (await firstNamesOf(this.prisma, [r.decidedById], readerUserId))[0] ?? null : null,
    };
  }

  private async theLeadsTeam(reader: Reader, people: Map<string, { externalId: string; department: string | null; managerExternalId: string | null }>) {
    const me = await theirRosterEntry(this.prisma, reader.organizationId, reader.userId, { externalId: true, department: true });
    return (userId: string) => {
      const p = people.get(userId);
      return !!me && !!p && inTheLeadsTeam(me, p);
    };
  }

  private async suiteAnswers(organizationId: string): Promise<{ perYear: number | null; approver: string | null; workflow?: AWorkflow }> {
    const suite = await this.prisma.organizationSuite.findUnique({
      where: { organizationId_suite: { organizationId, suite: 'leave' } },
      select: { isOn: true, answers: true },
    });
    if (!suite?.isOn) throw new NotFoundException(LEAVE_REFUSED.notOn);
    const a = (suite.answers ?? {}) as Record<string, unknown>;
    return {
      perYear: typeof a.days === 'number' ? a.days : null,
      approver: typeof a.approver === 'string' ? a.approver : null,
      /* The steps an admin set (the-approval-steps.ts). None: one step, as before. */
      workflow: await readWorkflow(this.prisma, organizationId, 'leave'),
    };
  }

  private async roleOf(reader: Reader): Promise<string | null> {
    const m = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: reader.userId, organizationId: reader.organizationId } },
      select: { role: true },
    });
    return m?.role ?? null;
  }

  /** The directory entry of each person a request is about, by user id. */
  private async directory(organizationId: string, rows: Row[]) {
    /* Linked entries, and entries matched to their sign-in by address (a-roster-entry-and-its-sign-in.ts). */
    const ps = await theirRosterEntries(this.prisma, organizationId, rows.map((r) => r.userId), { externalId: true, department: true, managerExternalId: true });
    return new Map([...ps].map(([userId, p]) => [userId, { externalId: p.externalId as string, department: p.department as string | null, managerExternalId: p.managerExternalId as string | null }]));
  }

  /** First and full names, for the people and the stand-ins on these requests. Never an address. */
  private async names(rows: Row[]) {
    const ids = [...new Set(rows.flatMap((r) => [r.userId, r.standInUserId]).filter((x): x is string => !!x))];
    const us = ids.length
      ? await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    return new Map(us.map((u) => [u.id, {
      first: u.firstName?.trim() || '',
      full: [u.firstName, u.lastName].filter(Boolean).join(' ').trim(),
    }]));
  }
}
