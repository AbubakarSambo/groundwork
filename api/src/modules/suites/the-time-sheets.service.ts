import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { theirRosterEntries, theirRosterEntry } from './a-roster-entry-and-its-sign-in';
import { inTheLeadsTeam } from './a-leads-team';
import { mayApproveFor, whoApprovesFor } from './who-approves';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';
import { anHoursRequest } from './a-request-in-words';

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
  people: { personId: string; name: string; minutes: Record<string, number>; total: number; approved: boolean; mayApprove: boolean; /** The days of this week that have hours, so a sentence can say which. */ days: Day[] }[];
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
 * WHO APPROVES is the person's line manager in the staff directory, or an admin when there is none (who-approves.ts). A week is
 * approved with the total the approver saw; hours added later make it wait again.
 */
@Injectable()
export class TimeSheetsService {
  constructor(
    private readonly prisma: PrismaService,
    /* Tells the approver, and then the person, on WhatsApp (decision 82, item 1). Optional so a test built by hand still runs. */
    @Optional() private readonly told?: ARequestToldOnWhatsApp,
  ) {}

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
          days: [...new Set(theirs.map((e) => dayOf(e.onDay)))].sort(),
          approved: approvedAt.get(`${w}|${userId}`) === total,
          mayApprove: await mayApproveFor(this.prisma, {
            organizationId: reader.organizationId, readerId: reader.userId, readerRole: role, personUserId: userId,
            managerExternalId: people.get(userId)?.managerExternalId ?? null,
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
    const ok = await mayApproveFor(this.prisma, {
      organizationId: reader.organizationId, readerId: reader.userId, readerRole: role, personUserId: personId,
      managerExternalId: people.get(personId)?.managerExternalId ?? null,
    });
    if (!ok) throw new ForbiddenException(TIME_REFUSED.notYours);
    const entries = await this.prisma.timeEntry.findMany({
      where: { organizationId: reader.organizationId, userId: personId, onDay: { gte: monday, lt: new Date(monday.getTime() + 7 * DAY) } },
      select: { minutes: true, client: true, onDay: true },
    });
    const total = entries.reduce((n, e) => n + e.minutes, 0);
    if (total === 0) throw new BadRequestException(TIME_REFUSED.nothingToApprove);
    await this.prisma.timeWeek.upsert({
      where: { organizationId_userId_weekOf: { organizationId: reader.organizationId, userId: personId, weekOf: monday } },
      create: { organizationId: reader.organizationId, userId: personId, weekOf: monday, approvedMinutes: total, approvedById: reader.userId },
      update: { approvedMinutes: total, approvedById: reader.userId, approvedAt: new Date() },
    });
    await this.tellThePerson(reader.organizationId, personId, monday, entries as Entry[], reader.userId);
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
   * For the engine's say-back (week 21): the clients and projects on the admin's list and the first
   * name of the person who would approve these hours (null when it is an admin). Reads no hours.
   */
  async forChat(organizationId: string, userId: string): Promise<{ clients: string[]; approverFirstName: string | null }> {
    const answers = await this.suiteAnswers(organizationId);
    const role = await this.roleOf({ userId, organizationId });
    if (!role || role === 'GUEST') throw new ForbiddenException(TIME_REFUSED.notInIt);
    const who = await whoApprovesFor(this.prisma, { organizationId, personUserId: userId });
    return { clients: answers.clients, approverFirstName: who.kind === 'manager' ? who.firstName : null };
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
    /* The one who approves is told on WhatsApp too (decision 82, item 1). */
    if (this.told) {
      try {
        const who = await whoApprovesFor(this.prisma, { organizationId, personUserId: userId });
        const first = await this.told.firstNameOf(userId);
        await this.told.waiting(organizationId, await this.told.approversOf(organizationId, who, userId), this.inWords(userId, first, rows));
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
    /* Linked entries, and entries matched to their sign-in by address (a-roster-entry-and-its-sign-in.ts). */
    const ps = await theirRosterEntries(this.prisma, organizationId, userIds, { externalId: true, department: true, managerExternalId: true });
    return new Map([...ps].map(([userId, p]) => [userId, { externalId: p.externalId as string, department: p.department as string | null, managerExternalId: p.managerExternalId as string | null }]));
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
