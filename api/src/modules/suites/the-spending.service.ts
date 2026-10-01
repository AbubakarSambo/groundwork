import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { inTheLeadsTeam } from './a-leads-team';
import { whoApprovesFor } from './who-approves';

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

/** Who approves one request: the person's lead, a named person because it is over the limit, or an admin. */
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
}

export interface SpendBoard {
  currency: string | null;
  limit: number | null;
  waiting: Waiting[];
  /** Each team's budget this month against what was approved this month. */
  budgets: { team: string; budget: number; spent: number; left: number }[];
  /** For an admin only: the teams in the directory, to set a budget for. Empty for a lead. */
  teams: string[];
}

type Dir = { externalId: string; linkedUserId: string | null; department: string | null; managerExternalId: string | null };
type Row = { id: string; organizationId: string; userId: string; amount: unknown; what: string; team: string | null; status: string; createdAt: Date };

const monthOf = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const n = (x: unknown) => Number(x ?? 0);

/**
 * SPENDING AND BUDGETS (E7, #/suite/spend, U.17). Who reads and decides what is decided here, never on
 * the screen:
 *   - nobody, while the suite is off;
 *   - an admin reads every request waiting and every team's budget, and sets the budgets;
 *   - a lead reads only their own team's requests (a-leads-team.ts) and their team's budgets;
 *   - a member and a guest are refused the board; nobody reads their own request here as waiting.
 * WHO APPROVES follows the admin's answers when they switched the suite on: up to "the most a manager
 * may approve on their own", the person's lead in the directory (when that lead is a lead or an admin
 * here), otherwise an admin; above it, the person the admin named. Nobody approves their own.
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
  constructor(private readonly prisma: PrismaService) {}

  async board(reader: Reader, today = new Date()): Promise<SpendBoard> {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    if (role !== 'ADMIN' && role !== 'LEAD') throw new ForbiddenException(SPEND_REFUSED.onlyAdminsAndLeads);
    const org = reader.organizationId;
    const month = monthOf(today);

    const dir = await this.directory(org);
    const byUser = new Map([...dir.values()].filter((p) => p.linkedUserId).map((p) => [p.linkedUserId as string, p]));
    const me = byUser.get(reader.userId) ?? null;
    const inScope = (userId: string) => role === 'ADMIN' || (!!me && !!byUser.get(userId) && inTheLeadsTeam(me, byUser.get(userId)!));
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
    for (const r of rows.filter((x) => x.status === 'waiting' && x.userId !== reader.userId && inScope(x.userId))) {
      const who = await this.approverOf(org, r, answers, byUser, dir);
      const nm = names.get(r.userId);
      if (!nm?.full) continue;
      waiting.push({
        id: r.id, name: nm.full, firstName: nm.first, amount: n(r.amount), what: r.what, team: r.team,
        left: leftOf(r.team),
        over: answers.limit != null && n(r.amount) > answers.limit,
        approver: who.kind === 'person' ? { kind: 'person', firstName: (await this.names([who.userId])).get(who.userId)?.first ?? '' } : { kind: who.kind },
        mayDecide: this.mayDecide(reader, role, r, who),
      });
    }

    return {
      currency: answers.currency,
      limit: answers.limit,
      waiting,
      budgets: budgets.filter((b) => teamInScope(b.team)).map((b) => ({ team: b.team, budget: n(b.amount), spent: spent.get(b.team) ?? 0, left: leftOf(b.team)! }))
        .sort((a, b) => a.team.localeCompare(b.team)),
      teams: role === 'ADMIN' ? [...new Set([...dir.values()].map((p) => p.department?.trim()).filter((t): t is string => !!t))].sort() : [],
    };
  }

  /** The one who approves says yes or no. Only while it is waiting. */
  async decide(reader: Reader, id: string, outcome: 'approved' | 'declined', today = new Date()) {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    const r = (await this.prisma.spendRequest.findUnique({ where: { id } })) as Row | null;
    if (!r || r.organizationId !== reader.organizationId) throw new NotFoundException(SPEND_REFUSED.notFound);
    const dir = await this.directory(reader.organizationId);
    const byUser = new Map([...dir.values()].filter((p) => p.linkedUserId).map((p) => [p.linkedUserId as string, p]));
    if (!this.mayDecide(reader, role, r, await this.approverOf(reader.organizationId, r, answers, byUser, dir))) throw new ForbiddenException(SPEND_REFUSED.notYours);
    if (r.status !== 'waiting') throw new BadRequestException(SPEND_REFUSED.alreadyDecided);
    await this.prisma.spendRequest.update({ where: { id }, data: { status: outcome, decidedById: reader.userId, decidedAt: new Date() } });
    return this.board(reader, today);
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
    const person = await this.prisma.person.findFirst({ where: { organizationId, linkedUserId: userId, active: true }, select: { department: true } });
    return this.prisma.spendRequest.create({
      data: { organizationId, userId, amount: input.amount, what, team: person?.department?.trim() || null },
      select: { id: true },
    });
  }

  // ---------------------------------------------------------------------------------------------

  private async approverOf(
    organizationId: string, r: { userId: string; amount: unknown },
    answers: { limit: number | null; above: string | null },
    byUser: Map<string, Dir>, dir: Map<string, Dir>,
  ): Promise<{ kind: 'manager' | 'person'; userId: string } | { kind: 'admin' }> {
    if (answers.limit != null && n(r.amount) > answers.limit) {
      if (answers.above && answers.above !== r.userId) return { kind: 'person', userId: answers.above };
      return { kind: 'admin' };
    }
    const lead = await whoApprovesFor(this.prisma, { organizationId, personUserId: r.userId, managerExternalId: byUser.get(r.userId)?.managerExternalId ?? null });
    if (lead.kind === 'manager') return { kind: 'manager', userId: lead.userId };
    return { kind: 'admin' };
  }

  private mayDecide(reader: Reader, role: string | null, r: { userId: string }, who: { kind: string; userId?: string }): boolean {
    if (r.userId === reader.userId) return false;
    if (who.kind === 'admin') return role === 'ADMIN';
    return who.userId === reader.userId;
  }

  private async suiteAnswers(organizationId: string): Promise<{ currency: string | null; limit: number | null; above: string | null }> {
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
      select: { externalId: true, linkedUserId: true, department: true, managerExternalId: true },
    });
    return new Map(ps.map((p) => [p.externalId, p]));
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
