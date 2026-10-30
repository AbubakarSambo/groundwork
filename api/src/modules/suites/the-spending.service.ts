import { whatWasAttachedSaid } from './what-was-attached-to-a-spend-request';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { answersUnderTheQuestionsOwnIds } from './the-answers-under-the-questions-own-ids';
import { suiteOf } from './the-ten-suites';
import { thisSuiteIsOff } from './a-suite-that-is-off-says-what-to-do';
import { PrismaService } from '../prisma/prisma.service';
import { askNameOf } from '../assistant/ask-name';
import { theirRosterEntry, withTheirSignIns } from './a-roster-entry-and-its-sign-in';
import { inTheLeadsTeam } from './a-leads-team';
import { loadLookups, type Lookups } from './the-lookups';
import { oneAtATime } from './the-same-request-at-once';
import { theStepsADecisionFollows, NOBODY_ELSE_CAN_DECIDE, nobodyElseCanDecide, couldBeNamed, decidesIt, everyStepFor, passWhatTheyAlreadyApproved, theStepsFor, whoComesNext, whoDecidesNow, type DecidesNow } from './who-may-decide';
import { whyPassOn } from './a-request-waits-too-long';
import { aRequestsHistory, recordIt, saidAsADate } from './a-request-is-recorded';
import { claimIt, theyGotThereFirst, whereItIsNow } from './a-request-is-answered-once';
import { readDuties } from './who-holds-each-duty';
import type { ADecisionHow, PassedOn } from './the-leave-board.service';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';
import { LEAVE_QUESTION_KIND, QUESTION_REFUSED, aQuestionSaid, aReasonSaid, wordsGiven, type AQuestion } from './a-question-about-a-request';
import { aSpendRequest, spendInWords, type AWaitingRequest, whereItIsOnTheBoard, whereYourRequestIs, type WhereItStands } from './a-request-in-words';
import { firstNamesOf, readWorkflow, whoInWords, type AWorkflow } from './the-approval-steps';
import {
  readSpendRules, theCategoryCalled, theEvidenceNeeded, theEvidenceSaid, theThresholdCrossed, type ASpendCategory, type AThreshold, type SpendRules,
} from './the-spending-rules';

/** The words the server says when it refuses, in plain full sentences. */
export const SPEND_REFUSED = {
  notOn: thisSuiteIsOff('The spending suite'),
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
  badCategory: 'Choose one of the categories your organisation has set.',
};

export interface Reader { userId: string; organizationId: string }

/** Who approves one request: the person's lead, a named person (or the holder of the team's budget or finance) because it is over the limit, or an admin. */
/** `standingInFor` is the first name of the manager who is on leave, when this person decides only because they stand in for them. */
export type Approver = { kind: 'manager' } | { kind: 'person'; firstName: string; standingInFor?: string } | { kind: 'admin' };

export interface Waiting {
  id: string;
  /** "Kevin attached a proforma or quote, “proforma.pdf”.", or null. */
  attached?: string | null;
  name: string;
  firstName: string;
  amount: number;
  what: string;
  /** The line as the prototype reads it: "Kamau: KES 18,000 for fuel for Kisumu deliveries" (request 162, item 3). Currency when the organisation has set one; what it is for in lower case after "for". */
  says: string;
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
  /** The category it is for, when the spending rules have categories (build step 9); otherwise null. */
  category: string | null;
  /** The evidence the rules ask for, in full sentences for whoever reads the board: "Spending on Fuel needs a receipt." Empty when none. */
  needs: string[];
  /**
   * Each question whoever decides it asked, and the answer, in full sentences for this reader (build
   * step 9, as leave has): "You asked Kamau on 5 October, “Is this for the Kisumu van?”"
   */
  questions: string[];
}

/** The person's own requests to spend (`mine`), newest first. */
export interface MySpending {
  currency: string | null;
  requests: {
    id: string; amount: number; what: string; status: 'waiting' | 'approved' | 'declined'; askedOn: string;
    /** The category it is for (build step 9), or null. */
    category: string | null;
    /** Each question asked about it, and the answer, in full sentences with "you" for the person. */
    questions: string[];
    /** The question still waiting for this person's answer, so the screen can offer a place to answer it; null when none waits. */
    questionWaiting: { id: string; question: string; askedBy: string } | null;
    /** What the person who declined it said: "Fatuma said, “The van is being sold.”" Null when they said nothing. */
    declinedBecause: string | null;
    /** The day finance marked it paid (build step 10), or null. */
    paidOn: string | null;
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
  /* The spending rules (build step 9). */
  category?: string | null; evidenceNeeded?: string[] | null;
  /* The reason a decline was given with. */
  declineReason?: string | null;
  /* Finance's part (build step 10). */
  verifiedById?: string | null; paidOn?: Date | null;
};
type Answers = { currency: string | null; limit: number | null; above: string | null; workflow?: AWorkflow; thresholds?: AThreshold[]; rules?: SpendRules };

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
    const ask = await askNameOf(this.prisma, reader.organizationId);
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

    const shared = { lookups: (await loadLookups(this.prisma, org, today).catch(() => undefined)) as Lookups | undefined, on: today };
    const names = await this.names(rows.map((r) => r.userId));
    const questions = await this.questionsOn(org, rows.filter((r) => r.status === 'waiting').map((r) => r.id));
    const askers = await this.firstNames(questions.flatMap((q) => [q.askedById, q.toUserId]));
    const waiting: Waiting[] = [];
    for (const r of rows.filter((x) => x.status === 'waiting' && x.userId !== reader.userId)) {
      const now = await this.now(org, r, answers, byUser, shared);
      const who = now.who.kind === 'admin' ? { kind: 'admin' as const } : { kind: now.who.kind === 'manager' ? 'manager' as const : 'person' as const, userId: now.who.userId };
      const decides = this.mayDecide(reader, role, r, who);
      /* A lead reads their own team's requests, and also any request that waits for them to decide. */
      if (!inScope(r.userId) && !decides) continue;
      const nm = names.get(r.userId);
      if (!nm?.full) continue;
      waiting.push({
        id: r.id, name: nm.full, firstName: nm.first, amount: n(r.amount), what: r.what, says: `${nm.first}: ${spendInWords(n(r.amount), answers.currency, r.what, shared.lookups?.knownNames)}`, team: r.team,
        left: leftOf(r.team),
        over: answers.limit != null && n(r.amount) > answers.limit,
        approver: who.kind === 'person'
          ? {
            kind: 'person', firstName: (await firstNamesOf(this.prisma, [who.userId], undefined, shared.lookups?.names))[0] ?? '',
            /* Standing in while the manager is on leave: served here, and not only in the sentence under it. */
            ...(now.who.kind === 'person' && now.who.standingInFor ? { standingInFor: (await firstNamesOf(this.prisma, [now.who.standingInFor], undefined, shared.lookups?.names))[0] ?? '' } : {}),
          }
          : { kind: who.kind },
        mayDecide: decides,
        where: whereItIsOnTheBoard(await this.whereItStands(r, now, decides, reader.userId, shared.lookups?.names)),
        category: r.category ?? null,
        needs: this.needsSaid(r, answers),
        /* What they attached, as the approvals queue says it, so whoever decides here sees it too (26 October 2026). */
        attached: whatWasAttachedSaid(nm.first || 'They', r as any),
        questions: questions.filter((q) => q.ref === r.id).flatMap((q) => aQuestionSaid(q, askers, reader.userId, ask)),
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
  async decide(reader: Reader, id: string, outcome: 'approved' | 'declined', today = new Date(), reasonGiven?: unknown, how: ADecisionHow = {}) {
    /* A reason may go with a decline (build step 9, as leave has), and is told to the person. */
    const reason = outcome === 'declined' ? wordsGiven(reasonGiven) : null;
    if (reason === 'too long') throw new BadRequestException(QUESTION_REFUSED.tooLong);
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
    /* ONE ANSWER WINS (a-request-is-answered-once.ts): nothing is written or recorded until the write that keeps this answer has found the request still waiting where it was read. */
    const here = whereItIsNow(r);
    const decided = () => recordIt(this.prisma, { organizationId: r.organizationId, suite: 'spend', ref: id, kind: outcome, byUserId: reader.userId, step: now.step, basis: { row: 'spend_requests', id, ...(reason ? { withAReason: true } : {}), ...(now.who.kind === 'person' && now.who.standingInFor ? { standingInFor: now.who.standingInFor } : {}) } });
    let passed: { step: number; userId: string }[] = [];
    if (outcome === 'approved' && !now.last) {
      /* The next step, unless whoever decides it has already approved it: then that step is passed too (who-may-decide.ts). */
      const moved = await this.passOnFrom(r, answers, byUser, { step: now.step + 1, escalatedTo: 0 }, approvedByIds, false);
      if (!moved.done) {
        const next = { ...r, step: moved.where.step, escalatedTo: moved.where.escalatedTo, stepSince: new Date(), approvedByIds };
        if (!(await claimIt(this.prisma.spendRequest, here, { step: next.step, escalatedTo: next.escalatedTo, stepSince: next.stepSince, approvedByIds }))) {
          throw await theyGotThereFirst(this.prisma, this.prisma.spendRequest, id, reader.userId);
        }
        await decided();
        await this.recordPassed(r, moved.passed);
        await this.tellWhoDecides(next, answers, {}, how.collect);
        return (how.lean ? undefined : await this.board(reader, today)) as Awaited<ReturnType<SpendingService['board']>>;
      }
      passed = moved.passed;
    }
    if (!(await this.claimTheEnd(r, here, outcome, reader.userId, approvedByIds, reason))) throw await theyGotThereFirst(this.prisma, this.prisma.spendRequest, id, reader.userId);
    await decided();
    await this.recordPassed(r, passed);
    await this.afterTheEnd(r, outcome, reader.userId, answers, reason);
    return (how.lean ? undefined : await this.board(reader, today)) as Awaited<ReturnType<SpendingService['board']>>;
  }

  /** It ends: approved at the last step, or declined at any. False when somebody answered it first. */
  private claimTheEnd(r: Row, here: ReturnType<typeof whereItIsNow>, outcome: 'approved' | 'declined', byUserId: string, approvedByIds: string[], reason?: string | null): Promise<boolean> {
    return claimIt(this.prisma.spendRequest, here, { status: outcome, decidedById: byUserId, decidedAt: new Date(), approvedByIds, ...(reason ? { declineReason: reason } : {}) });
  }

  /** After it ended: the person who asked is told. */
  private async afterTheEnd(r: Row, outcome: 'approved' | 'declined', byUserId: string, answers: Answers, reason?: string | null): Promise<void> {
    await this.tellThePerson(r, answers.currency, outcome, byUserId, reason);
    /* A question still waiting for the person's answer in Ask Groundwork is no longer asked. */
    await this.forgetTheQuestionsInAskGroundwork(r);
  }

  /** It ends, from the clock: true when this was the answer kept. */
  private async finish(r: Row, outcome: 'approved' | 'declined', byUserId: string, approvedByIds: string[], answers: Answers): Promise<boolean> {
    if (!(await this.claimTheEnd(r, whereItIsNow(r), outcome, byUserId, approvedByIds))) return false;
    await this.afterTheEnd(r, outcome, byUserId, answers);
    return true;
  }

  private async recordPassed(r: { id: string; organizationId: string }, passed: { step: number; userId: string }[]): Promise<void> {
    for (const p of passed) {
      await recordIt(this.prisma, { organizationId: r.organizationId, suite: 'spend', ref: r.id, kind: 'passed', toUserId: p.userId, step: p.step, basis: { row: 'spend_requests', id: r.id, alreadyApproved: true } });
    }
  }

  /**
   * Where a request goes from here: the step and rule given, passing each step whose approver has
   * already approved it at an earlier step, with "Omar had already approved it, so this step was
   * passed." kept in the record for each.
   */
  private async passOnFrom(r: Row, answers: Answers, byUser: Map<string, Dir>, from: { step: number; escalatedTo: number }, approvedByIds: string[], record = true, shared: { lookups?: Lookups; on?: Date } = {}) {
    const moved = await passWhatTheyAlreadyApproved(this.prisma, theStepsADecisionFollows(answers, n(r.amount)), {
      organizationId: r.organizationId, requesterUserId: r.userId,
      managerExternalId: byUser.get(r.userId)?.managerExternalId ?? null,
      team: r.team?.trim() || byUser.get(r.userId)?.department?.trim() || null,
    }, from, approvedByIds, shared);
    if (record) await this.recordPassed(r, moved.passed);
    return moved;
  }

  /**
   * ASK A QUESTION (decision 85, item 2; build step 9, as leave has). Whoever decides the request now
   * asks the person who made it, and the request keeps waiting. The person is told under their own
   * requests to spend, on Today, in Ask Groundwork the next time they write there, and on WhatsApp,
   * where they can reply with their answer.
   */
  async askAQuestion(reader: Reader, id: string, questionGiven: unknown, today = new Date()) {
    const question = wordsGiven(questionGiven);
    if (!question) throw new BadRequestException(QUESTION_REFUSED.emptyQuestion);
    if (question === 'too long') throw new BadRequestException(QUESTION_REFUSED.tooLong);
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    const r = (await this.prisma.spendRequest.findUnique({ where: { id } })) as Row | null;
    if (!r || r.organizationId !== reader.organizationId) throw new NotFoundException(SPEND_REFUSED.notFound);
    const dir = await this.directory(reader.organizationId);
    const byUser = new Map([...dir.values()].filter((p) => p.linkedUserId).map((p) => [p.linkedUserId as string, p]));
    const now = await this.now(reader.organizationId, r, answers, byUser);
    if (r.userId === reader.userId || !decidesIt(now.who, { userId: reader.userId, role }, r.userId)) throw new ForbiddenException(QUESTION_REFUSED.notYours);
    if (r.status !== 'waiting') throw new BadRequestException(QUESTION_REFUSED.notWaiting);
    const q = await (this.prisma as any).suiteQuestion.create({
      data: { organizationId: r.organizationId, suite: 'spend', ref: id, askedById: reader.userId, toUserId: r.userId, question },
      select: { id: true },
    });
    await recordIt(this.prisma, { organizationId: r.organizationId, suite: 'spend', ref: id, kind: 'questioned', byUserId: reader.userId, toUserId: r.userId, step: now.step, basis: { row: 'suite_questions', id: q.id } });
    /* Ask Groundwork holds it for the person's answer: the next thing they write there is said back as their answer. */
    const entry = await theirRosterEntry(this.prisma, r.organizationId, r.userId, { externalId: true }).catch(() => null);
    if (entry?.externalId && (this.prisma as any).assistantProposal?.create) {
      const asker = (await this.firstNames([reader.userId])).get(reader.userId) || 'The person who decides it';
      await (this.prisma as any).assistantProposal.create({
        data: {
          organizationId: r.organizationId, personExternalId: entry.externalId, kind: LEAVE_QUESTION_KIND,
          summary: `${asker} asked you a question about your request to spend ${spendInWords(n(r.amount), answers.currency, r.what)}.`,
          payload: { suite: 'spend', requestId: id, questionId: q.id } as never,
        },
      }).catch(() => undefined);
    }
    if (this.told) {
      const first = await this.told.firstNameOf(r.userId);
      await this.told.asked(r.organizationId, aSpendRequest(r.id, r.userId, first, n(r.amount), answers.currency, r.what), reader.userId, question).catch(() => false);
    }
    return this.board(reader, today);
  }

  /**
   * THE PERSON ANSWERS (build step 9): the latest question still waiting for them on their own request.
   * Only the person who asked to spend answers; the request keeps waiting, and whoever asked is told.
   */
  async answerAQuestion(reader: Reader, id: string, answerGiven: unknown): Promise<MySpending> {
    const answer = wordsGiven(answerGiven);
    if (!answer) throw new BadRequestException(QUESTION_REFUSED.emptyAnswer);
    if (answer === 'too long') throw new BadRequestException(QUESTION_REFUSED.tooLong);
    const answers = await this.suiteAnswers(reader.organizationId);
    const r = (await this.prisma.spendRequest.findUnique({ where: { id } })) as Row | null;
    if (!r || r.organizationId !== reader.organizationId) throw new NotFoundException(SPEND_REFUSED.notFound);
    if (r.userId !== reader.userId) throw new ForbiddenException(QUESTION_REFUSED.onlyThePersonWhoAskedToSpend);
    if (r.status !== 'waiting') throw new BadRequestException(QUESTION_REFUSED.notWaiting);
    const waiting = (await this.questionsOn(reader.organizationId, [id])).filter((q) => q.answer == null && q.toUserId === reader.userId).pop();
    if (!waiting) throw new BadRequestException(QUESTION_REFUSED.nothingToAnswer);
    await (this.prisma as any).suiteQuestion.update({ where: { id: waiting.id }, data: { answer, answeredAt: new Date() } });
    await recordIt(this.prisma, { organizationId: r.organizationId, suite: 'spend', ref: id, kind: 'answered', byUserId: reader.userId, toUserId: waiting.askedById, basis: { row: 'suite_questions', id: waiting.id } });
    await this.forgetTheQuestionsInAskGroundwork(r);
    if (this.told) {
      const first = await this.told.firstNameOf(r.userId);
      await this.told.answered(r.organizationId, waiting.askedById, aSpendRequest(r.id, r.userId, first, n(r.amount), answers.currency, r.what), answer).catch(() => false);
    }
    return this.mine(reader);
  }

  /** The question waiting for this person's answer on one of their requests, for Ask Groundwork. Null when none waits. */
  async questionWaitingFor(reader: Reader, id: string): Promise<{ askedBy: string; leave: string; question: string } | null> {
    const r = (await this.prisma.spendRequest.findUnique({ where: { id } }).catch(() => null)) as Row | null;
    if (!r || r.organizationId !== reader.organizationId || r.userId !== reader.userId || r.status !== 'waiting') return null;
    const q = (await this.questionsOn(reader.organizationId, [id])).filter((x) => x.answer == null && x.toUserId === reader.userId).pop();
    if (!q) return null;
    const answers = await this.suiteAnswers(reader.organizationId).catch(() => null);
    const askedBy = (await this.firstNames([q.askedById])).get(q.askedById) || 'The person who decides it';
    /* `leave` is the thing asked about, for the middle of a sentence, as the leave suite gives it. */
    return { askedBy, leave: `request to spend ${spendInWords(n(r.amount), answers?.currency ?? null, r.what)}`, question: q.question };
  }

  /** The person's own requests to spend, each with where it is. Nobody else's. */
  async mine(reader: Reader): Promise<MySpending> {
    const ask = await askNameOf(this.prisma, reader.organizationId);
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
    const questions = await this.questionsOn(reader.organizationId, rows.map((r) => r.id));
    const firsts = await this.firstNames([...questions.flatMap((q) => [q.askedById, q.toUserId]), ...rows.map((r) => r.decidedById ?? '')]);
    const requests: MySpending['requests'] = [];
    for (const r of rows) {
      const now = r.status === 'waiting' ? await this.now(reader.organizationId, r, answers, byUser) : null;
      requests.push({
        id: r.id, amount: n(r.amount), what: r.what, status: r.status as 'waiting' | 'approved' | 'declined', askedOn: r.createdAt.toISOString().slice(0, 10),
        category: r.category ?? null,
        questions: questions.filter((q) => q.ref === r.id).flatMap((q) => aQuestionSaid(q, firsts, reader.userId, ask)),
        questionWaiting: (() => {
          const q = r.status === 'waiting' ? questions.filter((x) => x.ref === r.id && x.answer == null && x.toUserId === reader.userId).pop() : undefined;
          return q ? { id: q.id, question: q.question, askedBy: firsts.get(q.askedById) || 'The person who decides it' } : null;
        })(),
        declinedBecause: r.status === 'declined' && r.declineReason?.trim()
          ? aReasonSaid(r.decidedById ? (firsts.get(r.decidedById) || 'The person who decided it') : 'The person who decided it', r.declineReason)
          : null,
        where: await this.whereYoursIs(r, now, answers, reader.userId),
        paidOn: r.paidOn ? r.paidOn.toISOString().slice(0, 10) : null,
      });
    }
    return { currency: answers.currency, requests };
  }

  /**
   * One request's record of who did what, in plain sentences (decision 85, build step 5), for the
   * people who may already read it: the person who asked, an admin, a lead of their team, and whoever
   * decides it now. Anybody else is told it was not found.
   */
  async history(reader: Reader, id: string): Promise<{ said: string[] }> {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    const r = (await this.prisma.spendRequest.findUnique({ where: { id } })) as Row | null;
    if (!r || r.organizationId !== reader.organizationId || !role) throw new NotFoundException(SPEND_REFUSED.notFound);
    const dir = await this.directory(reader.organizationId);
    const byUser = new Map([...dir.values()].filter((p) => p.linkedUserId).map((p) => [p.linkedUserId as string, p]));
    const me = byUser.get(reader.userId);
    const mayRead = r.userId === reader.userId || role === 'ADMIN'
      || (role === 'LEAD' && !!me && !!byUser.get(r.userId) && inTheLeadsTeam(me, byUser.get(r.userId)!))
      || (r.status === 'waiting' && decidesIt((await this.now(reader.organizationId, r, answers, byUser)).who, { userId: reader.userId, role }, r.userId))
      /* Whoever looks after finance reads the record of an approved request, which finance works on (build step 10). */
      || (r.status === 'approved' && (await readDuties(this.prisma, reader.organizationId).catch(() => ({} as any))).finance === reader.userId);
    if (!mayRead) throw new NotFoundException(SPEND_REFUSED.notFound);
    return aRequestsHistory(this.prisma, reader.organizationId, 'spend', id, reader.userId);
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

  /**
   * Once a day (a-request-waits-too-long.cron.ts): each request that has waited the set number of
   * working days for one person, or whose approver is on approved leave today, moves to the next rule
   * on its step's list, and whoever that names is told. Nothing moves while the admin has set no days.
   */
  async passOnWhatWaitsTooLong(organizationId: string, today = new Date(), collect?: { approverUserIds: string[]; request: AWaitingRequest }[]): Promise<PassedOn[]> {
    const answers = await this.suiteAnswers(organizationId).catch(() => null);
    if (!answers?.workflow?.escalateAfter) return [];
    const rows = (await this.prisma.spendRequest.findMany({ where: { organizationId, status: 'waiting' } })) as Row[];
    if (!rows.length) return [];
    const dir = await this.directory(organizationId);
    const byUser = new Map([...dir.values()].filter((p) => p.linkedUserId).map((p) => [p.linkedUserId as string, p]));
    /* Who decides each request is worked out in memory from what is read once, for the day the clock is run for. */
    const shared = { lookups: (await loadLookups(this.prisma, organizationId, today).catch(() => undefined)) as Lookups | undefined, on: today };
    const out: PassedOn[] = [];
    const toTell: { approverUserIds: string[]; request: AWaitingRequest }[] = [];
    for (const r of rows) {
      const comes = await whoComesNext(this.prisma, theStepsADecisionFollows(answers, n(r.amount)), {
        organizationId, requesterUserId: r.userId,
        managerExternalId: byUser.get(r.userId)?.managerExternalId ?? null,
        team: r.team?.trim() || byUser.get(r.userId)?.department?.trim() || null,
      }, r, shared);
      if (!comes) continue;
      const why = await whyPassOn(this.prisma, organizationId, comes.now, r.stepSince ?? r.createdAt, today, answers.workflow.escalateAfter, shared.lookups);
      if (!why) continue;
      /* Passed to somebody who already approved it at an earlier step: that step is passed for them. */
      const after = await this.passOnFrom(r, answers, byUser, { step: comes.now.step, escalatedTo: comes.next.at }, r.approvedByIds ?? [], false, shared);
      const escalated = () => recordIt(this.prisma, {
        organizationId, suite: 'spend', ref: r.id, kind: 'escalated', step: comes.now.step, toUserId: comes.next.who.kind === 'admin' ? null : comes.next.who.userId,
        basis: { row: 'spend_requests', id: r.id, fromUserId: comes.now.who.kind === 'admin' ? null : comes.now.who.userId, ...why },
      });
      if (after.done) {
        /* Written only if the request is still waiting where it was read: an answer given a moment ago wins, and the clock passes nothing on. */
        if (!(await this.finish(r, 'approved', after.passed[after.passed.length - 1].userId, r.approvedByIds ?? [], answers))) continue;
        await escalated();
        await this.recordPassed(r, after.passed);
        out.push({ ref: r.id, step: comes.now.step, from: comes.now.who, to: comes.next.who, why });
        continue;
      }
      if (!(await claimIt(this.prisma.spendRequest, whereItIsNow(r), { ...(after.passed.length ? { step: after.where.step } : {}), escalatedTo: after.where.escalatedTo, stepSince: today }))) continue;
      await escalated();
      await this.recordPassed(r, after.passed);
      await this.tellWhoDecides({ ...r, step: after.where.step, escalatedTo: after.where.escalatedTo, stepSince: today }, answers, shared, toTell);
      out.push({ ref: r.id, step: comes.now.step, from: comes.now.who, to: comes.next.who, why });
    }
    /* Whoever many were passed on to is written to once; whoever one was passed on to, as before. */
    /* Told together with what the other suites passed on at the same time, when the clock is collecting (a-request-waits-too-long.cron.ts). */
    if (collect) collect.push(...toTell); else await this.tellThemTogether(organizationId, toTell, today);
    return out;
  }

  /**
   * What the clock passed on is told together: an approver whom one request was passed on to is told of it, as before, and one whom
   * several were passed on to is written to once for all of them (a-request-told-on-whatsapp.service.ts). A sender that cannot say it
   * together tells each, as it always did.
   */
  private async tellThemTogether(organizationId: string, batch: { approverUserIds: string[]; request: AWaitingRequest }[], today: Date): Promise<void> {
    if (!this.told || !batch.length) return;
    try {
      if (typeof this.told.waitingMany === 'function') await this.told.waitingMany(organizationId, batch, today);
      else for (const b of batch) await this.told.waiting(organizationId, b.approverUserIds, b.request);
    } catch { /* the requests stand */ }
  }

  /** Whoever decides the step a request is on is told on WhatsApp (decision 82, item 1). */
  async tellWhoDecides(r: Row, answers?: Answers, shared: { lookups?: Lookups; on?: Date } = {}, batch?: { approverUserIds: string[]; request: AWaitingRequest }[]): Promise<void> {
    if (!this.told) return;
    try {
      const a = answers ?? (await this.suiteAnswers(r.organizationId));
      const dir = await this.directory(r.organizationId);
      const byUser = new Map([...dir.values()].filter((p) => p.linkedUserId).map((p) => [p.linkedUserId as string, p]));
      const now = await this.now(r.organizationId, r, a, byUser, shared);
      const first = await this.told.firstNameOf(r.userId);
      const approverUserIds = await this.told.approversOf(r.organizationId, now.who, r.userId);
      const request = aSpendRequest(r.id, r.userId, first, n(r.amount), a.currency, r.what);
      /* Passed on by the clock with others: collected, and told together at the end, so an approver is not told once for each. */
      if (batch) { batch.push({ approverUserIds, request }); return; }
      await this.told.waiting(r.organizationId, approverUserIds, request);
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
  async checkForChat(organizationId: string, userId: string, amount: number, today = new Date(), categoryName?: string | null) {
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
    /*
     * THE SPENDING RULES (build step 9). The highest threshold this is over, when one is, is the amount
     * said back in place of the limit, with whoever decides each later step. The evidence needed is
     * said to the person before the yes. With no rules set, none of this is said.
     */
    const rules = answers.rules ?? {};
    const crossed = theThresholdCrossed(rules, amount);
    const category = theCategoryCalled(categoryName, rules);
    const thenTo: string[] = [];
    if (crossed && crossed.steps.length > 1) {
      for (let step = 1; step < crossed.steps.length; step++) {
        const later = await this.now(organizationId, { userId, amount, step }, answers, byUser);
        thenTo.push(await whoInWords(this.prisma, later.who, later.team));
      }
    }
    return {
      ...checked, waiting, limit: answers.limit, approverFirstName: first,
      ...(crossed ? { bar: crossed.above, thenTo } : {}),
      rules,
      evidence: theEvidenceSaid(theEvidenceNeeded(rules, amount, category), category, answers.currency, true),
    };
  }

  /** A request to spend, as the engine records it once the person has confirmed it (request 26). No route. */
  async ask(organizationId: string, userId: string, input: { amount: number; what: string; proposalId?: string | null; category?: string | null }) {
    return oneAtATime(`spend|${organizationId}|${userId}|${input.amount}|${(input.what ?? '').trim()}`, () => this.askOnce(organizationId, userId, input));
  }

  private async askOnce(organizationId: string, userId: string, input: { amount: number; what: string; proposalId?: string | null; category?: string | null }) {
    const answers = await this.suiteAnswers(organizationId);
    const role = await this.roleOf({ userId, organizationId });
    if (!role || role === 'GUEST') throw new ForbiddenException(SPEND_REFUSED.notInIt);
    if (typeof input.amount !== 'number' || !Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 1e12) throw new BadRequestException(SPEND_REFUSED.badAmount);
    const what = (input.what ?? '').trim().slice(0, 300);
    if (!what) throw new BadRequestException(SPEND_REFUSED.badWhat);
    /* The category, when the rules have them, and the evidence they ask for (build step 9). With no rules, neither is kept. */
    const rules = answers.rules ?? {};
    let category: ASpendCategory | null = null;
    if (input.category != null && input.category !== '') {
      category = theCategoryCalled(input.category, rules);
      if (!category) throw new BadRequestException(SPEND_REFUSED.badCategory);
    }
    const evidenceNeeded = [...new Set(theEvidenceNeeded(rules, input.amount, category).map((e) => e.what))];
    const person = await theirRosterEntry(this.prisma, organizationId, userId, { department: true, managerExternalId: true });
    const team = person?.department?.trim() || null;
    /* The only admin cannot decide their own request, and nobody else could: said now, not after it has waited for ever. */
    if (await nobodyElseCanDecide(this.prisma, theStepsADecisionFollows(answers, input.amount), { organizationId, requesterUserId: userId, managerExternalId: (person as any)?.managerExternalId ?? null, team }, role)) {
      throw new BadRequestException(NOBODY_ELSE_CAN_DECIDE);
    }
    /* The same request while the first still waits is that request (B-147): nothing new is made and the approver hears once. */
    const already = await (this.prisma.spendRequest as any).findFirst?.({ where: { organizationId, userId, amount: input.amount, what, status: 'waiting' }, select: { id: true } }).catch(() => null);
    if (already?.id) return { id: already.id };
    const created = await this.prisma.spendRequest.create({
      data: { organizationId, userId, amount: input.amount, what, team, ...(category ? { category: category.name } : {}), ...(evidenceNeeded.length ? { evidenceNeeded } : {}) },
      select: { id: true },
    });
    /* One record of who did what (decision 85, build step 5): asked, after the say-back and the yes when there was one. */
    if (created?.id) await recordIt(this.prisma, { organizationId, suite: 'spend', ref: created.id, kind: 'asked', byUserId: userId, basis: { row: 'spend_requests', id: created.id, ...(input.proposalId ? { proposalId: input.proposalId } : {}) } });
    /* Whoever decides the first step is told on WhatsApp too (decision 82, item 1): the lead, the person named for over the limit, or the admins. */
    if (this.told && created?.id) {
      await this.tellWhoDecides({ id: created.id, organizationId, userId, amount: input.amount, what, team, status: 'waiting', createdAt: new Date() }, answers);
    }
    return created;
  }

  /** The person who asked is told what was decided, on WhatsApp (decision 82, item 1). True when it went. */
  async tellThePerson(r: { id: string; organizationId: string; userId: string; amount: unknown; what: string }, currency: string | null, outcome: 'approved' | 'declined', deciderUserId: string, reason?: string | null): Promise<boolean> {
    if (!this.told) return false;
    const first = await this.told.firstNameOf(r.userId);
    const request = aSpendRequest(r.id, r.userId, first, n(r.amount), currency, r.what);
    return (reason ? this.told.decided(r.organizationId, request, outcome, deciderUserId, reason) : this.told.decided(r.organizationId, request, outcome, deciderUserId)).catch(() => false);
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
    answers: Answers, byUser: Map<string, Dir>, shared: { lookups?: Lookups; on?: Date } = {},
  ): Promise<DecidesNow> {
    return whoDecidesNow(this.prisma, theStepsADecisionFollows(answers, n(r.amount)), {
      organizationId, requesterUserId: r.userId,
      managerExternalId: byUser.get(r.userId)?.managerExternalId ?? null,
      team: r.team?.trim() || byUser.get(r.userId)?.department?.trim() || null,
    }, r, shared);
  }

  /** Who approved it so far, who it waits for now and who declined it, as names; "you" for the reader. */
  private async whereItStands(r: Row, now: DecidesNow | null, readerDecides: boolean, readerUserId: string, cache?: Map<string, string>): Promise<WhereItStands> {
    const status = r.status as WhereItStands['status'];
    return {
      status,
      approvedBy: await firstNamesOf(this.prisma, approversOf(r), readerUserId, cache),
      waitingFor: status === 'waiting' && now ? (readerDecides ? 'you' : await whoInWords(this.prisma, now.who, now.team, readerUserId, cache)) : null,
      declinedBy: status === 'declined' && r.decidedById ? (await firstNamesOf(this.prisma, [r.decidedById], readerUserId, cache))[0] ?? null : null,
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

  /**
   * Where the person's own request is, in a full sentence. Once finance has paid it: "Your request to
   * spend KES 12,000 for fuel was paid on 6 October." Once finance has checked it: "... is approved by
   * Fatuma. Omar in finance has checked it, and it is waiting to be paid." Otherwise as before.
   */
  private async whereYoursIs(r: Row, now: DecidesNow | null, answers: Answers, readerUserId: string): Promise<string> {
    const thing = `Your request to spend ${spendInWords(n(r.amount), answers.currency, r.what)}`;
    if (r.status === 'approved' && r.paidOn) return `${thing} was paid on ${saidAsADate(new Date(`${r.paidOn.toISOString().slice(0, 10)}T12:00:00.000Z`))}.`;
    const where = whereYourRequestIs(thing, await this.whereItStands(r, now, false, readerUserId));
    if (r.status === 'approved' && r.verifiedById) {
      const by = (await firstNamesOf(this.prisma, [r.verifiedById], readerUserId))[0];
      return `${where} ${by ? `${by.charAt(0).toUpperCase()}${by.slice(1)} in finance has` : 'Finance has'} checked it, and it is waiting to be paid.`;
    }
    return where;
  }

  /** The questions asked on these requests, oldest first. A test built by hand may have no table. */
  private async questionsOn(organizationId: string, ids: string[]): Promise<(AQuestion & { ref: string })[]> {
    const table = (this.prisma as any).suiteQuestion;
    if (!ids.length || !table?.findMany) return [];
    return ((await table.findMany({ where: { organizationId, suite: 'spend', ref: { in: ids } }, orderBy: { askedAt: 'asc' } }).catch(() => [])) ?? []) as (AQuestion & { ref: string })[];
  }

  /** First names of sign-ins, by id. Never an address. */
  private async firstNames(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return new Map();
    const us = await this.prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, firstName: true } }).catch(() => []);
    return new Map((us ?? []).map((u: any) => [u.id, u.firstName?.trim() || '']));
  }

  /** The person's question in Ask Groundwork is no longer waiting: answered, or the request decided. */
  private async forgetTheQuestionsInAskGroundwork(r: { id: string; organizationId: string; userId: string }) {
    const table = (this.prisma as any).assistantProposal;
    if (!table?.updateMany) return;
    const entry = await theirRosterEntry(this.prisma, r.organizationId, r.userId, { externalId: true }).catch(() => null);
    if (!entry?.externalId) return;
    await table.updateMany({
      where: { organizationId: r.organizationId, personExternalId: entry.externalId, kind: LEAVE_QUESTION_KIND, state: 'PARKED', payload: { path: ['requestId'], equals: r.id } },
      data: { state: 'DROPPED', resolvedAt: new Date() },
    }).catch(() => undefined);
  }

  /** The evidence a request needs, said for whoever reads the board, from what was kept when it was asked. */
  private needsSaid(r: Row, answers: Answers): string[] {
    const kept = (r.evidenceNeeded ?? []).filter((e): e is 'receipt' | 'quote' => e === 'receipt' || e === 'quote');
    if (!kept.length) return [];
    const rules = answers.rules ?? {};
    const category = theCategoryCalled(r.category, rules);
    const needs = theEvidenceNeeded(rules, n(r.amount), category).filter((e) => kept.includes(e.what));
    /* The rule may have changed since: what was asked for still stands, said plainly. */
    const said = theEvidenceSaid(needs, category, answers.currency, false);
    for (const e of kept) if (!needs.some((x) => x.what === e)) said.push(`This request needs ${e === 'receipt' ? 'a receipt' : 'a quote'}.`);
    return said;
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
    const a = answersUnderTheQuestionsOwnIds(suiteOf('spend')!, suite.answers) as Record<string, unknown>;
    /* The spending rules an admin set (the-spending-rules.ts). None: no category, no evidence, no thresholds. */
    const rules = await readSpendRules(this.prisma, organizationId).catch(() => ({} as SpendRules));
    return {
      rules,
      ...(rules.thresholds?.length ? { thresholds: rules.thresholds } : {}),
      currency: typeof a.currency === 'string' && a.currency ? a.currency : null,
      limit: typeof a.limit === 'number' ? a.limit : null,
      above: typeof a.above === 'string' && a.above ? a.above : null,
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
