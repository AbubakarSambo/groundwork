import { notToldYet } from '../grounds/a-goal-not-told-stays-with-the-lead';
import { answersUnderTheQuestionsOwnIds } from './the-answers-under-the-questions-own-ids';
import { suiteOf } from './the-ten-suites';
import { thisSuiteIsOff } from './a-suite-that-is-off-says-what-to-do';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { inTheLeadsTeam } from './a-leads-team';
import { aRequestsHistory, recordIt } from './a-request-is-recorded';
import { couldBeNamed, decidesIt, everyRuleIn, theOneWhoDecides, theStepsFor, type WhoDecides } from './who-may-decide';
import { withTheirSignIns } from './a-roster-entry-and-its-sign-in';
import { isProposedByGroundwork, theProposalSentence } from './a-review-falls-due';
import { whatGroundworkNoticed } from './the-review-noticed-from-the-record';
import {
  A_LINE_WAS_CORRECTED, aRecordLineSaid, mayReadTheLine, thePartOf, thePartsHeading, thePeriodSaid, theRecordForAReview, theReviewsPeriodFrom, theStoredRecord,
  type ARecordLine, type ARecordPart, type WhatTheReaderIsIn,
} from './the-record-read-for-a-review';
import { monthsToDrawOn, theFirstCheckInOf, theOpenDecisionsAbout, whereItStandsSaid, type Stands } from './where-a-review-stands';
import { SuggestionsService } from '../suggestions/suggestions.service';
import { PATTERNS_NOTE, theBriefingsHeading, theCountsSaid, theEarlierReviews, theOneWhoDecidesSaid, thePatternsForTheBriefing, whoDecidesTheReview, type ABriefing } from './a-review-briefing';
import type { ForTheLead } from '../suggestions/a-suggestion-told-like-a-signal';
import { AReviewToldOnWhatsApp } from './a-review-told-on-whatsapp.service';
import { AReviewAppealToldService } from './a-review-appeal-told.service';
import {
  APPEAL_OUTCOMES, APPEAL_REFUSED, aDaySaid, theAdditions, theAdminReadsSaid, theReviewerReadsSaid, wasAppealDecided, wasAppealed,
  yourAppealSaid, youMayAppealSaid, type AppealStands,
} from './a-review-appeal';
import {
  recogniseForAnotherReader, recogniseForThePerson, recogniseForTheWriter, theRecordForRecognising, theWriterMayReadIt,
  type RecogniseForThePerson, type RecogniseForTheWriter,
} from './a-review-may-suggest-recognising';

/** The words the server says when it refuses, in plain full sentences. */
export const REVIEW_REFUSED = {
  notOn: thisSuiteIsOff('The performance reviews suite'),
  onlyAdminsAndLeads: 'Only an admin or a lead can open this board.',
  notFound: 'That review was not found.',
  notYours: 'You cannot open this review.',
  onlyTheWriter: 'Only the person who writes this review with them can do this.',
  onlyThePerson: 'Only the person this review is about can write their own view.',
  alreadyStarted: 'This review has already been started.',
  notYet: 'This review cannot start yet, because a check-in that decides something about this person is still open. It can start once that check-in is decided.',
  writeSomething: 'Write something first.',
  onlyThePersonCorrects: 'Only the person this review is about can correct what it says about their work.',
  noSuchLine: 'That line is not in this review.',
  sayWhatIsTrue: 'Say what is true, in a sentence or two.',
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
  /** What the "Written with" cell reads: the name, or "Any admin" where any admin may write it. Never blank. */
  writtenWithSays: string;
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
  /** Once decided: whether the person may appeal, and (when they have) where the appeal stands, in a plain sentence. Decision 113. */
  mayAppeal: boolean;
  appealStands: AppealStands | null;
  appealSays: string | null;
}

/** The person's own appeal, as they read it (decision 113). */
export interface YourAppeal {
  stands: AppealStands;
  says: string;
  appealedOn: string;
  yourReasons: string;
  additions: { said: string; on: string }[];
  /** Once decided: 'stands' or 'changed', the admin who decided it, and their reasons. */
  outcome: 'stands' | 'changed' | null;
  decidedByFirstName: string | null;
  reasons: string | null;
  /** When the decision was changed: what it said before, so nothing is lost. */
  decisionWas: { says: string; reasons: string } | null;
}

/** An appeal as the admin who decides it reads it: the person's side and reasons as well. */
export interface AppealForTheAdmin {
  reader: 'admin';
  stands: AppealStands;
  says: string;
  personFirstName: string;
  appealedOn: string;
  /** The person's reasons: for an admin who may decide it while it waits, and once decided for the admin who decided it. Null for any other admin. */
  theirReasons: string | null;
  additions: { said: string; on: string }[];
  mayDecide: boolean;
  outcome: 'stands' | 'changed' | null;
  decidedByFirstName: string | null;
  reasons: string | null;
  decisionWas: { says: string; reasons: string } | null;
}

/** An appeal as the reviewer reads it: that it was appealed and where it stands. Not the person's reasons, until it is decided. */
export interface AppealForTheReviewer {
  reader: 'reviewer';
  stands: AppealStands;
  says: string;
  personFirstName: string;
  appealedOn: string;
  mayDecide: false;
  outcome: 'stands' | 'changed' | null;
  decidedByFirstName: string | null;
  reasons: string | null;
  decisionWas: { says: string; reasons: string } | null;
}

/** What the person reads about their own review. Nothing of what it says, only that it waits for them. */
export function yourReviewSaid(stands: 'started' | 'decided', writerFirstName: string | null, hasTheirView: boolean): string {
  const who = writerFirstName?.trim() || 'The person who writes it with you';
  if (stands === 'decided') return `${who} has decided your review. You can read the decision and the reasons.`;
  return hasTheirView
    ? `${who} has started your review, and your own view is in it. You can read it and change your view before you meet.`
    : `${who} has started your review. You can read it and add your own view before you meet.`;
}

/**
 * THE RECORD, INTERPRETED, as one reader is served it (build step 12): each part with its heading, and
 * each line as a full sentence in this reader's words, with the person's correction beside it.
 */
export interface TheRecordServed {
  /** What this is, and the period it covers, for this reader. */
  intro: string;
  /** For the person: who reads their corrections, and what stays with them. Null for anybody else. */
  whoReads: string | null;
  parts: { part: ARecordPart; heading: string; lines: ARecordLineServed[] }[];
  /** Only the person corrects a line. */
  mayCorrect: boolean;
}
export interface ARecordLineServed {
  key: string;
  says: string;
  /** The person's latest correction of this line, kept beside it. The line itself never changes. */
  correction: { said: string; whatIsTrue: string } | null;
}

/** The order the parts are served in. */
const THE_PARTS: ARecordPart[] = ['worked-on', 'committed', 'completed', 'changed', 'delayed', 'blocked'];

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
  /** What Groundwork understands from the record, only the lines from check-ins this reader is in. Null for a review started before it existed. */
  record: TheRecordServed | null;
  managersWords: string | null;
  /** Who wrote those words, by sign-in, so the screen can tell the reader's own from somebody else's even where two people share a first name (request 162, item 6). Null until they are written. */
  managersWordsById: string | null;
  theirView: string | null;
  decision: { says: string; reasons: string } | null;
  /**
   * Who made the decision as it stands now, so the screen says "Your decision" only to that person. Once an appeal has
   * changed it, it is the admin who changed it, not the reviewer (decision 113). Both null until it is decided.
   */
  decidedByYou: boolean | null;
  decidedByFirstName: string | null;
  mayWrite: boolean;
  /**
   * Groundwork's suggestion about this person, when one was reached on a check-in this reader runs,
   * and the person has had their turn. No count, no verdict, never a rating. Null for anybody else.
   */
  suggestion: ForTheLead | null;
  /**
   * "Groundwork suggests recognising Aisha’s work", with the count behind it, once Aisha has had her turn
   * (a-review-may-suggest-recognising.ts). Read by the writer, an admin, and a lead of the team who does not
   * write it (decision 93, row 16). Null while the setting is off, and when the record does not reach the line.
   */
  recognise: RecogniseForTheWriter | null;
  /**
   * The manager's briefing (build step 13, a-review-briefing.ts): the counts, the person's patterns
   * after their turn with their answer beside each, what changed after earlier conversations, and the
   * person's corrections. Evidence and patterns only, never a verdict. Each reader reads only what they
   * may already read: counts and corrections from check-ins they are in, patterns from ones they run.
   */
  briefing: ABriefing;
  /**
   * The appeal of the decision (decision 113), only for the two who may read it: an admin who is not the reviewer, with the
   * person's reasons, and the reviewer, with where it stands. Null for everybody else, and when there is none.
   */
  appeal: AppealForTheAdmin | AppealForTheReviewer | null;
}

/** The person's own review: the facts, their own view, and the decision with its reasons. */
export interface ForThePerson {
  reader: 'person';
  id: string;
  firstName: string;
  writtenWithFirstName: string | null;
  dueOn: Day;
  noticed: Noticed[];
  /** What Groundwork understands from the record about their work, every line, to correct. Null for a review started before it existed. */
  record: TheRecordServed | null;
  theirView: string | null;
  /**
   * What the person who writes the review has written, word for word, once they have written it (decision 93, row 15;
   * the prototype's "What Wairimu writes"). Null until then. The heading beside it is `managersWordsHeading`.
   */
  managersWords: string | null;
  /** Who wrote them, by sign-in (request 162, item 6). Null until they are written. */
  managersWordsById: string | null;
  managersWordsHeading: string | null;
  /**
   * Who writes the review with them, for "What Grace writes" before anything is written. Not `writtenWithFirstName`, which
   * names the admin who changed the decision on appeal (decision 113): that admin never writes the review's words.
   */
  writerFirstName: string | null;
  /**
   * WHERE THE TWO VIEWS DIFFER (decision 93, row 15; the prototype's "where she and Wairimu see things differently").
   * Both views, side by side, once the writer and the person have each written theirs. Groundwork does not say
   * which of them is right, and works out no difference of its own. Null until both exist.
   */
  whereYouDiffer: { says: string; managersWords: string; yourView: string } | null;
  decision: { says: string; reasons: string } | null;
  /** Their own count, the line, and who decides, when Groundwork suggests recognising their work. Absent otherwise. */
  recognise?: RecogniseForThePerson;
  /** Decision 113: once decided and not yet appealed, they may appeal; the sentence says to whom. */
  mayAppeal: boolean;
  mayAppealSays: string | null;
  /** Their appeal, once made. Null before. */
  appeal: YourAppeal | null;
}

/** The sentence over the two views side by side, said to the person the review is about. */
export function whereYouDifferSaid(writerFirstName: string | null): string {
  const writer = writerFirstName?.trim() || 'The person who writes your review';
  return `${writer} and you have each written your own view of your work. Here they are side by side, so you can see where they differ before you meet.`;
}

const dayOf = (d: Date): Day => d.toISOString().slice(0, 10);
const DAY = 86_400_000;

/**
 * The person a started review is said to be written with: whoever decided it, once decided, or else
 * whoever started it. Read from the review itself, so an admin who started it is named, never the
 * person's line manager in their place (bug 2 of docs/suites-against-the-workflow-model.md).
 */
export function theOneWhoWrote(r: { startedById?: string | null; decidedById?: string | null; decidedAt?: Date | null }): string | null {
  return (r.decidedAt && r.decidedById) || r.startedById || null;
}

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
 *   - whoever the rules name to write a review (who-may-decide.ts) also reads it on the board: a lead
 *     from another team, or a member, who opens the board as an "approver" and reads only the reviews
 *     they write;
 *   - the person who writes it with them (the organisation's answer: "Their manager" or "An admin",
 *     through who-may-decide.ts) starts it, writes their own words, and decides with reasons;
 *   - the person it is about reads the facts, their own view, the writer's words once written (since
 *     decision 93, row 15) with both views side by side, and the decision with its reasons, and writes
 *     their own view; never a verdict, a label, or how their answers were rated;
 *   - a colleague and a guest are refused;
 *   - the record, interpreted (build step 12, the-record-read-for-a-review.ts): the person reads every
 *     line and corrects it; anybody else reads only the lines from check-ins they are in (decision 4);
 *   - the manager's briefing (build step 13, a-review-briefing.ts): everybody who may open the review
 *     except the person, each limited to what they may already read; evidence and patterns, never a
 *     verdict.
 * Hours and leave never feed a review (decisions rule 10): nothing here reads them.
 */
@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly suggestions?: SuggestionsService,
    /* Last and optional, so the specs that build this with one argument keep working. */
    @Optional() private readonly toldOnWhatsApp?: AReviewToldOnWhatsApp,
    /* Decision 113: who is told of an appeal. Optional, so the specs that build this without it keep working. */
    @Optional() private readonly appealTold?: AReviewAppealToldService,
  ) {}

  async board(reader: Reader, today = new Date()): Promise<{ reader: 'admin' | 'lead' | 'approver'; every: string | null; next: NextReview[] }> {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    /*
     * Whoever the rules name writes the review, whatever their role or team (who-may-decide.ts). A
     * member the rules could name opens the board as an approver and is served only the reviews they
     * write; any other member, and a guest, are refused, as before.
     */
    const asApprover = role !== 'ADMIN' && role !== 'LEAD';
    if (asApprover && !(role === 'MEMBER' && (await couldBeNamed(this.prisma, everyRuleIn(theStepsFor('reviews', answers)), reader.organizationId, { userId: reader.userId, role })))) {
      throw new ForbiddenException(REVIEW_REFUSED.onlyAdminsAndLeads);
    }
    const dues = await this.prisma.evaluationDue.findMany({
      where: { organizationId: reader.organizationId, dueOn: { gte: new Date(today.getTime() - 90 * DAY), lte: new Date(today.getTime() + 365 * DAY) } },
      orderBy: { dueOn: 'asc' },
      select: { id: true, personExternalId: true, dueOn: true, source: true },
    });
    const directory = await this.directory(reader.organizationId);
    const me = [...directory.values()].find((p) => p.userId === reader.userId) ?? null;
    const reviews = await this.prisma.performanceReview.findMany({
      where: { organizationId: reader.organizationId, evaluationDueId: { in: dues.map((d) => d.id) } },
      select: { id: true, evaluationDueId: true, decidedAt: true, startedAt: true, startedById: true, decidedById: true, managersWords: true, managersWordsById: true, theirView: true },
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
      /* A lead reads their own team's reviews; anybody also reads each review they write. */
      const writesIt = await this.writes(reader, role, p, answers.writer);
      if (role !== 'ADMIN' && !(role === 'LEAD' && me && inTheLeadsTeam(me, p)) && !writesIt) continue;
      const r = byDue.get(d.id);
      const writtenWith = r ? await this.fullNameOf(theOneWhoWrote(r as any), directory) : await this.whoWouldWrite(reader.organizationId, p, answers.writer, directory);
      const waitingFor = !r && p.userId ? openDecisions.get(p.userId) ?? null : null;
      const stands: Stands = r ? (r.decidedAt ? 'decided' : 'started') : waitingFor ? 'not-yet' : 'ready';
      next.push({
        dueId: d.id,
        name: this.nameOf(p),
        writtenWith,
        writtenWithSays: writtenWith ?? 'Any admin',
        dueOn: dayOf(d.dueOn),
        stands,
        standsSays: whereItStandsSaid({
          stands, firstName: this.firstOf(p), readerUserId: reader.userId, waitingFor,
          months: monthsToDrawOn(p.userId ? firstCheckIns.get(p.userId) : null, today),
          startedAt: (r as any)?.startedAt ?? null, decidedAt: r?.decidedAt ?? null,
          /* What is written so far, so the sentence is true of this review (request 162, item 2). */
          wordsBy: r?.managersWords?.trim() && r.managersWordsById
            ? (r.managersWordsById === reader.userId ? 'you' : await this.firstNameOf(r.managersWordsById, directory)) : null,
          hasTheirView: !!r?.theirView?.trim(),
          /* Who writes and decides it: the reader ("you"), the person the rule names, or an admin (the same answer as `mayWrite`). */
          decider: r && !r.decidedAt ? (writesIt ? 'you' : (await this.theWriterNamed(reader.organizationId, r as any, p, answers.writer, directory)).first ?? 'an admin') : null,
        }),
        reviewId: r?.id ?? null,
        mayStart: stands === 'ready' && writesIt,
        proposal: stands === 'ready' && isProposedByGroundwork(d.source) ? theProposalSentence(d.source, this.firstOf(p)) : null,
      });
    }
    return { reader: role === 'ADMIN' ? 'admin' : role === 'LEAD' ? 'lead' : 'approver', every: answers.every, next: next.filter((n) => n.name) };
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
    /*
     * The record, interpreted, for the review's period (build step 12): from the day this person's
     * previous review started, or the organisation's "How often?" back from today. Written once, now.
     */
    const now = new Date();
    const previous = await (this.prisma.performanceReview as any).findFirst?.({
      where: { organizationId: reader.organizationId, personExternalId: due.personExternalId }, orderBy: { startedAt: 'desc' }, select: { startedAt: true },
    }).catch(() => null);
    const from = theReviewsPeriodFrom(now, answers.every, previous?.startedAt ?? null);
    const recordRead = await theRecordForAReview(this.prisma, {
      organizationId: reader.organizationId, personUserId: p.userId, personExternalId: p.externalId, from, until: now,
    }).catch(() => [] as ARecordLine[]);
    const r = await this.prisma.performanceReview.create({
      data: {
        organizationId: reader.organizationId, evaluationDueId: due.id, personExternalId: due.personExternalId, startedById: reader.userId,
        recordRead: recordRead as any, recordFrom: from,
        ...(noticed.length ? { noticed: noticed as any } : {}),
      },
      select: { id: true },
    });
    /* One record of who did what (decision 85, build step 5). */
    await recordIt(this.prisma, { organizationId: reader.organizationId, suite: 'reviews', ref: r.id, kind: 'started', byUserId: reader.userId, basis: { row: 'performance_reviews', id: r.id, due: due.id } });
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
    const answers = await this.suiteAnswers(reader.organizationId);
    const directory = await this.directory(reader.organizationId);
    const me = [...directory.values()].find((p) => p.userId === reader.userId);
    if (!me) return [];
    const rows = await this.prisma.performanceReview.findMany({
      where: { organizationId: reader.organizationId, personExternalId: me.externalId },
      select: {
        id: true, evaluationDueId: true, theirView: true, decidedAt: true, decision: true, decisionReasons: true, startedById: true, decidedById: true,
        appeal: true, appealAdditions: true, appealedAt: true, appealOutcome: true, appealReasons: true, appealDecidedById: true, appealDecisionWas: true,
      },
    });
    const out: YourReview[] = [];
    for (const r of rows) {
      const due = await this.prisma.evaluationDue.findUnique({ where: { id: r.evaluationDueId }, select: { dueOn: true } });
      if (!due) continue;
      const stands = r.decidedAt && r.decision && r.decisionReasons ? 'decided' : 'started';
      /* The person who actually started it, or decided it: never the line manager by default (bug 2). */
      const writer = (await this.theWriterNamed(reader.organizationId, r, me, answers.writer, directory)).first;
      const yours = stands === 'decided' && wasAppealed(r as any) ? await this.yourAppeal(r as any, writer, directory) : null;
      /* Once an appeal has changed the decision, the decision is the admin's who changed it, and that is who has decided the review now. */
      const decidedNow = await this.whoHasDecidedItNow(r as any, writer, directory);
      out.push({
        id: r.id, dueOn: dayOf(due.dueOn), writtenWithFirstName: decidedNow, stands, says: yourReviewSaid(stands, decidedNow, !!r.theirView?.trim()),
        mayAppeal: stands === 'decided' && !wasAppealed(r as any),
        appealStands: yours?.stands ?? null,
        appealSays: yours?.says ?? null,
      });
    }
    return out.sort((a, b) => b.dueOn.localeCompare(a.dueOn));
  }

  /** One review, as this reader may read it. */
  async one(reader: Reader, id: string): Promise<ForTheWriter | ForThePerson> {
    const answers = await this.suiteAnswers(reader.organizationId);
    const { row, person, directory } = await this.theReview(reader, id);
    const role = await this.roleOf(reader);
    /*
     * Whoever started it, or decided it, is named, while they may still write it; never the line manager by default (bug 2).
     * Where the person who started it can no longer write it, the name is whoever the organisation's rule lets write it now,
     * or "an admin", so the words and `mayWrite` always agree (request 162, item 1).
     */
    const named = await this.theWriterNamed(reader.organizationId, row as any, person, answers.writer, directory);
    const writerId = named.id;
    const writerFirst = named.first;
    /* The words' own author, which can be somebody other than whoever decides now (request 162, item 6). */
    const wordsById = row.managersWords?.trim() ? ((row as any).managersWordsById ?? null) : null;
    const wordsFirst = wordsById ? (wordsById === writerId ? writerFirst : await this.firstNameOf(wordsById, directory)) : null;
    const startedByFirst = await this.firstNameOf((row as any).startedById ?? null, directory);
    const decision = row.decision && row.decisionReasons ? { says: row.decision, reasons: row.decisionReasons } : null;
    const dueOn = dayOf(row.due.dueOn);

    /* Read up to the day the review started, so it says the same whenever it is opened. */
    const recognising = await theRecordForRecognising(this.prisma, {
      organizationId: reader.organizationId, personUserId: person.userId, writerUserId: row.startedById, startedAt: (row as any).startedAt,
    }).catch(() => null);
    if (person.userId === reader.userId) {
      return {
        reader: 'person', id: row.id, firstName: this.firstOf(person), writtenWithFirstName: await this.whoHasDecidedItNow(row as any, writerFirst, directory),
        dueOn, noticed: this.noticedOf(row.noticed, true),
        record: await this.theRecordServed(row, person, reader.userId, writerId, writerFirst),
        theirView: row.theirView ?? null,
        managersWords: row.managersWords?.trim() ? row.managersWords : null,
        managersWordsById: wordsById,
        writerFirstName: writerFirst,
        managersWordsHeading: row.managersWords?.trim() ? `What ${wordsFirst ?? writerFirst ?? 'the person who writes your review'} writes` : null,
        whereYouDiffer: row.managersWords?.trim() && row.theirView?.trim()
          ? { says: whereYouDifferSaid(wordsFirst ?? writerFirst), managersWords: row.managersWords, yourView: row.theirView }
          : null,
        decision,
        /* The count is of check-ins with whoever started the review (theRecordForRecognising), so that person is named. */
        ...(recognising ? { recognise: recogniseForThePerson(recognising, startedByFirst) } : {}),
        mayAppeal: !!decision && !wasAppealed(row as any),
        mayAppealSays: decision && !wasAppealed(row as any) ? youMayAppealSaid(await this.firstNameOf((row as any).decidedById ?? null, directory) ?? writerFirst) : null,
        appeal: decision && wasAppealed(row as any) ? await this.yourAppeal(row as any, writerFirst, directory) : null,
      };
    }
    const writes = await this.writes(reader, role, person, answers.writer);
    const me = [...directory.values()].find((p) => p.userId === reader.userId) ?? null;
    const readsIt = writes || role === 'ADMIN' || (role === 'LEAD' && !!me && inTheLeadsTeam(me, person));
    if (!readsIt) throw new ForbiddenException(REVIEW_REFUSED.notYours);
    const record = await this.theRecordServed(row, person, reader.userId, writerId, writerFirst);
    const briefing = await this.theBriefing(row, person, reader.userId, writes, theOneWhoDecidesSaid(writerFirst, named.anAdmin), record);
    /* The writer, and (decision 93, row 17) an admin; the suggestion service itself reads only a check-in the admin has access to. A lead who does not write it reads none. */
    /* Whoever made the decision as it stands now: the admin who changed it on appeal, or else whoever decided it. */
    const decidedNowId: string | null = (row as any).appealOutcome === 'changed' && (row as any).appealDecidedById ? (row as any).appealDecidedById : ((row as any).decidedById ?? null);
    const suggestion = (writes || role === 'ADMIN') && person.userId && this.suggestions
      ? await this.suggestions.latestForTheLeadAbout(person.userId, reader).catch(() => null)
      : null;
    return {
      reader: writes ? 'writer' : role === 'ADMIN' ? 'admin' : 'lead',
      id: row.id, name: this.nameOf(person), firstName: this.firstOf(person),
      writtenWith: await this.fullNameOf(writerId, directory), writtenWithFirstName: writerFirst,
      dueOn, noticed: this.noticedOf(row.noticed, writes),
      record,
      managersWords: row.managersWords ?? null, managersWordsById: wordsById, theirView: row.theirView ?? null, decision,
      decidedByYou: decision ? decidedNowId === reader.userId : null,
      decidedByFirstName: decision ? await this.firstNameOf(decidedNowId, directory) : null,
      mayWrite: writes, suggestion,
      /* The writer reads it as "you"; an admin and a lead of the team who does not write it read it too, with the writer named (decision 93, row 16). */
      recognise: recognising && theWriterMayReadIt({ theirView: row.theirView ?? null, startedAt: (row as any).startedAt })
        ? (writes ? recogniseForTheWriter(this.firstOf(person), recognising) : recogniseForAnotherReader(this.firstOf(person), recognising, startedByFirst))
        : null,
      briefing,
      appeal: decision && wasAppealed(row as any) ? await this.appealForTheReader(row as any, person, reader, role, directory) : null,
    };
  }

  /** The writer's own words. */
  async writeWords(reader: Reader, id: string, words: string) {
    const answers = await this.suiteAnswers(reader.organizationId);
    const { row, person } = await this.theReview(reader, id);
    if (!(await this.writes(reader, await this.roleOf(reader), person, answers.writer))) throw new ForbiddenException(REVIEW_REFUSED.onlyTheWriter);
    /* Once appealed, the admin who decides the appeal reads the review as it was when the person appealed it (decision 113). */
    if (wasAppealed(row as any)) throw new BadRequestException(APPEAL_REFUSED.wordsKept);
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

  /**
   * THE PERSON CORRECTS ONE LINE (build step 12): they mark it as wrong and say what is true. The
   * correction is kept beside the line, in its own row, and the line and the record it came from never
   * change. A second correction of the same line is kept too; the latest is the one served.
   */
  async correct(reader: Reader, id: string, lineKey: string, whatIsTrue: string) {
    await this.suiteAnswers(reader.organizationId);
    const { row, person } = await this.theReview(reader, id);
    if (person.userId !== reader.userId) throw new ForbiddenException(REVIEW_REFUSED.onlyThePersonCorrects);
    if (!theStoredRecord((row as any).recordRead).some((l) => l.key === lineKey)) throw new NotFoundException(REVIEW_REFUSED.noSuchLine);
    const text = (whatIsTrue ?? '').trim();
    if (!text) throw new BadRequestException(REVIEW_REFUSED.sayWhatIsTrue);
    await (this.prisma as any).performanceReviewCorrection.create({ data: { reviewId: row.id, lineKey, whatIsTrue: text.slice(0, 2000), byUserId: reader.userId } });
    /* One record of who did what (decision 85, build step 5): that a line was corrected, never which or the words. */
    await recordIt(this.prisma, { organizationId: reader.organizationId, suite: 'reviews', ref: row.id, kind: 'corrected', byUserId: reader.userId, basis: { row: 'performance_review_corrections' } });
    return this.one(reader, id);
  }

  /**
   * One review's record of who started and decided it, in plain sentences (decision 85, build step 5),
   * for exactly the people who may read the review (`one` decides that, and refuses everybody else).
   */
  async history(reader: Reader, id: string): Promise<{ said: string[] }> {
    await this.one(reader, id);
    return aRequestsHistory(this.prisma, reader.organizationId, 'reviews', id, reader.userId);
  }

  /** The writer decides, with reasons. The person reads both. */
  async decide(reader: Reader, id: string, input: { decision?: string; reasons?: string }) {
    const answers = await this.suiteAnswers(reader.organizationId);
    const { row, person } = await this.theReview(reader, id);
    if (!(await this.writes(reader, await this.roleOf(reader), person, answers.writer))) throw new ForbiddenException(REVIEW_REFUSED.onlyTheWriter);
    const says = (input.decision ?? '').trim();
    const reasons = (input.reasons ?? '').trim();
    if (!says || !reasons) throw new BadRequestException(REVIEW_REFUSED.sayWhatAndWhy);
    /* Once the person has appealed, an admin other than the reviewer decides (decision 113); the reviewer cannot change it from under them. */
    if (wasAppealed(row as any)) throw new BadRequestException(APPEAL_REFUSED.appealedAlready);
    await this.prisma.performanceReview.update({
      where: { id: row.id },
      data: { decision: says.slice(0, 1000), decisionReasons: reasons.slice(0, 2000), decidedById: reader.userId, decidedAt: new Date() },
    });
    /* One record of who did what (decision 85, build step 5): who decided and when, never the words. */
    await recordIt(this.prisma, { organizationId: reader.organizationId, suite: 'reviews', ref: row.id, kind: 'decided', byUserId: reader.userId, basis: { row: 'performance_reviews', id: row.id } });
    /* Told once, the first time it is decided; a reason corrected later is not a second message. */
    if (!row.decidedAt) await this.toldOnWhatsApp?.toThePerson(reader.organizationId, person.userId, reader.userId, 'decided').catch(() => false);
    return this.one(reader, id);
  }


  // ---------------------------------------------------------------------------------------------
  // AN APPEAL OF A DECIDED REVIEW (decision 113, bug B-024). Words and reading rules: a-review-appeal.ts.

  /** The person appeals the decision, once, saying why. It goes to an admin who is not the reviewer, or waits for one. */
  async appeal(reader: Reader, id: string, why: string) {
    await this.suiteAnswers(reader.organizationId);
    const { row, person, directory } = await this.theReview(reader, id);
    if (person.userId !== reader.userId) throw new ForbiddenException(APPEAL_REFUSED.onlyThePerson);
    if (!(row.decision && row.decisionReasons)) throw new BadRequestException(APPEAL_REFUSED.notDecided);
    if (wasAppealed(row as any)) throw new BadRequestException(APPEAL_REFUSED.alreadyAppealed);
    const text = (why ?? '').trim();
    if (!text) throw new BadRequestException(APPEAL_REFUSED.sayWhy);
    await this.prisma.performanceReview.update({ where: { id: row.id }, data: { appeal: text.slice(0, 2000), appealedAt: new Date() } });
    await recordIt(this.prisma, { organizationId: reader.organizationId, suite: 'reviews', ref: row.id, kind: 'appealed', byUserId: reader.userId, basis: { row: 'performance_reviews', id: row.id } });
    const reviewerId = (row as any).decidedById as string | null;
    const admins = await this.admins(reader.organizationId, [reviewerId, reader.userId]);
    const personFirst = this.firstOf(person);
    try {
      if (admins.length) {
        const reviewerFirst = await this.firstNameOf(reviewerId, directory);
        for (const a of admins) await this.toldAnAdmin(reader.organizationId, row.id, a, personFirst, reviewerFirst);
      } else if (reviewerId) {
        /* Nobody else can decide it: it is saved and stays open, and the reviewer is asked to add a second admin. */
        await this.prisma.performanceReview.update({ where: { id: row.id }, data: { appealAskedForAdminAt: new Date() } });
        const reviewerRole = await this.roleOf({ userId: reviewerId, organizationId: reader.organizationId });
        await this.appealTold?.toTheReviewerToAddAnAdmin(reader.organizationId, row.id, reviewerId, personFirst, reviewerRole === 'ADMIN');
      }
    } catch { /* The appeal is saved; whoever could not be told reads it in the app. */ }
    return this.one(reader, id);
  }

  /** The person adds to their reasons, until the appeal is decided. What they wrote first is kept. */
  async addToTheAppeal(reader: Reader, id: string, more: string) {
    await this.suiteAnswers(reader.organizationId);
    const { row, person } = await this.theReview(reader, id);
    if (person.userId !== reader.userId) throw new ForbiddenException(APPEAL_REFUSED.onlyThePerson);
    if (!wasAppealed(row as any)) throw new BadRequestException(APPEAL_REFUSED.notAppealed);
    if (wasAppealDecided(row as any)) throw new BadRequestException(APPEAL_REFUSED.alreadyDecided);
    const text = (more ?? '').trim();
    if (!text) throw new BadRequestException(APPEAL_REFUSED.addSomething);
    const kept = theAdditions(row as any);
    if (kept.length >= 10) throw new BadRequestException(APPEAL_REFUSED.tooMany);
    await this.prisma.performanceReview.update({ where: { id: row.id }, data: { appealAdditions: [...kept, { said: text.slice(0, 2000), at: new Date().toISOString() }] as never } });
    return this.one(reader, id);
  }

  /** An admin who is not the reviewer and not the person decides the appeal, giving reasons that the person and the reviewer read. */
  async decideTheAppeal(reader: Reader, id: string, input: { outcome?: string; reasons?: string; decision?: string }) {
    await this.suiteAnswers(reader.organizationId);
    const { row, person, directory } = await this.theReview(reader, id);
    if ((await this.roleOf(reader)) !== 'ADMIN') throw new ForbiddenException(APPEAL_REFUSED.onlyAnAdmin);
    if (person.userId === reader.userId) throw new ForbiddenException(APPEAL_REFUSED.yourOwnReview);
    if ((row as any).decidedById === reader.userId) throw new ForbiddenException(APPEAL_REFUSED.yourOwnDecision);
    if (!wasAppealed(row as any)) throw new BadRequestException(APPEAL_REFUSED.notAppealed);
    if (wasAppealDecided(row as any)) throw new BadRequestException(APPEAL_REFUSED.alreadyDecided);
    if (!(APPEAL_OUTCOMES as readonly string[]).includes(input.outcome ?? '')) throw new BadRequestException(APPEAL_REFUSED.keepOrChange);
    const reasons = (input.reasons ?? '').trim();
    if (!reasons) throw new BadRequestException(APPEAL_REFUSED.sayWhyToBoth);
    const changed = input.outcome === 'changed';
    const now = (input.decision ?? '').trim();
    if (changed && !now) throw new BadRequestException(APPEAL_REFUSED.sayWhatItIsNow);
    await this.prisma.performanceReview.update({
      where: { id: row.id },
      data: {
        appealOutcome: input.outcome, appealReasons: reasons.slice(0, 2000), appealDecidedById: reader.userId, appealDecidedAt: new Date(),
        /* A changed decision becomes the one the person reads, with the admin's reasons; what it said before is kept. */
        ...(changed ? { appealDecisionWas: { says: row.decision, reasons: row.decisionReasons } as never, decision: now.slice(0, 1000), decisionReasons: reasons.slice(0, 2000) } : {}),
      },
    });
    await recordIt(this.prisma, { organizationId: reader.organizationId, suite: 'reviews', ref: row.id, kind: 'appeal-decided', byUserId: reader.userId, basis: { row: 'performance_reviews', id: row.id, outcome: input.outcome } });
    try { await this.appealTold?.decided(reader.organizationId, row.id, reader.userId, person.userId, this.firstOf(person), (row as any).decidedById ?? null, input.outcome ?? null); } catch { /* It is decided; they read it in the app. */ }
    void directory;
    return this.one(reader, id);
  }

  /**
   * An admin's list of appeals (decision 113): those they may decide, and those that wait for an admin other than
   * them (they decided the review, and nobody else is an admin yet). No reasons here, they are read on the review.
   */
  async appealsToDecide(reader: Reader): Promise<{
    appeals: { id: string; name: string; firstName: string; dueOn: Day; appealedOn: string; reviewerFirstName: string | null }[];
    waitingForAnotherAdmin: { id: string; name: string; firstName: string; dueOn: Day; appealedOn: string; says: string }[];
  }> {
    await this.suiteAnswers(reader.organizationId);
    if ((await this.roleOf(reader)) !== 'ADMIN') throw new ForbiddenException(APPEAL_REFUSED.onlyAnAdmin);
    const rows = await this.prisma.performanceReview.findMany({ where: { organizationId: reader.organizationId, appealedAt: { not: null }, appealOutcome: null } });
    const directory = await this.directory(reader.organizationId);
    const out = { appeals: [] as any[], waitingForAnotherAdmin: [] as any[] };
    for (const r of [...rows].sort((a: any, b: any) => +new Date(a.appealedAt) - +new Date(b.appealedAt))) {
      const person = directory.get(r.personExternalId);
      const due = await this.prisma.evaluationDue.findUnique({ where: { id: r.evaluationDueId }, select: { dueOn: true } });
      if (!person || !due || !wasAppealed(r as any)) continue;
      const base = { id: r.id, name: this.nameOf(person), firstName: this.firstOf(person), dueOn: dayOf(due.dueOn), appealedOn: aDaySaid((r as any).appealedAt) };
      if (person.userId === reader.userId) continue;
      if ((r as any).decidedById === reader.userId) {
        if (!(await this.admins(reader.organizationId, [(r as any).decidedById, person.userId])).length) {
          out.waitingForAnotherAdmin.push({ ...base, says: theReviewerReadsSaid('needs-another-admin', this.firstOf(person), true, null, null) });
        }
        continue;
      }
      out.appeals.push({ ...base, reviewerFirstName: await this.firstNameOf((r as any).decidedById ?? null, directory) });
    }
    return out;
  }

  /**
   * AN ADMIN ADDED AFTER THE APPEAL IS TOLD IT WAITS FOR THEM, ONCE (decision 113). When the person appealed, only the admins
   * there then were told; with none other than the reviewer, the reviewer was asked to add one. Whoever becomes an admin later,
   * and is not the reviewer or the person, is told the same as they would have been (by email, and on WhatsApp where it is on),
   * with no word of the review or the reasons. Run when somebody is made an admin, and every hour for the other ways an admin
   * appears. Each admin told is kept as 'appeal-told', which no history says, so nobody is told twice.
   */
  async tellNewAdminsOfOpenAppeals(organizationId: string): Promise<{ told: number }> {
    if (!this.appealTold) return { told: 0 };
    /* With the reviews suite off, nobody could open the appeal, so nobody is told; they are told once it is on again. */
    if (!(await this.suiteAnswers(organizationId).then(() => true, () => false))) return { told: 0 };
    const rows = await this.prisma.performanceReview.findMany({ where: { organizationId, appealedAt: { not: null }, appealOutcome: null } });
    const open = rows.filter((r: any) => wasAppealed(r) && !wasAppealDecided(r));
    if (!open.length) return { told: 0 };
    const directory = await this.directory(organizationId);
    let told = 0;
    for (const r of open as any[]) {
      const person = directory.get(r.personExternalId);
      if (!person) continue;
      const admins = await this.admins(organizationId, [r.decidedById, person.userId]);
      if (!admins.length) continue;
      const already: any[] = (await (this.prisma as any).suiteEvent?.findMany?.({
        where: { organizationId, suite: 'reviews', ref: r.id, kind: 'appeal-told' }, select: { toUserId: true },
      }).catch(() => [])) ?? [];
      const toldBefore = new Set(already.map((e) => e.toUserId).filter(Boolean));
      const reviewerFirst = await this.firstNameOf(r.decidedById ?? null, directory);
      for (const a of admins) {
        if (toldBefore.has(a)) continue;
        await this.toldAnAdmin(organizationId, r.id, a, this.firstOf(person), reviewerFirst);
        told += 1;
      }
    }
    return { told };
  }

  /** The organisations with an appeal still open, for the hourly sweep. */
  async organisationsWithAnOpenAppeal(): Promise<string[]> {
    const rows: any[] = (await (this.prisma.performanceReview as any).findMany({
      where: { appealedAt: { not: null }, appealOutcome: null }, select: { organizationId: true }, distinct: ['organizationId'],
    }).catch(() => [])) ?? [];
    return [...new Set(rows.map((r) => r.organizationId as string))];
  }

  /** Tells one admin an appeal waits for them, and keeps that they were told (never in a history). */
  private async toldAnAdmin(organizationId: string, reviewId: string, adminUserId: string, personFirst: string, reviewerFirst: string | null): Promise<void> {
    if (!this.appealTold) return;
    await this.appealTold.toAnAdmin(organizationId, reviewId, adminUserId, personFirst, reviewerFirst).catch(() => undefined);
    await recordIt(this.prisma, { organizationId, suite: 'reviews', ref: reviewId, kind: 'appeal-told', toUserId: adminUserId, basis: { row: 'performance_reviews', id: reviewId } });
  }

  /** The admins of an organisation, except these, and except sign-ins that have been deleted. */
  private async admins(organizationId: string, except: (string | null | undefined)[]): Promise<string[]> {
    const ms = await (this.prisma.organizationMembership as any).findMany({ where: { organizationId, role: 'ADMIN' }, select: { userId: true } }).catch(() => []);
    const skip = new Set(except.filter((x): x is string => !!x));
    const ids = ((ms ?? []) as { userId: string }[]).map((m) => m.userId).filter((u) => u && !skip.has(u));
    if (!ids.length) return [];
    const live = await (this.prisma as any).user?.findMany?.({ where: { id: { in: ids }, deletedAt: null }, select: { id: true } }).catch(() => null);
    return Array.isArray(live) ? ids.filter((i) => live.some((u: { id: string }) => u.id === i)) : ids;
  }

  /** Where the appeal stands: decided, or with an admin who may decide it, or saved and waiting for one to be added. */
  private async standsOfTheAppeal(row: { personExternalId?: string; appealOutcome?: string | null; decidedById?: string | null }, personUserId: string | null, organizationId: string): Promise<AppealStands> {
    if (row.appealOutcome) return 'decided';
    return (await this.admins(organizationId, [row.decidedById, personUserId])).length ? 'with-an-admin' : 'needs-another-admin';
  }

  private async yourAppeal(row: any, writerFirst: string | null, directory: Map<string, Person>): Promise<YourAppeal> {
    const person = directory.get(row.personExternalId);
    const stands = await this.standsOfTheAppeal(row, person?.userId ?? null, row.organizationId);
    const reviewerFirst = (await this.firstNameOf(row.decidedById ?? null, directory)) ?? writerFirst;
    const decider = row.appealDecidedById ? await this.firstNameOf(row.appealDecidedById, directory) : null;
    const was = row.appealDecisionWas && typeof row.appealDecisionWas === 'object' ? (row.appealDecisionWas as { says: string; reasons: string }) : null;
    return {
      stands, says: yourAppealSaid(stands, reviewerFirst, row.appealOutcome ?? null, decider), appealedOn: aDaySaid(row.appealedAt),
      yourReasons: row.appeal, additions: theAdditions(row).map((a) => ({ said: a.said, on: a.at ? aDaySaid(a.at) : '' })),
      outcome: (row.appealOutcome as 'stands' | 'changed' | null) ?? null, decidedByFirstName: decider, reasons: row.appealOutcome ? (row.appealReasons ?? null) : null, decisionWas: was,
    };
  }

  /** The appeal as an admin who may decide it, or the reviewer, reads it. Anybody else reads nothing of it. */
  private async appealForTheReader(row: any, person: Person, reader: Reader, role: string | null, directory: Map<string, Person>): Promise<AppealForTheAdmin | AppealForTheReviewer | null> {
    const stands = await this.standsOfTheAppeal(row, person.userId, reader.organizationId);
    const personFirst = this.firstOf(person);
    const appealedOn = aDaySaid(row.appealedAt);
    const decider = row.appealDecidedById ? await this.firstNameOf(row.appealDecidedById, directory) : null;
    const was = row.appealDecisionWas && typeof row.appealDecisionWas === 'object' ? (row.appealDecisionWas as { says: string; reasons: string }) : null;
    const outcome = (row.appealOutcome as 'stands' | 'changed' | null) ?? null;
    const reasons = row.appealOutcome ? (row.appealReasons ?? null) : null;
    if (row.decidedById === reader.userId) {
      return { reader: 'reviewer', stands, says: theReviewerReadsSaid(stands, personFirst, role === 'ADMIN', outcome, decider), personFirstName: personFirst, appealedOn, mayDecide: false, outcome, decidedByFirstName: decider, reasons, decisionWas: was };
    }
    if (role === 'ADMIN' && person.userId !== reader.userId) {
      const reviewerFirst = await this.firstNameOf(row.decidedById ?? null, directory);
      /* The person's reasons go to every admin who may read this review, before and after it is decided (decision 118,
         Hafsah 8 October: decision 5 and the evaluation access rule decide which admins those are; an admin without
         access never reaches this line). The reviewer is answered above and never reads them. */
      const readsTheReasons = true;
      return {
        reader: 'admin', stands, says: theAdminReadsSaid(stands, personFirst, reviewerFirst, appealedOn, decider, outcome, !!row.appealDecidedById && row.appealDecidedById === reader.userId), personFirstName: personFirst, appealedOn,
        theirReasons: readsTheReasons ? row.appeal : null,
        additions: readsTheReasons ? theAdditions(row).map((a) => ({ said: a.said, on: a.at ? aDaySaid(a.at) : '' })) : [],
        mayDecide: stands !== 'decided', outcome, decidedByFirstName: decider, reasons, decisionWas: was,
      };
    }
    return null;
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

  /** Which of these check-ins this reader is in, and which they run (the lead, or the admin who set it up). */
  private async whatTheyAreIn(userId: string | null, groundIds: string[], isThePerson: boolean, personUserId: string | null = null): Promise<WhatTheReaderIsIn> {
    const db = this.prisma as any;
    /* The goals the lead has not told the person about, as they stand now: the record stores the goal, and this decides who reads it. */
    const theirPlace: any[] = personUserId && groundIds.length
      ? ((await db.groundParticipant?.findMany?.({ where: { userId: personUserId, groundId: { in: groundIds } }, select: { id: true } }).catch(() => [])) ?? [])
      : [];
    const notTold: any[] = theirPlace.length
      ? ((await db.personObjective?.findMany?.({
        where: { groundId: { in: groundIds }, participantId: { in: theirPlace.map((x) => x.id) }, awareness: 'NOT_TOLD' },
        select: { id: true, groundId: true, participantId: true, text: true, awareness: true, authoredBy: true, createdAt: true },
      }).catch(() => [])) ?? []).filter(notToldYet)
      : [];
    if (isThePerson || !userId || !groundIds.length) return { isThePerson, inCheckIns: new Set(), runsCheckIns: new Set(), notTold };
    const [ins, runs] = await Promise.all([
      db.groundParticipant?.findMany?.({ where: { userId, groundId: { in: groundIds } }, select: { groundId: true } }).catch(() => []),
      db.ground?.findMany?.({ where: { id: { in: groundIds }, OR: [{ initiatorId: userId }, { createdByUserId: userId }] }, select: { id: true } }).catch(() => []),
    ]);
    return { isThePerson, inCheckIns: new Set(((ins ?? []) as any[]).map((x) => x.groundId)), runsCheckIns: new Set(((runs ?? []) as any[]).map((x) => x.id)), notTold };
  }

  /** The lines of the record this reader may read. */
  private async readableLines(row: any, person: Person, readerUserId: string): Promise<ARecordLine[]> {
    const lines = theStoredRecord(row.recordRead);
    const groundIds = [...new Set(lines.map((l) => l.groundId).filter((g): g is string => !!g))];
    const access = await this.whatTheyAreIn(readerUserId, groundIds, person.userId === readerUserId, person.userId ?? null);
    return lines.filter((l) => mayReadTheLine(l, access));
  }

  /** The manager's briefing, as this reader may read it (build step 13). */
  private async theBriefing(row: any, person: Person, readerUserId: string, writes: boolean, writerFirst: string | null, record: TheRecordServed | null): Promise<ABriefing> {
    const first = this.firstOf(person) || 'this person';
    const directory = await this.directory(row.organizationId);
    const [lines, found, earlier] = await Promise.all([
      this.readableLines(row, person, readerUserId),
      thePatternsForTheBriefing(this.prisma, { organizationId: row.organizationId, personUserId: person.userId, readerUserId, first }),
      theEarlierReviews(this.prisma, {
        organizationId: row.organizationId, personExternalId: person.externalId, before: new Date(row.startedAt ?? Date.now()), first, readerUserId,
        nameOf: (id) => this.firstNameOf(id, directory),
      }),
    ]);
    return {
      heading: theBriefingsHeading(writes, first),
      counts: theCountsSaid(lines, first),
      patterns: found.patterns,
      patternsNote: found.patterns.length ? PATTERNS_NOTE(first) : null,
      changedAfterEarlierConversations: [...found.talkedThrough, ...earlier],
      corrections: (record?.parts ?? []).flatMap((p) => p.lines).filter((l) => l.correction).map((l) => ({ line: l.says, said: l.correction!.said, whatIsTrue: l.correction!.whatIsTrue })),
      whoDecides: whoDecidesTheReview(writes, first, writerFirst),
    };
  }

  /** The record, interpreted, as this reader may read it, with the person's corrections beside each line. */
  private async theRecordServed(row: any, person: Person, readerUserId: string, writerId: string | null, writerFirst: string | null): Promise<TheRecordServed | null> {
    if (!Array.isArray(row.recordRead)) return null;
    const lines = theStoredRecord(row.recordRead);
    const isThePerson = person.userId === readerUserId;
    const first = this.firstOf(person) || 'this person';
    const groundIds = [...new Set(lines.map((l) => l.groundId).filter((g): g is string => !!g))];
    const access = await this.whatTheyAreIn(readerUserId, groundIds, isThePerson, person.userId ?? null);
    const theirs = lines.filter((l) => mayReadTheLine(l, access));
    const corrections: any[] = ((await (this.prisma as any).performanceReviewCorrection?.findMany?.({
      where: { reviewId: row.id }, orderBy: { createdAt: 'asc' }, select: { lineKey: true, whatIsTrue: true, createdAt: true },
    }).catch(() => [])) ?? []);
    const latest = new Map<string, any>();
    for (const c of corrections) latest.set(c.lineKey, c);
    const who = { isThePerson, userId: readerUserId, personFirst: first };
    const parts = THE_PARTS.map((part) => ({
      part,
      heading: thePartsHeading(part, who),
      lines: theirs.filter((l) => thePartOf(l) === part).map((l): ARecordLineServed => {
        const c = latest.get(l.key);
        return {
          key: l.key, says: aRecordLineSaid(l, who),
          correction: c ? { said: isThePerson ? A_LINE_WAS_CORRECTED.forThePerson(new Date(c.createdAt)) : A_LINE_WAS_CORRECTED.forAnybodyElse(first, new Date(c.createdAt)), whatIsTrue: String(c.whatIsTrue) } : null,
        };
      }),
    })).filter((x) => x.lines.length);
    const until = row.startedAt && !Number.isNaN(new Date(row.startedAt).getTime()) ? new Date(row.startedAt) : new Date();
    const period = thePeriodSaid(row.recordFrom ? new Date(row.recordFrom) : until, until);
    if (isThePerson) {
      const writer = writerFirst?.trim() || 'The person who writes your review with you';
      const writersAccess = writerId && writerId !== readerUserId ? await this.whatTheyAreIn(writerId, groundIds, false, person.userId ?? null) : null;
      const staysWithYou = !!writersAccess && lines.some((l) => !mayReadTheLine(l, writersAccess));
      return {
        intro: !lines.length ? `Groundwork found nothing in the record about your work ${period}. You can still add your own view.` : `This is what Groundwork understands from the record about your work ${period}. It comes from your check-ins, the goals and work-plan items you own, what you committed to and how each one went, and what you said was holding you up. If a line is wrong, mark it and say what is true. Your correction is kept beside the line, and the record itself is not changed.`,
        whoReads: `${writer} reads your corrections and your own view before you meet.${staysWithYou ? ` Lines from check-ins that ${writer} is not in stay with you, and so does anything you say about them. If you want ${writer} to know, put it in your own view.` : ''}`,
        parts, mayCorrect: true,
      };
    }
    return {
      intro: !lines.length
        ? `Groundwork found nothing in the record about ${first}’s work ${period}.`
        : parts.length
          ? `This is what Groundwork understands from the record about ${first}’s work ${period}, from the check-ins you are in. ${first} reads it too, and can mark any line as wrong and say what is true.`
          : `You are not in any check-in with ${first} ${period}, so nothing from the record is here for you. ${first} reads what Groundwork understands from the record, and can mark any line as wrong and say what is true.`,
      whoReads: null, parts, mayCorrect: false,
    };
  }

  /**
   * WHO THE WORDS NAME AS WRITING A REVIEW (request 162, item 1): whoever decided it; else whoever started it, while the
   * organisation's rule still lets them write it; else whoever the rule names now; else nobody by name, and `anAdmin` says
   * any admin may. So the name a reader is told always agrees with what `mayWrite` lets somebody do.
   */
  private async theWriterNamed(
    organizationId: string, row: { startedById?: string | null; decidedById?: string | null; decidedAt?: Date | null }, p: Person, writer: string | null, directory: Map<string, Person>,
  ): Promise<{ id: string | null; first: string | null; anAdmin: boolean }> {
    const rule = await this.theWriter(organizationId, p, writer).catch(() => null);
    const candidate = theOneWhoWrote(row);
    if (candidate) {
      const decided = !!(row.decidedAt && row.decidedById);
      const role = decided || !rule ? null : await this.roleOf({ userId: candidate, organizationId });
      if (decided || !rule || decidesIt(rule, { userId: candidate, role }, p.userId ?? `person:${p.externalId}`)) {
        return { id: candidate, first: await this.firstNameOf(candidate, directory), anAdmin: false };
      }
    }
    if (rule && rule.kind !== 'admin') return { id: rule.userId, first: await this.firstNameOf(rule.userId, directory), anAdmin: false };
    return { id: null, first: null, anAdmin: !!rule && rule.kind === 'admin' };
  }

  /**
   * WHO HAS DECIDED THIS REVIEW NOW (8 October). The person read "Grace has decided your review" and "You and Grace talk it through, and Grace decides" after an
   * admin had read the appeal and changed the decision: the decision on the page is that admin's, so that admin is named. If the decision stands, or there was no
   * appeal, it is the one who decided it first.
   */
  private async whoHasDecidedItNow(row: { appealOutcome?: string | null; appealDecidedById?: string | null }, writerFirst: string | null, directory: Map<string, Person>): Promise<string | null> {
    if (row.appealOutcome !== 'changed' || !row.appealDecidedById) return writerFirst;
    return (await this.firstNameOf(row.appealDecidedById, directory)) ?? writerFirst;
  }

  /** Whether this reader writes the review with this person, by the organisation's answer (who-may-decide.ts). */
  private async writes(reader: Reader, role: string | null, p: Person, writer: string | null): Promise<boolean> {
    return decidesIt(await this.theWriter(reader.organizationId, p, writer), { userId: reader.userId, role }, p.userId ?? `person:${p.externalId}`);
  }

  /** Who writes this person's review, by rule: "Their manager" is their manager, else an admin; "An admin" is an admin. */
  private theWriter(organizationId: string, p: Person, writer: string | null): Promise<WhoDecides> {
    /* Nobody stands in to write a review: it is not a request that waits for an answer, and who writes it does not change with somebody's leave. */
    return theOneWhoDecides(this.prisma, theStepsFor('reviews', { writer })[0], {
      organizationId, requesterUserId: p.userId ?? `person:${p.externalId}`, managerExternalId: p.managerExternalId, team: p.department,
    }, { noCover: true });
  }

  /**
   * Who would write a review not started yet: the one person the rule names, or nobody when any admin
   * may write it.
   */
  private async whoWouldWrite(organizationId: string, p: Person, writer: string | null, directory: Map<string, Person>): Promise<string | null> {
    const who = await this.theWriter(organizationId, p, writer).catch(() => null);
    return who && who.kind !== 'admin' ? this.fullNameOf(who.userId, directory) : null;
  }

  /** A sign-in's first name, from the staff directory, or else from the sign-in itself. Never an address. */
  private async firstNameOf(userId: string | null, directory: Map<string, Person>): Promise<string | null> {
    if (!userId) return null;
    const p = [...directory.values()].find((x) => x.userId === userId);
    if (p) return this.firstOf(p) || null;
    const u = await (this.prisma as any).user?.findUnique?.({ where: { id: userId }, select: { firstName: true } }).catch(() => null);
    return u?.firstName?.trim() || null;
  }

  /** A sign-in's full name, from the staff directory, or else from the sign-in itself. Never an address. */
  private async fullNameOf(userId: string | null, directory: Map<string, Person>): Promise<string | null> {
    if (!userId) return null;
    const p = [...directory.values()].find((x) => x.userId === userId);
    if (p) return this.nameOf(p) || null;
    const u = await (this.prisma as any).user?.findUnique?.({ where: { id: userId }, select: { firstName: true, lastName: true } }).catch(() => null);
    return [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || null;
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
    const a = answersUnderTheQuestionsOwnIds(suiteOf('reviews')!, suite.answers) as Record<string, unknown>;
    return { every: typeof a.every === 'string' && a.every ? a.every : null, writer: typeof a.writer === 'string' && a.writer ? a.writer : null };
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
