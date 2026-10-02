import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { theirRosterEntry, withTheirSignIns } from './a-roster-entry-and-its-sign-in';
import { inTheLeadsTeam } from './a-leads-team';
import { couldBeNamed, decidesIt, everyStepFor, theStepsFor, whoDecidesNow, type DecidesNow } from './who-may-decide';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';
import { aSpendRequest, spendInWords, whereItIsOnTheBoard, whereYourRequestIs, type WhereItStands } from './a-request-in-words';
import { firstNamesOf, readWorkflow, whoInWords, type AWorkflow } from './the-approval-steps';

/** The words the server says when it refuses, in plain full sentences. */
export const SPEND_REFUSED = {
  notOn: 'The spending suite is not switched on.',
  onlyAdminsAndLeads: 'Only an admin or a lead can open this board.',
  onlyAnAdmin: 'Only an admin can set a budget.',
  notInIt: 'Only people in this organisation can ask to spend here.',
  notFound: 'That request was not found.',
  notYours: 'Only the person who approves this request can decide it.',
  alreadyDecided: 'This request has already been decided.',
  badAmount: 'Give an amount of more than nothing.',
  badWhat: 'Say what the money is for.',
  badTeam: 'Choose a team from your staff directory.',
  badBudget: 'Give a budget of nothing or more.',
};

export interface Reader { userId: string; organizationId: string }

/** Who approves one request: the person's lead, a named person (or the holder of the team's budget or finance) because it is over the limit, or an admin. */
export type Approver = { kind: 'manager' } | { kind: 'person'; firstName: string } | { kind: 'admin' };

export interface Waiting {
  id: string;
  name: string;
  firstName: string;
  amount: number;
  what: string;
  team: string | null;
  /** What the team has left this month before this request, when it has a budget. */
  left: number | null;
  /** Over the most a manager may approve on their own. */
  over: boolean;
  approver: Approver;
  /** Whether this reader is the one who approves it. */
  mayDecide: boolean;
  /** Where it is, in a full sentence for this reader: "Wairimu has approved it, and it is now waiting for you." */
  where: string;
}

/** The person's own requests to spend (`mine`), newest first. */
export interface MySpending {
  currency: string | null;
  requests: {
    id: string; amount: number; what: string; status: 'waiting' | 'approved' | 'declined'; askedOn: string;
    /** Where it is, in a full sentence: "Your request to spend KES 12,000 for fuel is approved by Wairimu and is now waiting for Omar in finance." */
    where: string;
  }[];
}

export interface SpendBoard {
  /**
   * Who this board is served to: an admin, a lead, or somebody who reads it only because a request
   * over the limit waits for them to decide ("approver"). An approver is served only the requests
   * they decide, with what each one's team has left, and no budgets or teams.
   */
  reader: 'admin' | 'lead' | 'approver';
  currency: string | null;
  limit: number | null;
  waiting: Waiting[];
  /** Each team's budget this month against what was approved this month. */
  budgets: { team: string; budget: number; spent: number; left: number }[];
  /** For an admin only: the teams in the directory, to set a budget for. Empty for a lead. */
  teams: string[];
}

type Dir = { externalId: string; linkedUserId: string | null; department: string | null; managerExternalId: string | null };
type Row = {
  id: string; organizationId: string; userId: string; amount: unknown; what: string; team: string | null; status: string; createdAt: Date;
  decidedById?: string | null;
  /* Where it is among the approval steps (decision 85, build step 4). Rows read before steps existed have none: step one. */
  step?: number | null; escalatedTo?: number | null; stepSince?: Date | null; approvedByIds?: string[] | null;
};
type Answers = { currency: string | null; limit: number | null; above: string | null; workflow?: AWorkflow };

/** Who approved the steps so far. A request decided before steps were kept names only who decided it. */
const approversOf = (r: Row): string[] =>
  r.approvedByIds?.length ? r.approvedByIds : r.status === 'approved' && r.decidedById ? [r.decidedById] : [];

const monthOf = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const n = (x: unknown) => Number(x ?? 0);

/**
 * SPENDING AND BUDGETS (E7, #/suite/spend, U.17). Who reads and decides what is decided here, never on
 * the screen:
 *   - nobody, while the suite is off;
 *   - an admin reads every request waiting and every team's budget, and sets the budgets;
 *   - a lead reads their own team's requests (a-leads-team.ts) and their team's budgets, and also any
 *     request from another team that waits for them to decide;
 *   - a member named for anything over the limit, or holding a team's budget or finance
 *     (who-holds-each-duty.ts), opens the board as an approver, and reads only the
 *     requests that wait for them, each with what its team has left, never the budgets or the teams;
 *   - any other member, and a guest, are refused the board; nobody reads their own request here as waiting.
 * WHO APPROVES follows the admin's answers when they switched the suite on: up to "the most a manager
 * may approve on their own", the person's lead in the directory (when that lead is a lead or an admin
 * here), otherwise an admin; above it, whoever holds the requester's team's budget, then whoever looks
 * after finance, then the person the admin named (who-holds-each-duty.ts). Nobody approves their own.
 *
 * GROUNDWORK'S OWN BACK OFFICE ALSO HAS SPENDING (`OpsExpense`), but it is Groundwork's own books, with
 * no organisation on a row, so it is not reused: customers' requests could never be kept apart from
 * ours. The rule it keeps, that nobody approves their own spend, is kept here too.
 *
 * People ask by telling Groundwork, which is the engine's part (request 26): `check` says what the
 * budget has left and who would approve, so the request can be said back first, and `ask` records it
 * once the person has confirmed. There is no form. Nothing here reaches a check-in or its report.
 */
@Injectable()
export class SpendingService {
  constructor(
    private readonly prisma: PrismaService,
    /* Tells the approver, and then the person, on WhatsApp (decision 82, item 1). Optional so a test built by hand still runs. */
    @Optional() private readonly told?: ARequestToldOnWhatsApp,
  ) {}

  async board(reader: Reader, today = new Date()): Promise<SpendBoard> {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    /*
     * The person named for anything over the limit decides those requests, whatever their role or
     * department (bug 1 of docs/suites-against-the-workflow-model.md). A member named there opens the
     * board as an approver and is served only what waits for them; anybody else who is not an admin
     * or a lead is refused, as before.
     */
    const asApprover = role !== 'ADMIN' && role !== 'LEAD';
    if (asApprover && !(role === 'MEMBER' && (await this.approvesOverTheLimit(reader.organizationId, reader.userId, answers)))) throw new ForbiddenException(SPEND_REFUSED.onlyAdminsAndLeads);
    const org = reader.organizationId;
    const month = monthOf(today);

    const dir = await this.directory(org);
    const byUser = new Map([...dir.values()].filter((p) => p.linkedUserId).map((p) => [p.linkedUserId as string, p]));
    const me = byUser.get(reader.userId) ?? null;
    const inScope = (userId: string) => role === 'ADMIN' || (role === 'LEAD' && !!me && !!byUser.get(userId) && inTheLeadsTeam(me, byUser.get(userId)!));
    const myTeams = new Set<string>();
    if (role === 'LEAD' && me) {
      if (me.department?.trim()) myTeams.add(me.department.trim());
      for (const p of dir.values()) if (inTheLeadsTeam(me, p) && p.department?.trim()) myTeams.add(p.department.trim());
    }
    const teamInScope = (team: string) => role === 'ADMIN' || myTeams.has(team);

    const [rows, budgets] = await Promise.all([
      this.prisma.spendRequest.findMany({
        where: { organizationId: org, OR: [{ status: 'waiting' }, { status: 'approved', createdAt: { gte: month } }] },
        orderBy: { createdAt: 'asc' },
      }) as Promise<Row[]>,
      this.prisma.teamBudget.findMany({ where: { organizationId: org, month }, select: { team: true, amount: true } }),
    ]);
    const spent = new Map<string, number>();
    for (const r of rows) if (r.status === 'approved' && r.team && r.createdAt >= month) spent.set(r.team, (spent.get(r.team) ?? 0) + n(r.amount));
    const budgetOf = new Map(budgets.map((b) => [b.team, n(b.amount)]));
    const leftOf = (team: string | null) => (team && budgetOf.has(team) ? budgetOf.get(team)! - (spent.get(team) ?? 0) : null);

    const names = await this.names(rows.map((r) => r.userId));
    const waiting: Waiting[] = [];
    for (const r of rows.filter((x) => x.status === 'waiting' && x.userId !== reader.userId)) {
      const now = await this.now(org, r, answers, byUser);
      const who = now.who.kind === 'admin' ? { kind: 'admin' as const } : { kind: now.who.kind === 'manager' ? 'manager' as const : 'person' as const, userId: now.who.userId };
      const decides = this.mayDecide(reader, role, r, who);
      /* A lead reads their own team's requests, and also any request that waits for them to decide. */
      if (!inScope(r.userId) && !decides) continue;
      const nm = names.get(r.userId);
      if (!nm?.full) continue;
      waiting.push({
        id: r.id, name: nm.full, firstName: nm.first, amount: n(r.amount), what: r.what, team: r.team,
        left: leftOf(r.team),
        over: answers.limit != null && n(r.amount) > answers.limit,
        approver: who.kind === 'person' ? { kind: 'person', firstName: (await this.names([who.userId])).get(who.userId)?.first ?? '' } : { kind: who.kind },
        mayDecide: decides,
        where: whereItIsOnTheBoard(await this.whereItStands(r, now, decides, reader.userId)),
      });
    }

    return {
      reader: role === 'ADMIN' ? 'admin' : role === 'LEAD' ? 'lead' : 'approver',
      currency: answers.currency,
      limit: answers.limit,
      waiting,
      budgets: budgets.filter((b) => !asApprover && teamInScope(b.team)).map((b) => ({ team: b.team, budget: n(b.amount), spent: spent.get(b.team) ?? 0, left: leftOf(b.team)! }))
        .sort((a, b) => a.team.localeCompare(b.team)),
      teams: role === 'ADMIN' ? [...new Set([...dir.values()].map((p) => p.department?.trim()).filter((t): t is string => !!t))].sort() : [],
    };
  }

  /**
   * The one who approves the step it is on says yes or no. Only while it is waiting. A yes at a step
   * that is not the last moves it to the next step, and whoever decides that one is told; only the last
   * step's yes, or a no at any step, ends it, and then the person who asked is told.
   */
  async decide(reader: Reader, id: string, outcome: 'approved' | 'declined', today = new Date()) {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    const r = (await this.prisma.spendRequest.findUnique({ where: { id } })) as Row | null;
    if (!r || r.organizationId !== reader.organizationId) throw new NotFoundException(SPEND_REFUSED.notFound);
    const dir = await this.directory(reader.organizationId);
    const byUser = new Map([...dir.values()].filter((p) => p.linkedUserId).map((p) => [p.linkedUserId as string, p]));
    const now = await this.now(reader.organizationId, r, answers, byUser);
    if (r.userId === reader.userId || !decidesIt(now.who, { userId: reader.userId, role }, r.userId)) throw new ForbiddenException(SPEND_REFUSED.notYours);
    if (r.status !== 'waiting') throw new BadRequestException(SPEND_REFUSED.alreadyDecided);
    const approvedByIds = [...(r.approvedByIds ?? []), ...(outcome === 'approved' ? [reader.userId] : [])];
    if (outcome === 'approved' && !now.last) {
      const next = { ...r, step: now.step + 1, escalatedTo: 0, stepSince: new Date(), approvedByIds };
      await this.prisma.spendRequest.update({ where: { id }, data: { step: next.step, escalatedTo: 0, stepSince: next.stepSince, approvedByIds } });
      await this.tellWhoDecides(next, answers);
      return this.board(reader, today);
    }
    await this.prisma.spendRequest.update({ where: { id }, data: { status: outcome, decidedById: reader.userId, decidedAt: new Date(), approvedByIds } });
    await this.tellThePerson(r, answers.currency, outcome, reader.userId);
    return this.board(reader, today);
  }

  /** The person's own requests to spend, each with where it is. Nobody else's. */
  async mine(reader: Reader): Promise<MySpending> {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    if (!role || role === 'GUEST') throw new ForbiddenException(SPEND_REFUSED.notInIt);
    const rows = (await this.prisma.spendRequest.findMany({
      where: { organizationId: reader.organizationId, userId: reader.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })) as Row[];
    const dir = await this.directory(reader.organizationId);
    const byUser = new Map([...dir.values()].filter((p) => p.linkedUserId).map((p) => [p.linkedUserId as string, p]));
    const requests: MySpending['requests'] = [];
    for (const r of rows) {
      const now = r.status === 'waiting' ? await this.now(reader.organizationId, r, answers, byUser) : null;
      requests.push({
        id: r.id, amount: n(r.amount), what: r.what, status: r.status as 'waiting' | 'approved' | 'declined', askedOn: r.createdAt.toISOString().slice(0, 10),
        where: whereYourRequestIs(`Your request to spend ${spendInWords(n(r.amount), answers.currency, r.what)}`, await this.whereItStands(r, now, false, reader.userId)),
      });
    }
    return { currency: answers.currency, requests };
  }

  /** Who a request waits for now, in words ("Omar in finance"), or null when it no longer waits. */
  async nowWaitingFor(organizationId: string, id: string): Promise<string | null> {
    const r = (await this.prisma.spendRequest.findUnique({ where: { id } }).catch(() => null)) as Row | null;
    if (!r || r.organizationId !== organizationId || r.status !== 'waiting') return null;
    const answers = await this.suiteAnswers(organizationId);
    const dir = await this.directory(organizationId);
    const byUser = new Map([...dir.values()].filter((p) => p.linkedUserId).map((p) => [p.linkedUserId as string, p]));
    const now = await this.now(organizationId, r, answers, byUser);
    return whoInWords(this.prisma, now.who, now.team);
  }

  /** Whoever decides the step a request is on is told on WhatsApp (decision 82, item 1). */
  async tellWhoDecides(r: Row, answers?: Answers): Promise<void> {
    if (!this.told) return;
    try {
      const a = answers ?? (await this.suiteAnswers(r.organizationId));
      const dir = await this.directory(r.organizationId);
      const byUser = new Map([...dir.values()].filter((p) => p.linkedUserId).map((p) => [p.linkedUserId as string, p]));
      const now = await this.now(r.organizationId, r, a, byUser);
      const first = await this.told.firstNameOf(r.userId);
      await this.told.waiting(r.organizationId, await this.told.approversOf(r.organizationId, now.who, r.userId), aSpendRequest(r.id, r.userId, first, n(r.amount), a.currency, r.what));
    } catch { /* the request stands */ }
  }

  /** An admin sets one team's budget for this month. */
  async setBudget(reader: Reader, input: { team?: unknown; amount?: unknown }, today = new Date()) {
    await this.suiteAnswers(reader.organizationId);
    if ((await this.roleOf(reader)) !== 'ADMIN') throw new ForbiddenException(SPEND_REFUSED.onlyAnAdmin);
    const teams = new Set([...(await this.directory(reader.organizationId)).values()].map((p) => p.department?.trim()).filter(Boolean));
    const team = typeof input.team === 'string' ? input.team.trim() : '';
    if (!team || !teams.has(team)) throw new BadRequestException(SPEND_REFUSED.badTeam);
    const amount = typeof input.amount === 'string' && input.amount.trim() !== '' ? Number(input.amount) : input.amount;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || amount > 1e12) throw new BadRequestException(SPEND_REFUSED.badBudget);
    const month = monthOf(today);
    await this.prisma.teamBudget.upsert({
      where: { organizationId_team_month: { organizationId: reader.organizationId, team, month } },
      create: { organizationId: reader.organizationId, team, month, amount, setById: reader.userId },
      update: { amount, setById: reader.userId },
    });
    return this.board(reader, today);
  }

  /**
   * For the engine, before a request is said back (request 26): the team it counts against, what that
   * team has left this month, and who would approve it. Only the person's own request, so nothing
   * about anybody else's spending is told to them beyond what their team has left.
   */
  async check(organizationId: string, userId: string, amount: number, today = new Date()) {
    const answers = await this.suiteAnswers(organizationId);
    const role = await this.roleOf({ userId, organizationId });
    if (!role || role === 'GUEST') throw new ForbiddenException(SPEND_REFUSED.notInIt);
    const dir = await this.directory(organizationId);
    const byUser = new Map([...dir.values()].filter((p) => p.linkedUserId).map((p) => [p.linkedUserId as string, p]));
    const team = byUser.get(userId)?.department?.trim() || null;
    let left: number | null = null;
    if (team) {
      const month = monthOf(today);
      const budget = await this.prisma.teamBudget.findUnique({ where: { organizationId_team_month: { organizationId, team, month } }, select: { amount: true } });
      if (budget) {
        const approved = await this.prisma.spendRequest.findMany({ where: { organizationId, team, status: 'approved', createdAt: { gte: month } }, select: { amount: true } });
        left = n(budget.amount) - approved.reduce((t, r) => t + n(r.amount), 0);
      }
    }
    const who = await this.approverOf(organizationId, { userId, amount } as any, answers, byUser, dir);
    return { currency: answers.currency, team, left, fits: left == null ? null : amount <= left, approver: who.kind };
  }

  /**
   * For the engine's say-back (week 22): what `check` gives, and also the most a lead may approve on
   * their own and who exactly would approve, so the person is told before the yes if it is over a rule.
   */
  async checkForChat(organizationId: string, userId: string, amount: number, today = new Date()) {
    const checked = await this.check(organizationId, userId, amount, today);
    const answers = await this.suiteAnswers(organizationId);
    const dir = await this.directory(organizationId);
    const byUser = new Map([...dir.values()].filter((p) => p.linkedUserId).map((p) => [p.linkedUserId as string, p]));
    const who = await this.approverOf(organizationId, { userId, amount } as any, answers, byUser, dir);
    const approverId = who.kind === 'admin' ? null : who.userId;
    const first = approverId ? (await this.names([approverId])).get(approverId)?.first || null : null;
    /* What the same team has already asked for this month and is still waiting on: one total, never whose. */
    let waiting: number | null = null;
    if (checked.team && checked.left != null) {
      const rows = await this.prisma.spendRequest.findMany({ where: { organizationId, team: checked.team, status: 'waiting', createdAt: { gte: monthOf(today) } }, select: { amount: true } });
      waiting = rows.reduce((t, r) => t + n(r.amount), 0);
    }
    return { ...checked, waiting, limit: answers.limit, approverFirstName: first };
  }

  /** A request to spend, as the engine records it once the person has confirmed it (request 26). No route. */
  async ask(organizationId: string, userId: string, input: { amount: number; what: string }) {
    await this.suiteAnswers(organizationId);
    const role = await this.roleOf({ userId, organizationId });
    if (!role || role === 'GUEST') throw new ForbiddenException(SPEND_REFUSED.notInIt);
    if (typeof input.amount !== 'number' || !Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 1e12) throw new BadRequestException(SPEND_REFUSED.badAmount);
    const what = (input.what ?? '').trim().slice(0, 300);
    if (!what) throw new BadRequestException(SPEND_REFUSED.badWhat);
    const person = await theirRosterEntry(this.prisma, organizationId, userId, { department: true });
    const team = person?.department?.trim() || null;
    const created = await this.prisma.spendRequest.create({
      data: { organizationId, userId, amount: input.amount, what, team },
      select: { id: true },
    });
    /* Whoever decides the first step is told on WhatsApp too (decision 82, item 1): the lead, the person named for over the limit, or the admins. */
    if (this.told && created?.id) {
      await this.tellWhoDecides({ id: created.id, organizationId, userId, amount: input.amount, what, team, status: 'waiting', createdAt: new Date() });
    }
    return created;
  }

  /** The person who asked is told what was decided, on WhatsApp (decision 82, item 1). True when it went. */
  async tellThePerson(r: { id: string; organizationId: string; userId: string; amount: unknown; what: string }, currency: string | null, outcome: 'approved' | 'declined', deciderUserId: string): Promise<boolean> {
    if (!this.told) return false;
    const first = await this.told.firstNameOf(r.userId);
    return this.told.decided(r.organizationId, aSpendRequest(r.id, r.userId, first, n(r.amount), currency, r.what), outcome, deciderUserId).catch(() => false);
  }

  // ---------------------------------------------------------------------------------------------

  /**
   * Who approves one request, by the one approval resolver (who-may-decide.ts). Over the limit:
   * whoever holds the budget of the requester's team, then whoever looks after finance, then the
   * person the admin named, then an admin. Up to the limit: the requester's line manager, or an admin.
   * Never the requester, and never a guest or somebody no longer in the organisation.
   */
  private async approverOf(
    organizationId: string, r: { userId: string; amount: unknown; team?: string | null; step?: number | null; escalatedTo?: number | null },
    answers: Answers,
    byUser: Map<string, Dir>, _dir: Map<string, Dir>,
  ): Promise<{ kind: 'manager' | 'person'; userId: string } | { kind: 'admin' }> {
    const { who } = await this.now(organizationId, r, answers, byUser);
    return who.kind === 'admin' ? { kind: 'admin' } : { kind: who.kind, userId: who.userId };
  }

  /** Who decides a request now, from the step it is on (a new request is on step one). */
  private now(
    organizationId: string, r: { userId: string; amount: unknown; team?: string | null; step?: number | null; escalatedTo?: number | null },
    answers: Answers, byUser: Map<string, Dir>,
  ): Promise<DecidesNow> {
    return whoDecidesNow(this.prisma, theStepsFor('spend', answers, n(r.amount)), {
      organizationId, requesterUserId: r.userId,
      managerExternalId: byUser.get(r.userId)?.managerExternalId ?? null,
      team: r.team?.trim() || byUser.get(r.userId)?.department?.trim() || null,
    }, r);
  }

  /** Who approved it so far, who it waits for now and who declined it, as names; "you" for the reader. */
  private async whereItStands(r: Row, now: DecidesNow | null, readerDecides: boolean, readerUserId: string): Promise<WhereItStands> {
    const status = r.status as WhereItStands['status'];
    return {
      status,
      approvedBy: await firstNamesOf(this.prisma, approversOf(r), readerUserId),
      waitingFor: status === 'waiting' && now ? (readerDecides ? 'you' : await whoInWords(this.prisma, now.who, now.team, readerUserId)) : null,
      declinedBy: status === 'declined' && r.decidedById ? (await firstNamesOf(this.prisma, [r.decidedById], readerUserId))[0] ?? null : null,
    };
  }

  /**
   * Whether this person could be named to decide some request without being an admin or a lead's
   * manager: named over the limit, holding a team's budget or finance, or any duty in the steps an
   * admin set.
   */
  private async approvesOverTheLimit(organizationId: string, userId: string, answers: Answers): Promise<boolean> {
    const role = await this.roleOf({ userId, organizationId });
    return couldBeNamed(this.prisma, everyStepFor('spend', answers).filter((s) => s !== 'admin' && s !== 'manager'), organizationId, { userId, role });
  }

  private mayDecide(reader: Reader, role: string | null, r: { userId: string }, who: { kind: string; userId?: string }): boolean {
    if (r.userId === reader.userId) return false;
    if (who.kind === 'admin') return role === 'ADMIN';
    return who.userId === reader.userId;
  }

  private async suiteAnswers(organizationId: string): Promise<Answers> {
    const suite = await this.prisma.organizationSuite.findUnique({
      where: { organizationId_suite: { organizationId, suite: 'spend' } },
      select: { isOn: true, answers: true },
    });
    if (!suite?.isOn) throw new NotFoundException(SPEND_REFUSED.notOn);
    const a = (suite.answers ?? {}) as Record<string, unknown>;
    return {
      currency: typeof a.currency === 'string' ? a.currency : null,
      limit: typeof a.limit === 'number' ? a.limit : null,
      above: typeof a.above === 'string' ? a.above : null,
      /* The steps an admin set (the-approval-steps.ts). None: one step, as before. */
      workflow: await readWorkflow(this.prisma, organizationId, 'spend'),
    };
  }

  private async roleOf(reader: Reader): Promise<string | null> {
    const m = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: reader.userId, organizationId: reader.organizationId } },
      select: { role: true },
    });
    return m?.role ?? null;
  }

  private async directory(organizationId: string): Promise<Map<string, Dir>> {
    const ps = await this.prisma.person.findMany({
      where: { organizationId, active: true },
      select: { externalId: true, linkedUserId: true, email: true, department: true, managerExternalId: true },
    });
    /* `linkedUserId` here is the entry's sign-in, linked or matched by address (a-roster-entry-and-its-sign-in.ts). */
    const signed = await withTheirSignIns(this.prisma, organizationId, ps);
    return new Map(signed.map((p) => [p.externalId, { externalId: p.externalId, linkedUserId: p.userId, department: p.department, managerExternalId: p.managerExternalId }]));
  }

  /** First and full names. Never an address. */
  private async names(ids: string[]) {
    const unique = [...new Set(ids)];
    const us = unique.length
      ? await this.prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    return new Map(us.map((u) => [u.id, { first: u.firstName?.trim() || '', full: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() }]));
  }
}
