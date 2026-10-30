import { eachQuestionOnce, aDirectionPastItsDay } from './today-says-each-thing-once';
import { theInvoicesLateToRaiseFor } from '../board/raising-invoices-on-time';
import { Injectable, Optional } from '@nestjs/common';
import { theCheckInsHeldForASeat } from '../participants/held-for-a-seat';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { connectWhatsAppFor, YOU_CAN_ALSO_CHECK_IN_ON_WHATSAPP } from '../whatsapp/connect-whatsapp';
import { keptOffThePhone } from '../whatsapp/a-check-in-kept-off-the-phone';
import { BoardService } from '../board/board.service';
import { whatTheBoardAsksOfTheLead } from './what-the-board-asks-of-the-lead';
import { isShut } from './a-ground-that-has-ended';
import { isNotLetInYet, whoIsNotLetInYet } from './who-an-admin-did-not-let-in';
import { whoHasNotJoinedYet } from './invited-not-joined-yet';
import { theFreeTrialLine } from './the-free-trial-on-today';
import { PrismaService } from '../prisma/prisma.service';
import { theDirectMorningIsOn } from '../organisation/the-direct-morning-switch';
import { GroundsService } from './grounds.service';
import { whatNeedsYou, needsSaidDirectly, type Need, type WhatNeedsYou } from './what-needs-you';
import { LeaveBoardService } from '../suites/the-leave-board.service';
import { whoIsAwayOn } from '../suites/who-is-away';
import { TimeSheetsService } from '../suites/the-time-sheets.service';
import { SpendingService } from '../suites/the-spending.service';
import { SpendingForFinanceService } from '../suites/the-spending-for-finance.service';
import { waitingForYouToApprove } from './waiting-for-you-to-approve';
import { ReviewsService } from '../suites/the-reviews.service';
import { reviewsToStartOnToday, yourReviewsOnToday } from './a-review-on-today';
import { aQuestionOnToday, inQuotes } from '../suites/a-question-about-a-request';
import { leaveInWords, spendInWords } from '../suites/a-request-in-words';
import { peersAreNamedOn } from '../reports/peers-are-named';
import { whatEachLabelIsCalled, withoutInternalLabelsIn } from '../reports/no-internal-label-reaches-anyone';
import { everythingOutstandingFor } from '../engagement/the-leads-daily-nudge';
import { whatTheLeadIsToldOnToday, type WhatTheLeadIsToldOnToday } from '../engagement/what-the-lead-is-told-on-today';
import { TheWeeklyReportService } from '../reports/the-weekly-report.service';
import { whatTodayReads } from '../reports/what-today-reads-from-the-record';
import { theSameWaitInOtherWords } from '../board/reads';
import { whatThePersonIsToldAboutMissing, keepTheirReason } from './missed-check-ins';

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
    @Optional() private finance?: SpendingForFinanceService,
    @Optional() private readonly moduleRef?: ModuleRef,
    @Optional() private readonly config?: ConfigService,
  ) {}

  /**
   * "YOU CAN ALSO CHECK IN ON WHATSAPP" ON TODAY (fix list, item 5): served only when one of the reader's own check-ins is
   * there to answer, one of those is not kept in the app, and WhatsApp is on for their organisation with Groundwork's
   * number to write to. Not for somebody who already writes from their number. Null otherwise.
   */
  async checkInOnWhatsAppFor(userId: string, email: string, organizationId: string, needs: Need[]): Promise<{ says: string; link: string; label: string } | null> {
    try {
      if (!this.config) return null;
      const toAnswer = needs.filter((n) => /^\/checkin\/[^/]+$/.test(n.action?.to ?? '') && n.groundId).map((n) => n.groundId as string);
      if (!toAnswer.length) return null;
      const grounds: { overWhatsApp?: boolean | null }[] = await (this.prisma as any).ground.findMany({ where: { id: { in: [...new Set(toAnswer)] }, organizationId }, select: { overWhatsApp: true } });
      if (!grounds.some((g) => !keptOffThePhone(g))) return null;
      const connect = await connectWhatsAppFor(this.prisma, this.config, { organizationId, userId, email });
      return connect ? { says: YOU_CAN_ALSO_CHECK_IN_ON_WHATSAPP, link: connect.link, label: connect.says } : null;
    } catch {
      return null;
    }
  }

  /**
   * WHAT THE BOARD ASKS OF THIS READER, for each check-in they run (request 122): the board's own `leadActions` and
   * `decisions`, read as this reader, so Today and the board say the same. Never an error on Today: a board that
   * cannot be read is nothing here. See what-the-board-asks-of-the-lead.
   */
  private async whatTheirBoardsAsk(userId: string, here: any[]): Promise<Need[]> {
    const board = this.moduleRef?.get(BoardService, { strict: false });
    if (!board) return [];
    const mine = here.filter((g) => !!g.initiatorId && g.initiatorId === userId && !isShut(g.status) && !g.closedAt && !g.resolvedAt);
    const read = await Promise.all(mine.map((g) =>
      Promise.resolve().then(() => board.get(g.id, userId)).then((b) => whatTheBoardAsksOfTheLead(b, g)).catch(() => [] as Need[]),
    ));
    /* One question, once, naming the check-ins it is for (today-says-each-thing-once.ts). */
    return eachQuestionOnce(read.flat());
  }

  /** For an admin, who sets the company's direction: its aim's day has passed, so what is it now (today-says-each-thing-once.ts). */
  private async aDirectionPastItsDayFor(organizationId: string, role: string): Promise<Need[]> {
    if (role !== 'ADMIN') return [];
    const d = await Promise.resolve((this.prisma as any).directionVersion?.findFirst?.({ where: { organizationId }, orderBy: { version: 'desc' }, select: { now: true, setAt: true } })).catch(() => null);
    const need = aDirectionPastItsDay(d ?? null, organizationId, new Date());
    return need ? [need] : [];
  }

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
      action: { label: 'Answer it', to: '/suite/mine' },
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
      action: { label: 'Answer it', to: '/suite/mine' },
      groundId: '',
      organizationId,
    }));
  }

  /**
   * APPROVED REQUESTS TO SPEND WAITING FOR FINANCE (build step 10), for whoever looks after finance
   * only: how many, never whose. "Three approved requests to spend are waiting for you in finance."
   */
  private async financeFor(userId: string, organizationId: string): Promise<Need[]> {
    if (!this.finance) return [];
    const w = await Promise.resolve().then(() => this.finance!.waitingFor({ userId, organizationId })).catch(() => null);
    if (!w || w.toCheck + w.toPay === 0) return [];
    const word = (k: number) => (k <= 10 ? ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][k] : String(k));
    const Word = (k: number) => `${word(k).charAt(0).toUpperCase()}${word(k).slice(1)}`;
    const all = w.toCheck + w.toPay;
    const parts: string[] = [];
    if (w.toCheck) parts.push(`${word(w.toCheck)} ${w.toCheck === 1 ? 'has' : 'have'} not been checked yet`);
    if (w.toPay) parts.push(`${word(w.toPay)} ${w.toPay === 1 ? 'is' : 'are'} checked and waiting to be paid`);
    const detail = all === 1
      ? (w.toCheck ? 'It has not been checked yet.' : 'It is checked and waiting to be paid.')
      : `${parts.join(', and ').replace(/^./, (c) => c.toUpperCase())}.`;
    return [{
      key: 'spend-finance',
      kind: 'decide' as const,
      title: all === 1 ? 'One approved request to spend is waiting for you in finance.' : `${Word(all)} approved requests to spend are waiting for you in finance.`,
      detail,
      action: { label: 'Open them', to: '/suite/spend' },
      groundId: '',
      organizationId,
    }];
  }

  /**
   * YOUR OWN HOURS THIS WEEK (decision 85, build step 11), for the person only, from the time sheets
   * suite's own read (`standing`): only when the time sheet rules ask this person for a number of hours
   * a week and some are still to come. "You have recorded 31 hours this week. You still need 9 hours by
   * Friday at 17:00." With no rules set, or a suite that is off, nothing here, never an error.
   */
  private async hoursFor(userId: string, organizationId: string): Promise<Need[]> {
    if (!this.time?.standing) return [];
    const s = await Promise.resolve().then(() => this.time!.standing({ userId, organizationId })).catch(() => null);
    if (!s?.said || !s.stillNeeds) return [];
    return [{
      key: 'time-standing',
      kind: 'look' as const,
      title: s.said,
      detail: 'Tell Groundwork your hours in your check-in or in Ask Groundwork. There is no grid to fill in.',
      action: { label: 'See your hours', to: '/suite/time' },
      groundId: '',
      organizationId,
    }];
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

  /**
   * SOMEBODY WAITING TO BE LET INTO THE ORGANISATION, TOLD TO THE ADMINS ON TODAY (B-097). Halima was waiting and had been emailed about, and Grace's
   * Today said "Nothing needs you right now". Only an admin of the organisation is told, by name and by who invited them, never what the invitation was
   * for beyond the check-in's name; three or more are said once, with the count. Never an error on Today.
   */
  private async peopleWaitingToBeLetIn(userId: string, organizationId: string, role: string): Promise<Need[]> {
    if (role !== 'ADMIN') return [];
    const rows = await Promise.resolve().then(() => this.prisma.membershipRequest.findMany({
      where: { organizationId, status: 'PENDING' as any },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, groundId: true, requestedByUserId: true, user: { select: { firstName: true, lastName: true } } },
    })).catch(() => [] as any[]);
    const waiting = (rows as any[]).filter((r) => !!r);
    if (!waiting.length) return [];
    const base = { groundId: '', organizationId, kind: 'decide' as const, action: { label: 'Look at who is waiting', to: '/org/members' } };
    const org = await Promise.resolve().then(() => this.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } })).catch(() => null);
    const orgName = (org as any)?.name?.trim() || 'your organisation';
    if (waiting.length >= 3) {
      return [{ ...base, key: 'let-in-many', title: `${waiting.length} people are waiting for you to let them into ${orgName}.`, detail: null }];
    }
    const askerIds = [...new Set(waiting.map((r) => r.requestedByUserId).filter((x): x is string => !!x))];
    const groundIds = [...new Set(waiting.map((r) => r.groundId).filter((x): x is string => !!x))];
    const [askers, grounds] = await Promise.all([
      askerIds.length ? this.prisma.user.findMany({ where: { id: { in: askerIds } }, select: { id: true, firstName: true } }).catch(() => []) : [],
      groundIds.length ? this.prisma.ground.findMany({ where: { id: { in: groundIds } }, select: { id: true, label: true } }).catch(() => []) : [],
    ]);
    return waiting.map((r) => {
      const name = [r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ').trim() || 'Someone';
      const by = (askers as any[]).find((a) => a.id === r.requestedByUserId)?.firstName ?? null;
      const label = (grounds as any[]).find((g) => g.id === r.groundId)?.label ?? null;
      const detail = by && label ? `${by} invited ${name === 'Someone' ? 'them' : name.split(' ')[0]} to ${label}.` : by ? `${by} invited ${name === 'Someone' ? 'them' : name.split(' ')[0]}.` : null;
      return { ...base, key: `let-in-${r.id}`, title: `${name} is waiting for you to let them into ${orgName}.`, detail };
    });
  }

  async forReader(userId: string, email: string, organizationId: string, role: string): Promise<WhatNeedsYou> {
    const [list, waiting, me, toApprove, reviews, leaveQuestions, spendQuestions, finance, hours, letIn, directionPast] = await Promise.all([
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
      this.financeFor(userId, organizationId),
      this.hoursFor(userId, organizationId),
      this.peopleWaitingToBeLetIn(userId, organizationId, role),
      this.aDirectionPastItsDayFor(organizationId, role),
    ]);
    /*
     * ONLY THIS ORGANISATION'S (U.5 review). The list also carries check-ins in other organisations
     * the reader takes part in, and Today used to lead with one of those, so "Today 3" disagreed with
     * "N new" on Choose an organisation. Another organisation's needs are counted there, not here.
     */
    /* AND NOTHING OF A CHECK-IN THE READER IS HELD FOR A SEAT ON (second review, new leak A; privacy row 5, kept by decision 93): no card, no report sentence, no link. */
    const heldForASeat = await theCheckInsHeldForASeat(this.prisma as any, (list as any[]).map((g) => g.id), userId);
    const here = (list as any[]).filter((g) => g.organizationId === organizationId && !heldForASeat.has(g.id));
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
    /* Invited, not joined yet (decision 8 redone): neither counted nor missed, and said as that. The list may have marked them already. */
    for (const g of here) {
      if ((g.participants ?? []).some((p: any) => p.notJoinedYet)) continue;
      const notJoined = await whoHasNotJoinedYet(this.prisma, g.participants ?? []).catch(() => new Set<string>());
      if (notJoined.size) g.participants = (g.participants ?? []).map((p: any) => (notJoined.has(p.id) ? { ...p, notJoinedYet: true } : p));
    }
    /* On approved leave today (week 23): their own check-in says the round does not wait for them. Dates only. */
    const awayUntil = (await whoIsAwayOn(this.prisma, [userId], organizationId).catch(() => new Map<string, string>())).get(userId) ?? null;
    const told = whatNeedsYou(here as any, { userId, role, organizationId, notLetIn: !!me?.awaitingOrgApproval, awayUntil }, waiting.map((w) => ({ ...w, organizationId })), new Date(), [...(await this.whatTheirBoardsAsk(userId, here as any[])), ...reviews, ...leaveQuestions, ...spendQuestions, ...toApprove, ...finance, ...hours, ...letIn, ...directionPast]);
    /* A net: no address stands in for a name in any sentence on Today (week 12c). */
    const called = new Map<string, string>();
    for (const g of here as any[]) {
      const me = (g.participants ?? []).find((p: any) => p.userId === userId);
      /* An admin who takes part in it reads it as a person in it does (decision 121, item 7). */
      const runsIt = g.initiatorId === userId || (role === 'ADMIN' && !me);
      for (const [k, v] of whatEachLabelIsCalled(g.participants ?? [], { viewerParticipantId: me?.id ?? null, viewerIsLead: runsIt, peersAreNamed: runsIt || peersAreNamedOn(g, { participantId: me?.id ?? null }) })) if (k[0] === '@' || k[0] === '~') called.set(k, v);
    }
    return called.size ? withoutInternalLabelsIn(told, called) : told;
  }

  /**
   * TODAY, AS THE SCREEN READS IT: what needs you, and for a lead the two facts the mail also tells her (screens request 198, b), under `forTheLead`. The key is
   * absent for anybody who runs no check-in here, and for a lead with nothing to add; a sentence Today already says (a card, or the daily nudge's page) is not said
   * again.
   */
  async today(userId: string, email: string, organizationId: string, role: string): Promise<WhatNeedsYou & { forTheLead?: WhatTheLeadIsToldOnToday; directMorning?: boolean }> {
    const told = await this.forReader(userId, email, organizationId, role);
    /* Their own missed check-ins, told to them first (decision 136). Read only for this reader, about their own rows. */
    const missed = await this.missedCheckInsOf(userId, organizationId).catch(() => [] as Need[]);
    if (missed.length) { told.needs = [...missed, ...told.needs]; told.count = told.needs.length; }
    /* RELEASE 3: each fee note late to raise in the check-ins this reader runs, in the same sentence as the morning summary (board/raising-invoices-on-time). Off, none. */
    const runs = ((await Promise.resolve((this.prisma as any).ground?.findMany?.({ where: { organizationId, initiatorId: userId, scenario: 'COLLECTIONS' }, select: { id: true } })).catch(() => [])) ?? []) as { id: string }[];
    const lateToRaise = runs.length ? await theInvoicesLateToRaiseFor(this.prisma as any, organizationId, runs.map((g) => g.id)).catch(() => []) : [];
    if (lateToRaise.length) {
      const asNeeds: Need[] = lateToRaise.map((l) => {
        const [first, ...rest] = l.text.split(/(?<=\.)\s+/);
        return { key: `late-to-raise-${l.billId}`, kind: 'look' as const, title: first, detail: rest.join(' '), action: { label: 'Open the board', to: `/grounds/${l.groundId}/board` }, groundId: l.groundId, organizationId } as any;
      });
      told.needs = [...asNeeds, ...told.needs];
      told.count = told.needs.length;
    }
    const onWhatsApp = await this.checkInOnWhatsAppFor(userId, email, organizationId, told.needs);
    if (onWhatsApp) (told as any).checkInOnWhatsApp = onWhatsApp;
    /* An admin whose organisation is on its free trial reads one line about it (Hafsah, 12 October). */
    if (role === 'ADMIN') {
      const trial = await theFreeTrialLine(this.prisma as any, organizationId).catch(() => null);
      if (trial) (told as any).freeTrial = trial;
    }
    const weekly = this.moduleRef?.get(TheWeeklyReportService, { strict: false });
    const outstanding = await this.outstanding(userId, organizationId, told.needs).catch(() => null);
    const alreadySaid = [
      ...told.needs.flatMap((n) => [n.title, n.detail ?? '']),
      ...(outstanding ? [...outstanding.needsYou, ...outstanding.overdueOnYourTeam, ...outstanding.risks] : []),
    ];
    const forTheLead = await whatTheLeadIsToldOnToday(
      this.prisma as any,
      { userId, role, organizationId },
      { alreadySaid, weeklyReport: weekly ? (groundId, at) => weekly.read(groundId, { userId, role, organizationId }, at) : undefined },
    ).catch(() => null);
    /* The direct morning (organisation/the-screen-is-told-the-direct-morning.ts): one yes or no for the page's fixed words. It shows nothing more. */
    const directMorning = await theDirectMorningIsOn(this.prisma, organizationId);
    if (directMorning) { told.needs = needsSaidDirectly(told.needs); }
    /* The nudge beside the line is the board's own, which only the direct morning offers. */
    if (!directMorning) delete (told as any).lineNudge;
    /* SINCE YESTERDAY (C1, today-lead): what moved since the round before, for the check-in the line is about, read from the record the
       latest report reads (no model, nothing written). Only for the person who runs it. */
    /* Behind the direct morning, so an organisation with it off reads Today as before. */
    if (directMorning && told.lineGroundId) {
      const g = await (this.prisma as any).ground.findUnique({ where: { id: told.lineGroundId }, select: { initiatorId: true, cadence: true } }).catch(() => null);
      if (g?.initiatorId === userId) {
        const read = await whatTodayReads(this.prisma as any, told.lineGroundId, { userId, isAdmin: false }).catch(() => ({} as any));
        if (read?.sinceLast?.says) told.sinceYesterday = { heading: g.cadence === 'DAILY' ? 'Since yesterday' : 'Since the last check-in', says: read.sinceLast.says, also: read.sinceLast.also ?? null };
      }
    }
    delete (told as any).lineGroundId;
    return forTheLead ? { ...told, forTheLead, directMorning } : { ...told, directMorning };
  }

  /** The reason a person gives for missing their check-ins, on their own latest missed check-in only (decision 136). */
  giveTheReasonForMissing(userId: string, checkInId: string, reason: string): Promise<boolean> {
    return keepTheirReason(this.prisma as any, userId, checkInId, reason);
  }

  /** The person's own missed check-ins, as Today items (decision 136): their words, a way to check in now, and a place to give a reason. */
  async missedCheckInsOf(userId: string, organizationId: string, now: Date = new Date()): Promise<Need[]> {
    const told = await whatThePersonIsToldAboutMissing(this.prisma as any, userId, organizationId, now);
    return told.map((t) => {
      const [first, ...rest] = t.text.split(/(?<=\.)\s+/);
      return {
        key: `missed-${t.groundId}`,
        kind: 'look' as const,
        title: first,
        detail: rest.join(' '),
        action: t.openCheckInId ? { label: 'Check in now', to: `/checkin/${t.openCheckInId}` } : { label: 'See your check-ins', to: '/today' },
        groundId: t.groundId,
        organizationId: t.organizationId,
        ...(t.latestMissedCheckInId ? { missedReason: { checkInId: t.latestMissedCheckInId, given: t.reason } } : {}),
      } as Need;
    });
  }

  /**
   * EVERYTHING THAT IS OUTSTANDING FOR A LEAD, the page the daily nudge's link goes to (decision 120): what needs her, what is overdue on her team and the risks, every one
   * of them and not three, in the nudge's own sentences. Only her own check-ins; null for somebody who runs none, and when nothing is outstanding.
   */
  async outstanding(userId: string, organizationId: string, todaysNeeds?: Need[]): Promise<{ needsYou: string[]; overdueOnYourTeam: string[]; risks: string[]; about: { needsYou: any[]; overdueOnYourTeam: any[]; risks: any[] } } | null> {
    const found = await everythingOutstandingFor(this.prisma as any, { userId, organizationId }, { boards: { leave: this.leave as any, timeSheets: this.time as any, spending: this.spend as any } })
      .catch(() => null);
    if (!found) return found;
    return this.withoutTheWaitsTodayAlreadyListed(found, userId, organizationId, todaysNeeds);
  }

  /**
   * THE SAME WAIT IS NOT LISTED TWICE ON TODAY. A wait on the lead that the check-in's board lists under "What needs you" ("You need to get back to Amani Wekesa,
   * who is waiting on you for the discount limit") was also in "Risks" as a wait that has gone on too long, in other words and with its date. A risk about a wait that
   * is one of the board's own rows on Today (the same row, or the same wait said again: theSameWaitInOtherWords) is left out of the page, and from its `about`.
   * Only for Today's page: the daily message to the lead is not a page with a "What needs you" above it, and is not changed.
   */
  private async withoutTheWaitsTodayAlreadyListed<T extends { risks: string[]; about: { risks: any[] } }>(found: T, userId: string, organizationId: string, todaysNeeds?: Need[]): Promise<T> {
    const riskWaitIds = found.about.risks.map((a: any) => (a?.kind === 'wait' ? a.ids?.[0] : null));
    if (!riskWaitIds.some(Boolean)) return found;
    let needs = todaysNeeds;
    if (!needs) {
      const mine = await this.prisma.ground.findMany({
        where: { initiatorId: userId, organizationId },
        select: { id: true, organizationId: true, label: true, initiatorId: true, status: true, closedAt: true, resolvedAt: true },
      }).catch(() => [] as any[]);
      needs = await this.whatTheirBoardsAsk(userId, mine as any[]).catch(() => [] as Need[]);
    }
    const onTodayIds = needs.map((n) => /-waiting-on-the-lead-(.+)$/.exec(n.key)?.[1]).filter((x): x is string => !!x);
    if (!onTodayIds.length) return found;
    const rows = await this.prisma.groundDependency.findMany({
      where: { id: { in: [...new Set([...onTodayIds, ...riskWaitIds.filter((x): x is string => !!x)])] } },
      select: { id: true, fromParticipantId: true, onParticipantId: true, onLabel: true, what: true },
    }).catch(() => [] as any[]);
    const byId = new Map<string, any>((rows as any[]).map((r) => [r.id, r]));
    const sameAsOneOnToday = (id: string) => onTodayIds.some((t) => t === id || (byId.get(t) && byId.get(id) && theSameWaitInOtherWords(byId.get(t), byId.get(id))));
    const keep = riskWaitIds.map((id) => !id || !sameAsOneOnToday(id));
    if (keep.every(Boolean)) return found;
    return { ...found, risks: found.risks.filter((_, i) => keep[i]), about: { ...found.about, risks: found.about.risks.filter((_, i) => keep[i]) } };
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
