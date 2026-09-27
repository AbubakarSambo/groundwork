import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { inTheLeadsTeam } from './a-leads-team';
import { mayApprove } from './who-approves';

/** The words the server says when it refuses, in plain full sentences. */
export const REVIEW_REFUSED = {
  notOn: 'The performance reviews suite is not switched on.',
  onlyAdminsAndLeads: 'Only an admin or a lead can open this board.',
  notFound: 'That review was not found.',
  notYours: 'You cannot open this review.',
  onlyTheWriter: 'Only the person who writes this review with them can do this.',
  onlyThePerson: 'Only the person this review is about can write their own view.',
  alreadyStarted: 'This review has already been started.',
  writeSomething: 'Write something first.',
  sayWhatAndWhy: 'Say what you decided, and why, in a sentence or two.',
};

export interface Reader { userId: string; organizationId: string }
type Day = string;

/** One line of "What Groundwork noticed", as the engine writes it: proven, or only said. */
export interface Noticed { says: string; mark: 'proven' | 'said' }

export interface NextReview {
  dueId: string;
  name: string;
  writtenWith: string | null;
  dueOn: Day;
  stands: 'ready' | 'started' | 'decided';
  reviewId: string | null;
  mayStart: boolean;
}

/** The whole review, for whoever writes it with the person, their lead or an admin. */
export interface ForTheWriter {
  reader: 'writer' | 'lead' | 'admin';
  id: string;
  name: string;
  firstName: string;
  writtenWith: string | null;
  writtenWithFirstName: string | null;
  dueOn: Day;
  noticed: Noticed[];
  managersWords: string | null;
  theirView: string | null;
  decision: { says: string; reasons: string } | null;
  mayWrite: boolean;
}

/** The person's own review: the facts, their own view, and the decision with its reasons. */
export interface ForThePerson {
  reader: 'person';
  id: string;
  firstName: string;
  writtenWithFirstName: string | null;
  dueOn: Day;
  noticed: Noticed[];
  theirView: string | null;
  decision: { says: string; reasons: string } | null;
}

const dayOf = (d: Date): Day => d.toISOString().slice(0, 10);
const DAY = 86_400_000;

type Person = { externalId: string; linkedUserId: string | null; displayName: string | null; givenName: string | null; familyName: string | null; department: string | null; managerExternalId: string | null };

/**
 * PERFORMANCE REVIEWS (E4, #/suite/reviews, U.17). Built from what exists: the reviews that fall due
 * (`EvaluationDue`, the table the daily reminder reads, set by the organisation's own system), the
 * staff directory (who manages whom), and what people write here. "What Groundwork noticed" and any
 * suggestion are the engine's (request 23), shown only when written.
 *
 * WHO READS WHAT, decided here and never on the screen (decisions rule 6):
 *   - nobody, while the suite is off;
 *   - an admin reads every review; a lead only their own team's (a-leads-team.ts);
 *   - the person who writes it with them (the organisation's answer: "Their manager" or "An admin",
 *     through who-approves.ts) starts it, writes their own words, and decides with reasons;
 *   - the person it is about reads the facts, their own view, and the decision with its reasons,
 *     and writes their own view; never a verdict, a label, or how their answers were rated;
 *   - a colleague and a guest are refused.
 * Hours and leave never feed a review (decisions rule 10): nothing here reads them.
 */
@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async board(reader: Reader, today = new Date()): Promise<{ every: string | null; next: NextReview[] }> {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    if (role !== 'ADMIN' && role !== 'LEAD') throw new ForbiddenException(REVIEW_REFUSED.onlyAdminsAndLeads);
    const dues = await this.prisma.evaluationDue.findMany({
      where: { organizationId: reader.organizationId, dueOn: { gte: new Date(today.getTime() - 90 * DAY), lte: new Date(today.getTime() + 365 * DAY) } },
      orderBy: { dueOn: 'asc' },
      select: { id: true, personExternalId: true, dueOn: true },
    });
    const directory = await this.directory(reader.organizationId);
    const me = [...directory.values()].find((p) => p.linkedUserId === reader.userId) ?? null;
    const reviews = await this.prisma.performanceReview.findMany({
      where: { organizationId: reader.organizationId, evaluationDueId: { in: dues.map((d) => d.id) } },
      select: { id: true, evaluationDueId: true, decidedAt: true },
    });
    const byDue = new Map(reviews.map((r) => [r.evaluationDueId, r]));
    const next: NextReview[] = [];
    for (const d of dues) {
      const p = directory.get(d.personExternalId);
      if (!p || p.linkedUserId === reader.userId) continue;
      if (role === 'LEAD' && !(me && inTheLeadsTeam(me, p))) continue;
      const r = byDue.get(d.id);
      const manager = p.managerExternalId ? directory.get(p.managerExternalId) : null;
      next.push({
        dueId: d.id,
        name: this.nameOf(p),
        writtenWith: manager ? this.nameOf(manager) : null,
        dueOn: dayOf(d.dueOn),
        stands: !r ? 'ready' : r.decidedAt ? 'decided' : 'started',
        reviewId: r?.id ?? null,
        mayStart: !r && (await this.writes(reader, role, p, answers.writer)),
      });
    }
    return { every: answers.every, next: next.filter((n) => n.name) };
  }

  /** The person who writes it with them starts it. */
  async start(reader: Reader, dueId: string) {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    const due = await this.prisma.evaluationDue.findUnique({ where: { id: dueId }, select: { id: true, organizationId: true, personExternalId: true } });
    if (!due || due.organizationId !== reader.organizationId) throw new NotFoundException(REVIEW_REFUSED.notFound);
    const p = (await this.directory(reader.organizationId)).get(due.personExternalId);
    if (!p || !(await this.writes(reader, role, p, answers.writer))) throw new ForbiddenException(REVIEW_REFUSED.onlyTheWriter);
    const existing = await this.prisma.performanceReview.findUnique({ where: { evaluationDueId: due.id }, select: { id: true } });
    if (existing) throw new BadRequestException(REVIEW_REFUSED.alreadyStarted);
    const r = await this.prisma.performanceReview.create({
      data: { organizationId: reader.organizationId, evaluationDueId: due.id, personExternalId: due.personExternalId, startedById: reader.userId },
      select: { id: true },
    });
    return { id: r.id };
  }

  /** One review, as this reader may read it. */
  async one(reader: Reader, id: string): Promise<ForTheWriter | ForThePerson> {
    const answers = await this.suiteAnswers(reader.organizationId);
    const { row, person, directory } = await this.theReview(reader, id);
    const role = await this.roleOf(reader);
    const manager = person.managerExternalId ? directory.get(person.managerExternalId) ?? null : null;
    const noticed = this.noticedOf(row.noticed);
    const decision = row.decision && row.decisionReasons ? { says: row.decision, reasons: row.decisionReasons } : null;
    const dueOn = dayOf(row.due.dueOn);

    if (person.linkedUserId === reader.userId) {
      return {
        reader: 'person', id: row.id, firstName: this.firstOf(person), writtenWithFirstName: manager ? this.firstOf(manager) : null,
        dueOn, noticed, theirView: row.theirView ?? null, decision,
      };
    }
    const writes = await this.writes(reader, role, person, answers.writer);
    const me = [...directory.values()].find((p) => p.linkedUserId === reader.userId) ?? null;
    const readsIt = writes || role === 'ADMIN' || (role === 'LEAD' && !!me && inTheLeadsTeam(me, person));
    if (!readsIt) throw new ForbiddenException(REVIEW_REFUSED.notYours);
    return {
      reader: writes ? 'writer' : role === 'ADMIN' ? 'admin' : 'lead',
      id: row.id, name: this.nameOf(person), firstName: this.firstOf(person),
      writtenWith: manager ? this.nameOf(manager) : null, writtenWithFirstName: manager ? this.firstOf(manager) : null,
      dueOn, noticed, managersWords: row.managersWords ?? null, theirView: row.theirView ?? null, decision, mayWrite: writes,
    };
  }

  /** The writer's own words. */
  async writeWords(reader: Reader, id: string, words: string) {
    const answers = await this.suiteAnswers(reader.organizationId);
    const { row, person } = await this.theReview(reader, id);
    if (!(await this.writes(reader, await this.roleOf(reader), person, answers.writer))) throw new ForbiddenException(REVIEW_REFUSED.onlyTheWriter);
    const text = (words ?? '').trim();
    if (!text) throw new BadRequestException(REVIEW_REFUSED.writeSomething);
    await this.prisma.performanceReview.update({ where: { id: row.id }, data: { managersWords: text.slice(0, 4000), managersWordsById: reader.userId, managersWordsAt: new Date() } });
    return this.one(reader, id);
  }

  /** The person's own view of their work. */
  async writeView(reader: Reader, id: string, view: string) {
    await this.suiteAnswers(reader.organizationId);
    const { row, person } = await this.theReview(reader, id);
    if (person.linkedUserId !== reader.userId) throw new ForbiddenException(REVIEW_REFUSED.onlyThePerson);
    const text = (view ?? '').trim();
    if (!text) throw new BadRequestException(REVIEW_REFUSED.writeSomething);
    await this.prisma.performanceReview.update({ where: { id: row.id }, data: { theirView: text.slice(0, 4000), theirViewAt: new Date() } });
    return this.one(reader, id);
  }

  /** The writer decides, with reasons. The person reads both. */
  async decide(reader: Reader, id: string, input: { decision?: string; reasons?: string }) {
    const answers = await this.suiteAnswers(reader.organizationId);
    const { row, person } = await this.theReview(reader, id);
    if (!(await this.writes(reader, await this.roleOf(reader), person, answers.writer))) throw new ForbiddenException(REVIEW_REFUSED.onlyTheWriter);
    const says = (input.decision ?? '').trim();
    const reasons = (input.reasons ?? '').trim();
    if (!says || !reasons) throw new BadRequestException(REVIEW_REFUSED.sayWhatAndWhy);
    await this.prisma.performanceReview.update({
      where: { id: row.id },
      data: { decision: says.slice(0, 1000), decisionReasons: reasons.slice(0, 2000), decidedById: reader.userId, decidedAt: new Date() },
    });
    return this.one(reader, id);
  }

  // ---------------------------------------------------------------------------------------------

  private async theReview(reader: Reader, id: string) {
    const row = await this.prisma.performanceReview.findUnique({ where: { id } });
    if (!row || row.organizationId !== reader.organizationId) throw new NotFoundException(REVIEW_REFUSED.notFound);
    const due = await this.prisma.evaluationDue.findUnique({ where: { id: row.evaluationDueId }, select: { dueOn: true } });
    const directory = await this.directory(reader.organizationId);
    const person = directory.get(row.personExternalId);
    if (!due || !person) throw new NotFoundException(REVIEW_REFUSED.notFound);
    return { row: { ...row, due }, person, directory };
  }

  /** Whether this reader writes the review with this person, by the organisation's answer. */
  private writes(reader: Reader, role: string | null, p: Person, writer: string | null): Promise<boolean> {
    return mayApprove(this.prisma, {
      organizationId: reader.organizationId, readerId: reader.userId, readerRole: role,
      personUserId: p.linkedUserId ?? `person:${p.externalId}`, approver: writer, managerExternalId: p.managerExternalId,
    });
  }

  /** Only lines the engine marked, and only the two marks a person may read. */
  private noticedOf(raw: unknown): Noticed[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((x: any) => x && typeof x.says === 'string' && x.says.trim() && (x.mark === 'proven' || x.mark === 'said'))
      .map((x: any) => ({ says: x.says.trim(), mark: x.mark }))
      .sort((a, b) => (a.mark === b.mark ? 0 : a.mark === 'proven' ? -1 : 1));
  }

  private async suiteAnswers(organizationId: string): Promise<{ every: string | null; writer: string | null }> {
    const suite = await this.prisma.organizationSuite.findUnique({
      where: { organizationId_suite: { organizationId, suite: 'reviews' } },
      select: { isOn: true, answers: true },
    });
    if (!suite?.isOn) throw new NotFoundException(REVIEW_REFUSED.notOn);
    const a = (suite.answers ?? {}) as Record<string, unknown>;
    return { every: typeof a.every === 'string' ? a.every : null, writer: typeof a.writer === 'string' ? a.writer : null };
  }

  private async roleOf(reader: Reader): Promise<string | null> {
    const m = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: reader.userId, organizationId: reader.organizationId } },
      select: { role: true },
    });
    return m?.role ?? null;
  }

  private async directory(organizationId: string): Promise<Map<string, Person>> {
    const ps = await this.prisma.person.findMany({
      where: { organizationId, active: true },
      select: { externalId: true, linkedUserId: true, displayName: true, givenName: true, familyName: true, department: true, managerExternalId: true },
    });
    return new Map(ps.map((p) => [p.externalId, p]));
  }

  private nameOf(p: Person): string {
    return p.displayName?.trim() || [p.givenName, p.familyName].filter(Boolean).join(' ').trim();
  }

  private firstOf(p: Person): string {
    return p.givenName?.trim() || this.nameOf(p).split(/\s+/)[0] || '';
  }
}
