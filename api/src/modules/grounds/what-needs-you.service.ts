import { Injectable, Optional } from '@nestjs/common';
import { isNotLetInYet, whoIsNotLetInYet } from './who-an-admin-did-not-let-in';
import { PrismaService } from '../prisma/prisma.service';
import { GroundsService } from './grounds.service';
import { whatNeedsYou, type Need, type WhatNeedsYou } from './what-needs-you';
import { LeaveBoardService } from '../suites/the-leave-board.service';
import { whoIsAwayOn } from '../suites/who-is-away';
import { TimeSheetsService } from '../suites/the-time-sheets.service';
import { SpendingService } from '../suites/the-spending.service';
import { waitingForYouToApprove } from './waiting-for-you-to-approve';
import { ReviewsService } from '../suites/the-reviews.service';
import { reviewsToStartOnToday, yourReviewsOnToday } from './a-review-on-today';
import { aQuestionOnToday, inQuotes } from '../suites/a-question-about-a-request';
import { leaveInWords, spendInWords } from '../suites/a-request-in-words';
import { peersAreNamedOn } from '../reports/peers-are-named';
import { whatEachLabelIsCalled, withoutInternalLabelsIn } from '../reports/no-internal-label-reaches-anyone';

/**
 * THE ONE READ OF "WHAT NEEDS YOU" (C1, U.5), for Today and for "Choose an organisation".
 *
 * Built only from what this reader is already given: `GroundsService.list()`, which applies the one
 * rule for who reads which check-in, the approvals queue, which is asked for only when the reader
 * is an admin of that organisation, and what each suite board serves this reader. See what-needs-you.ts.
 */
@Injectable()
export class WhatNeedsYouService {
  constructor(
    private prisma: PrismaService,
    private grounds: GroundsService,
    @Optional() private leave?: LeaveBoardService,
    @Optional() private time?: TimeSheetsService,
    @Optional() private spend?: SpendingService,
    @Optional() private reviews?: ReviewsService,
  ) {}

  /**
   * PERFORMANCE REVIEWS ON TODAY (item 16), from the reviews suite's own reads as this reader: their own
   * reviews once somebody has started them (`mine`), and the reviews ready for them to start (the
   * board's `mayStart`). The board is asked for every reader, because the rules can name a member to
   * write a review (decision 85), and the board itself decides who may open it: a member nobody names,
   * or a suite that is off, is refused, which is "nothing here", never an error on Today. See
   * a-review-on-today.ts.
   */
  private async reviewsFor(userId: string, organizationId: string): Promise<Need[]> {
    if (!this.reviews) return [];
    const reader = { userId, organizationId };
    const now = new Date();
    const [mine, next] = await Promise.all([
      this.reviews.mine(reader).catch(() => []),
      this.reviews.board(reader, now).then((b) => b.next).catch(() => []),
    ]);
    return [...yourReviewsOnToday(mine, organizationId, now), ...reviewsToStartOnToday(next, organizationId, now)];
  }

  /**
   * A QUESTION ABOUT YOUR OWN LEAVE, WAITING FOR YOUR ANSWER (decision 85, build step 7), from the
   * leave suite's own read of this person's requests (`mine`). Nobody else's: "Wairimu asked you a
   * question about your leave from Monday 12 October to Friday 16 October.", with the question itself.
   */
  private async leaveQuestionsFor(userId: string, organizationId: string): Promise<Need[]> {
    if (!this.leave) return [];
    /* Never an error on Today: a board built without `mine`, or a suite that is off, is nothing here. */
    const mine = await Promise.resolve().then(() => this.leave!.mine({ userId, organizationId })).catch(() => null);
    return (mine?.requests ?? []).filter((r) => r.questionWaiting).map((r) => ({
      key: `leave-question-${r.id}`,
      kind: 'decide' as const,
      title: aQuestionOnToday(r.questionWaiting!.askedBy, leaveInWords(r.startsOn, r.endsOn)),
      detail: `${r.questionWaiting!.askedBy} asked, ${inQuotes(r.questionWaiting!.question)} Your request is still waiting.`,
      action: { label: 'Answer it', to: '/suite/leave' },
      groundId: '',
      organizationId,
    }));
  }

  /**
   * A QUESTION ABOUT YOUR OWN REQUEST TO SPEND, WAITING FOR YOUR ANSWER (build step 9), from the spending
   * suite's own read of this person's requests (`mine`). Nobody else's: "Fatuma asked you a question
   * about your request to spend KES 12,000 for tyres for the van.", with the question itself.
   */
  private async spendQuestionsFor(userId: string, organizationId: string): Promise<Need[]> {
    if (!this.spend) return [];
    const mine = await Promise.resolve().then(() => this.spend!.mine({ userId, organizationId })).catch(() => null);
    return (mine?.requests ?? []).filter((r) => r.questionWaiting).map((r) => ({
      key: `spend-question-${r.id}`,
      kind: 'decide' as const,
      title: aQuestionOnToday(r.questionWaiting!.askedBy, `request to spend ${spendInWords(r.amount, mine?.currency ?? null, r.what)}`),
      detail: `${r.questionWaiting!.askedBy} asked, ${inQuotes(r.questionWaiting!.question)} Your request is still waiting.`,
      action: { label: 'Answer it', to: '/suite/spend' },
      groundId: '',
      organizationId,
    }));
  }

  /**
   * WHAT IS WAITING FOR THIS READER TO APPROVE (week 21): leave, hours and spending, from each
   * board's own read, which says row by row whether this reader is the one who approves it. Every
   * reader's boards are asked, because the rules can name a member to decide (decisions 85 and 86),
   * as Ask Groundwork, WhatsApp and the daily summary already tell them. Each board decides who may
   * open it: a member nobody names, or a board that is switched off, is refused, and a refusal here
   * is "nothing waiting", never an error on Today.
   */
  private async toApprove(userId: string, organizationId: string) {
    const reader = { userId, organizationId };
    const [leave, time, spend] = await Promise.all([
      this.leave?.board(reader).then((b) => b.waiting).catch(() => []),
      this.time?.board(reader).then((b) => b.weeks.flatMap((w) => w.people.map((p) => ({ ...p, weekOf: w.weekOf })))).catch(() => []),
      this.spend?.board(reader).catch(() => null),
    ]);
    return waitingForYouToApprove({ leave: leave ?? [], hours: time ?? [], spend: spend?.waiting ?? [], currency: spend?.currency ?? null }, organizationId);
  }

  async forReader(userId: string, email: string, organizationId: string, role: string): Promise<WhatNeedsYou> {
    const [list, waiting, me, toApprove, reviews, leaveQuestions, spendQuestions] = await Promise.all([
      this.grounds.list(organizationId, userId, email, role),
      role === 'ADMIN' ? this.grounds.listAwaitingApproval(organizationId, userId) : Promise.resolve([]),
      /**
       * NOT LET IN YET (U.8 third review, PRIVACY). One cheap read of the reader's own account,
       * so Today can stop offering a check-in to start or a report to read to somebody the
       * conversation layer would refuse at the door anyway (`awaitingOrgApproval`,
       * conversation.service.ts's `CANNOT_CHECK_IN_YET`) - and never something released, which is
       * exactly the word CLAUDE.md's privacy rule uses for who gets to read a shared report.
       */
      this.prisma.user.findUnique({ where: { id: userId }, select: { awaitingOrgApproval: true } }),
      this.toApprove(userId, organizationId),
      this.reviewsFor(userId, organizationId),
      this.leaveQuestionsFor(userId, organizationId),
      this.spendQuestionsFor(userId, organizationId),
    ]);
    /*
     * ONLY THIS ORGANISATION'S (U.5 review). The list also carries check-ins in other organisations
     * the reader takes part in, and Today used to lead with one of those, so "Today 3" disagreed with
     * "N new" on Choose an organisation. Another organisation's needs are counted there, not here.
     */
    const here = (list as any[]).filter((g) => g.organizationId === organizationId);
    /*
     * SOMEBODY AN ADMIN DID NOT LET IN IS NEITHER COUNTED NOR NAMED (screens request 95). The same
     * rule the board reads (request 85): of the people still waiting for approval, those whose latest
     * request to this organisation was declined.
     */
    /* And, by decision 77, nobody an admin has not let in yet, waiting or declined, is counted either. */
    for (const g of here) {
      if (!(g.participants ?? []).some(isNotLetInYet)) continue;
      const held = await whoIsNotLetInYet(this.prisma, g.participants ?? [], organizationId);
      if (held.size) g.participants = (g.participants ?? []).map((p: any) => (held.has(p.id) ? { ...p, notLetIn: true } : p));
    }
    /* On approved leave today (week 23): their own check-in says the round does not wait for them. Dates only. */
    const awayUntil = (await whoIsAwayOn(this.prisma, [userId], organizationId).catch(() => new Map<string, string>())).get(userId) ?? null;
    const told = whatNeedsYou(here as any, { userId, role, organizationId, notLetIn: !!me?.awaitingOrgApproval, awayUntil }, waiting.map((w) => ({ ...w, organizationId })), new Date(), [...reviews, ...leaveQuestions, ...spendQuestions, ...toApprove]);
    /* A net: no address stands in for a name in any sentence on Today (week 12c). */
    const called = new Map<string, string>();
    for (const g of here as any[]) {
      const runsIt = g.initiatorId === userId || role === 'ADMIN';
      const me = (g.participants ?? []).find((p: any) => p.userId === userId);
      for (const [k, v] of whatEachLabelIsCalled(g.participants ?? [], { viewerParticipantId: me?.id ?? null, viewerIsLead: runsIt, peersAreNamed: runsIt || peersAreNamedOn(g, { participantId: me?.id ?? null }) })) if (k[0] === '@' || k[0] === '~') called.set(k, v);
    }
    return called.size ? withoutInternalLabelsIn(told, called) : told;
  }

  /**
   * HOW MANY THINGS NEED YOU IN EACH ORGANISATION YOU BELONG TO: the "3 new" on each row of "Choose
   * an organisation". Each one is read with the role you have THERE, never the one you have here, and
   * only that organisation's own check-ins are counted, so nothing is counted twice.
   */
  async everywhere(userId: string, email: string): Promise<{ organizationId: string; count: number }[]> {
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { userId },
      select: { organizationId: true, role: true },
    });
    return Promise.all(
      memberships.map(async (m) => {
        const read = await this.forReader(userId, email, m.organizationId, String(m.role));
        return { organizationId: m.organizationId, count: read.needs.filter((n) => n.organizationId === m.organizationId).length };
      }),
    );
  }
}
