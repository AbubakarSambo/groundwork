import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { inTheLeadsTeam } from './a-leads-team';
import { mayApprove } from './who-approves';
import { withTheirSignIns } from './a-roster-entry-and-its-sign-in';
import { isProposedByGroundwork, theProposalSentence } from './a-review-falls-due';
import { whatGroundworkNoticed } from './the-review-noticed-from-the-record';
import { monthsToDrawOn, theFirstCheckInOf, theOpenDecisionsAbout, whereItStandsSaid, type Stands } from './where-a-review-stands';
import { SuggestionsService } from '../suggestions/suggestions.service';
import type { ForTheLead } from '../suggestions/a-suggestion-told-like-a-signal';
import { AReviewToldOnWhatsApp } from './a-review-told-on-whatsapp.service';
import {
  recogniseForThePerson, recogniseForTheWriter, theRecordForRecognising, theWriterMayReadIt,
  type RecogniseForThePerson, type RecogniseForTheWriter,
} from './a-review-may-suggest-recognising';

/** The words the server says when it refuses, in plain full sentences. */
export const REVIEW_REFUSED = {
  notOn: 'The performance reviews suite is not switched on.',
  onlyAdminsAndLeads: 'Only an admin or a lead can open this board.',
  notFound: 'That review was not found.',
  notYours: 'You cannot open this review.',
  onlyTheWriter: 'Only the person who writes this review with them can do this.',
  onlyThePerson: 'Only the person this review is about can write their own view.',
  alreadyStarted: 'This review has already been started.',
  notYet: 'This review cannot start yet, because a check-in that decides something about this person is still open. It can start once that check-in is decided.',
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
  /** 'not-yet' while a check-in that decides something about the person is still open (where-a-review-stands.ts). */
  stands: Stands;
  /** Where it stands, in the prototype's words: "Ready to start. 6 months of check-ins to draw on." */
  standsSays: string;
  reviewId: string | null;
  mayStart: boolean;
  /**
   * Said when Groundwork proposed this review itself, in plain words, so whoever runs it reads why it
   * is here and that nothing goes to the person until they say yes. Null when the organisation's own
   * system set the date.
   */
  proposal: string | null;
}

/**
 * One of the person's own reviews, as they find it: only once somebody has started it (a proposal is
 * never told to them, a-review-falls-due.ts), with what they can do now, in a plain sentence.
 */
export interface YourReview {
  id: string;
  dueOn: Day;
  writtenWithFirstName: string | null;
  stands: 'started' | 'decided';
  says: string;
}

/** What the person reads about their own review. Nothing of what it says, only that it waits for them. */
export function yourReviewSaid(stands: 'started' | 'decided', writerFirstName: string | null, hasTheirView: boolean): string {
  const who = writerFirstName?.trim() || 'The person who writes it with you';
  if (stands === 'decided') return `${who} has decided your review. You can read the decision and the reasons.`;
  return hasTheirView
    ? `${who} has started your review, and your own view is in it. You can read it and change your view before you meet.`
    : `${who} has started your review. You can read it and add your own view before you meet.`;
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
  /**
   * Groundwork's suggestion about this person, when one was reached on a check-in this reader runs,
   * and the person has had their turn. No count, no verdict, never a rating. Null for anybody else.
   */
  suggestion: ForTheLead | null;
  /**
   * "Groundwork suggests recognising Aisha’s work", for the writer alone, with no number behind it, once
   * Aisha has had her turn (a-review-may-suggest-recognising.ts). Null for a lead or an admin who does
   * not write it, while the setting is off, and when the record does not reach the line.
   */
  recognise: RecogniseForTheWriter | null;
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
  /** Their own count, the line, and who decides, when Groundwork suggests recognising their work. Absent otherwise. */
  recognise?: RecogniseForThePerson;
}

const dayOf = (d: Date): Day => d.toISOString().slice(0, 10);
const DAY = 86_400_000;

/**
 * `userId` is the person's sign-in: the link, or the one account in this organisation with the same
 * email, through the one place leave, hours and spending ask too (a-roster-entry-and-its-sign-in.ts).
 */
type Person = { externalId: string; userId: string | null; linkedUserId: string | null; email: string | null; displayName: string | null; givenName: string | null; familyName: string | null; department: string | null; managerExternalId: string | null };

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
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly suggestions?: SuggestionsService,
    /* Last and optional, so the specs that build this with one argument keep working. */
    @Optional() private readonly toldOnWhatsApp?: AReviewToldOnWhatsApp,
  ) {}

  async board(reader: Reader, today = new Date()): Promise<{ every: string | null; next: NextReview[] }> {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    if (role !== 'ADMIN' && role !== 'LEAD') throw new ForbiddenException(REVIEW_REFUSED.onlyAdminsAndLeads);
    const dues = await this.prisma.evaluationDue.findMany({
      where: { organizationId: reader.organizationId, dueOn: { gte: new Date(today.getTime() - 90 * DAY), lte: new Date(today.getTime() + 365 * DAY) } },
      orderBy: { dueOn: 'asc' },
      select: { id: true, personExternalId: true, dueOn: true, source: true },
    });
    const directory = await this.directory(reader.organizationId);
    const me = [...directory.values()].find((p) => p.userId === reader.userId) ?? null;
    const reviews = await this.prisma.performanceReview.findMany({
      where: { organizationId: reader.organizationId, evaluationDueId: { in: dues.map((d) => d.id) } },
      select: { id: true, evaluationDueId: true, decidedAt: true, startedAt: true },
    });
    const byDue = new Map(reviews.map((r) => [r.evaluationDueId, r]));
    const signIns = dues.map((d) => directory.get(d.personExternalId)?.userId).filter((u): u is string => !!u);
    const [openDecisions, firstCheckIns] = await Promise.all([
      theOpenDecisionsAbout(this.prisma, reader.organizationId, signIns),
      theFirstCheckInOf(this.prisma, reader.organizationId, signIns),
    ]);
    const next: NextReview[] = [];
    for (const d of dues) {
      const p = directory.get(d.personExternalId);
      if (!p || p.userId === reader.userId) continue;
      if (role === 'LEAD' && !(me && inTheLeadsTeam(me, p))) continue;
      const r = byDue.get(d.id);
      const manager = p.managerExternalId ? directory.get(p.managerExternalId) : null;
      const waitingFor = !r && p.userId ? openDecisions.get(p.userId) ?? null : null;
      const stands: Stands = r ? (r.decidedAt ? 'decided' : 'started') : waitingFor ? 'not-yet' : 'ready';
      next.push({
        dueId: d.id,
        name: this.nameOf(p),
        writtenWith: manager ? this.nameOf(manager) : null,
        dueOn: dayOf(d.dueOn),
        stands,
        standsSays: whereItStandsSaid({
          stands, firstName: this.firstOf(p), readerUserId: reader.userId, waitingFor,
          months: monthsToDrawOn(p.userId ? firstCheckIns.get(p.userId) : null, today),
          startedAt: (r as any)?.startedAt ?? null, decidedAt: r?.decidedAt ?? null,
        }),
        reviewId: r?.id ?? null,
        mayStart: stands === 'ready' && (await this.writes(reader, role, p, answers.writer)),
        proposal: stands === 'ready' && isProposedByGroundwork(d.source) ? theProposalSentence(d.source, this.firstOf(p)) : null,
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
    /* Never two decisions about one person at once (where-a-review-stands.ts). */
    if (p.userId && (await theOpenDecisionsAbout(this.prisma, reader.organizationId, [p.userId])).has(p.userId)) {
      throw new BadRequestException(REVIEW_REFUSED.notYet);
    }
    /* Written once, when the writer says yes, from the record and nothing else (the-review-noticed-from-the-record.ts). */
    const noticed = await whatGroundworkNoticed(this.prisma, reader.organizationId, p.userId).catch(() => []);
    const r = await this.prisma.performanceReview.create({
      data: {
        organizationId: reader.organizationId, evaluationDueId: due.id, personExternalId: due.personExternalId, startedById: reader.userId,
        ...(noticed.length ? { noticed: noticed as any } : {}),
      },
      select: { id: true },
    });
    /* The person is told it waits for them in the app; nothing of it goes to the phone. */
    await this.toldOnWhatsApp?.toThePerson(reader.organizationId, p.userId, reader.userId, 'started').catch(() => false);
    return { id: r.id };
  }

  /**
   * THE PERSON'S OWN REVIEWS (item 16). Before this, a review was read only by its id, which nobody gave
   * the person, so Aisha could not find the review the prototype says she "sees before the meeting". Only
   * reviews about this reader, only once started, and only what one() already serves them is said.
   */
  async mine(reader: Reader): Promise<YourReview[]> {
    await this.suiteAnswers(reader.organizationId);
    const directory = await this.directory(reader.organizationId);
    const me = [...directory.values()].find((p) => p.userId === reader.userId);
    if (!me) return [];
    const rows = await this.prisma.performanceReview.findMany({
      where: { organizationId: reader.organizationId, personExternalId: me.externalId },
      select: { id: true, evaluationDueId: true, theirView: true, decidedAt: true, decision: true, decisionReasons: true },
    });
    const manager = me.managerExternalId ? directory.get(me.managerExternalId) ?? null : null;
    const writer = manager ? this.firstOf(manager) : null;
    const out: YourReview[] = [];
    for (const r of rows) {
      const due = await this.prisma.evaluationDue.findUnique({ where: { id: r.evaluationDueId }, select: { dueOn: true } });
      if (!due) continue;
      const stands = r.decidedAt && r.decision && r.decisionReasons ? 'decided' : 'started';
      out.push({ id: r.id, dueOn: dayOf(due.dueOn), writtenWithFirstName: writer, stands, says: yourReviewSaid(stands, writer, !!r.theirView?.trim()) });
    }
    return out.sort((a, b) => b.dueOn.localeCompare(a.dueOn));
  }

  /** One review, as this reader may read it. */
  async one(reader: Reader, id: string): Promise<ForTheWriter | ForThePerson> {
    const answers = await this.suiteAnswers(reader.organizationId);
    const { row, person, directory } = await this.theReview(reader, id);
    const role = await this.roleOf(reader);
    const manager = person.managerExternalId ? directory.get(person.managerExternalId) ?? null : null;
    const decision = row.decision && row.decisionReasons ? { says: row.decision, reasons: row.decisionReasons } : null;
    const dueOn = dayOf(row.due.dueOn);

    /* Read up to the day the review started, so it says the same whenever it is opened. */
    const recognising = await theRecordForRecognising(this.prisma, {
      organizationId: reader.organizationId, personUserId: person.userId, writerUserId: row.startedById, startedAt: (row as any).startedAt,
    }).catch(() => null);
    if (person.userId === reader.userId) {
      return {
        reader: 'person', id: row.id, firstName: this.firstOf(person), writtenWithFirstName: manager ? this.firstOf(manager) : null,
        dueOn, noticed: this.noticedOf(row.noticed, true), theirView: row.theirView ?? null, decision,
        ...(recognising ? { recognise: recogniseForThePerson(recognising, manager ? this.firstOf(manager) : null) } : {}),
      };
    }
    const writes = await this.writes(reader, role, person, answers.writer);
    const me = [...directory.values()].find((p) => p.userId === reader.userId) ?? null;
    const readsIt = writes || role === 'ADMIN' || (role === 'LEAD' && !!me && inTheLeadsTeam(me, person));
    if (!readsIt) throw new ForbiddenException(REVIEW_REFUSED.notYours);
    const suggestion = writes && person.userId && this.suggestions
      ? await this.suggestions.latestForTheLeadAbout(person.userId, reader).catch(() => null)
      : null;
    return {
      reader: writes ? 'writer' : role === 'ADMIN' ? 'admin' : 'lead',
      id: row.id, name: this.nameOf(person), firstName: this.firstOf(person),
      writtenWith: manager ? this.nameOf(manager) : null, writtenWithFirstName: manager ? this.firstOf(manager) : null,
      dueOn, noticed: this.noticedOf(row.noticed, writes), managersWords: row.managersWords ?? null, theirView: row.theirView ?? null, decision, mayWrite: writes, suggestion,
      recognise: writes && recognising && theWriterMayReadIt({ theirView: row.theirView ?? null, startedAt: (row as any).startedAt }) ? recogniseForTheWriter(this.firstOf(person), recognising) : null,
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
    if (person.userId !== reader.userId) throw new ForbiddenException(REVIEW_REFUSED.onlyThePerson);
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
    /* Told once, the first time it is decided; a reason corrected later is not a second message. */
    if (!row.decidedAt) await this.toldOnWhatsApp?.toThePerson(reader.organizationId, person.userId, reader.userId, 'decided').catch(() => false);
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
      personUserId: p.userId ?? `person:${p.externalId}`, approver: writer, managerExternalId: p.managerExternalId,
    });
  }

  /** Only lines the engine marked, and only the two marks a person may read. */
  private noticedOf(raw: unknown, mayReadPrivate: boolean): Noticed[] {
    if (!Array.isArray(raw)) return [];
    return raw
      /* A line from an evaluation check-in is for the writer and the person only (the-review-noticed-from-the-record.ts). */
      .filter((x: any) => x && typeof x.says === 'string' && x.says.trim() && (x.mark === 'proven' || x.mark === 'said') && (mayReadPrivate || !x.private))
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
      select: { externalId: true, linkedUserId: true, email: true, displayName: true, givenName: true, familyName: true, department: true, managerExternalId: true },
    });
    /* Who each entry signs in as, matched the same way everywhere (decision 82). */
    const withSignIns = await withTheirSignIns(this.prisma, organizationId, ps);
    return new Map(withSignIns.map((p) => [p.externalId, p]));
  }

  private nameOf(p: Person): string {
    return p.displayName?.trim() || [p.givenName, p.familyName].filter(Boolean).join(' ').trim();
  }

  private firstOf(p: Person): string {
    return p.givenName?.trim() || this.nameOf(p).split(/\s+/)[0] || '';
  }
}
