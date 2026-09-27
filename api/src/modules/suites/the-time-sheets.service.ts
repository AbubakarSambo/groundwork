import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { inTheLeadsTeam } from './a-leads-team';
import { mayApprove } from './who-approves';

/** The words the server says when it refuses, in plain full sentences. */
export const TIME_REFUSED = {
  notOn: 'The time sheets suite is not switched on.',
  onlyAdminsAndLeads: 'Only an admin or a lead can open this board.',
  notInIt: 'Only people in this organisation have time sheets here.',
  notYours: 'Only the person who approves these hours can approve them.',
  nothingToApprove: 'There are no hours to approve for that week.',
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
  people: { personId: string; name: string; minutes: Record<string, number>; total: number; approved: boolean; mayApprove: boolean }[];
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
 *   - each person reads only their own hours (`mine`);
 *   - a colleague and a guest are refused the board.
 * WHO APPROVES follows the admin's answer when they switched the suite on (who-approves.ts). A week is
 * approved with the total the approver saw; hours added later make it wait again.
 */
@Injectable()
export class TimeSheetsService {
  constructor(private readonly prisma: PrismaService) {}

  async board(reader: Reader, today = new Date()): Promise<{ thisWeek: Day; weeks: AWeek[]; agreements: Agreement[] | null }> {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    if (role !== 'ADMIN' && role !== 'LEAD') throw new ForbiddenException(TIME_REFUSED.onlyAdminsAndLeads);

    const thisWeek = mondayOf(today);
    const from = new Date(thisWeek.getTime() - WEEKS_BACK * 7 * DAY);
    const entries = (await this.prisma.timeEntry.findMany({
      where: { organizationId: reader.organizationId, onDay: { gte: from } },
      select: { userId: true, client: true, onDay: true, minutes: true },
    })) as Entry[];
    const people = await this.directory(reader.organizationId, entries.map((e) => e.userId));
    const inScope = role === 'ADMIN' ? () => true : await this.theLeadsTeam(reader, people);
    const mine = entries.filter((e) => e.userId !== reader.userId && inScope(e.userId));

    const approvals = await this.prisma.timeWeek.findMany({
      where: { organizationId: reader.organizationId, weekOf: { gte: from } },
      select: { userId: true, weekOf: true, approvedMinutes: true },
    });
    const approvedAt = new Map(approvals.map((a) => [`${dayOf(a.weekOf)}|${a.userId}`, a.approvedMinutes]));
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
        rows.push({
          personId: userId, name, minutes, total,
          approved: approvedAt.get(`${w}|${userId}`) === total,
          mayApprove: await mayApprove(this.prisma, {
            organizationId: reader.organizationId, readerId: reader.userId, readerRole: role, personUserId: userId,
            approver: answers.approver, managerExternalId: people.get(userId)?.managerExternalId ?? null,
          }),
        });
      }
      rows.sort((a, b) => a.name.localeCompare(b.name));
      const current = w === dayOf(thisWeek);
      if (current || rows.some((r) => !r.approved)) weeks.push({ weekOf: w, clients: order, people: rows });
    }

    return { thisWeek: dayOf(thisWeek), weeks, agreements: role === 'ADMIN' ? await this.agreements(reader.organizationId, today) : null };
  }

  /** The approver approves one person's week, with the total they saw. */
  async approve(reader: Reader, personId: string, weekOf: Day, today = new Date()) {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekOf ?? '')) throw new BadRequestException(TIME_REFUSED.nothingToApprove);
    const monday = mondayOf(atMidnight(weekOf));
    const people = await this.directory(reader.organizationId, [personId]);
    const ok = await mayApprove(this.prisma, {
      organizationId: reader.organizationId, readerId: reader.userId, readerRole: role, personUserId: personId,
      approver: answers.approver, managerExternalId: people.get(personId)?.managerExternalId ?? null,
    });
    if (!ok) throw new ForbiddenException(TIME_REFUSED.notYours);
    const entries = await this.prisma.timeEntry.findMany({
      where: { organizationId: reader.organizationId, userId: personId, onDay: { gte: monday, lt: new Date(monday.getTime() + 7 * DAY) } },
      select: { minutes: true },
    });
    const total = entries.reduce((n, e) => n + e.minutes, 0);
    if (total === 0) throw new BadRequestException(TIME_REFUSED.nothingToApprove);
    await this.prisma.timeWeek.upsert({
      where: { organizationId_userId_weekOf: { organizationId: reader.organizationId, userId: personId, weekOf: monday } },
      create: { organizationId: reader.organizationId, userId: personId, weekOf: monday, approvedMinutes: total, approvedById: reader.userId },
      update: { approvedMinutes: total, approvedById: reader.userId, approvedAt: new Date() },
    });
    return this.board(reader, today);
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
    const approvals = await this.prisma.timeWeek.findMany({
      where: { organizationId: reader.organizationId, userId: reader.userId, weekOf: { gte: from } },
      select: { weekOf: true, approvedMinutes: true },
    });
    const weeks = [...new Set(entries.map((e) => dayOf(mondayOf(e.onDay))))].sort().reverse().map((w) => {
      const es = entries.filter((e) => dayOf(mondayOf(e.onDay)) === w);
      const minutes: Record<string, number> = {};
      for (const c of this.clientOrder(answers.clients, es)) minutes[c] = es.filter((e) => e.client === c).reduce((n, e) => n + e.minutes, 0);
      const total = es.reduce((n, e) => n + e.minutes, 0);
      return { weekOf: w, minutes, total, approved: approvals.some((a) => dayOf(a.weekOf) === w && a.approvedMinutes === total) };
    });
    return { weeks };
  }

  /**
   * Hours somebody gave, as the engine will record them once the person has confirmed them
   * (docs/requests-to-engine.md, request 22). There is no route: "There is no grid to fill in."
   */
  async record(organizationId: string, userId: string, entries: { client: string; onDay: Day; hours: number }[]) {
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
    return { recorded: rows.length };
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

  private async suiteAnswers(organizationId: string): Promise<{ clients: string[]; approver: string | null }> {
    const suite = await this.prisma.organizationSuite.findUnique({
      where: { organizationId_suite: { organizationId, suite: 'time' } },
      select: { isOn: true, answers: true },
    });
    if (!suite?.isOn) throw new NotFoundException(TIME_REFUSED.notOn);
    const a = (suite.answers ?? {}) as Record<string, unknown>;
    return {
      clients: Array.isArray(a.clients) ? a.clients.filter((c): c is string => typeof c === 'string') : [],
      approver: typeof a.approver === 'string' ? a.approver : null,
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
    const ids = [...new Set(userIds)];
    const ps = ids.length
      ? await this.prisma.person.findMany({
          where: { organizationId, linkedUserId: { in: ids }, active: true },
          select: { linkedUserId: true, externalId: true, department: true, managerExternalId: true },
        })
      : [];
    return new Map(ps.map((p) => [p.linkedUserId as string, { externalId: p.externalId, department: p.department, managerExternalId: p.managerExternalId }]));
  }

  private async theLeadsTeam(reader: Reader, people: Map<string, { externalId: string; department: string | null; managerExternalId: string | null }>) {
    const me = await this.prisma.person.findFirst({
      where: { organizationId: reader.organizationId, linkedUserId: reader.userId, active: true },
      select: { externalId: true, department: true },
    });
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
