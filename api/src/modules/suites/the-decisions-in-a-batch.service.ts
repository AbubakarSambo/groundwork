import { BadRequestException, ForbiddenException, HttpException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AN_ADMIN_SWITCHES_IT_ON } from './a-suite-that-is-off-says-what-to-do';
import { LeaveBoardService } from './the-leave-board.service';
import { SpendingService } from './the-spending.service';
import { TimeSheetsService } from './the-time-sheets.service';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';
import { aLeaveRequest, aSpendRequest, whose, type AWaitingRequest } from './a-request-in-words';
import { saidAsADay } from './who-is-away';

/**
 * MANY ANSWERS IN ONE CALL, FOR AN APPROVER (suites at scale). `POST /suites/decisions`.
 *
 * Each request is answered by the very route that answers it alone (LeaveBoardService.decide, SpendingService.decide and
 * TimeSheetsService.approve), so every rule is the same: who may decide it now (the manager's, a stand-in's under decision 108, a
 * duty holder's, an admin's), the state it is in, and the write that is the check when two approvers answer at once. Nothing is
 * decided here. Each gets its own result, a full sentence, and one that fails never stops the others. They are answered in the order
 * given, one at a time.
 *
 * MESSAGES. Whoever decides the next step of the ones approved here is told once for all that arrive together (the same gathering the
 * clock uses), not once for each. The person who asked is told of each decision as they always were: it answers something they did.
 */

export const MOST_IN_A_BATCH = 50;

export interface AnAnswerGiven { suite: 'leave' | 'spend' | 'hours'; id: string; answer: 'approve' | 'decline'; reason?: string }
/** `suite` is null when the suite was not understood. */
export interface AResult { id: string; suite: 'leave' | 'spend' | 'hours' | null; ok: boolean; says: string }
export interface TheResults { results: AResult[]; answered: number; says: string }

export const BATCH_REFUSED = {
  nothing: `Send between 1 and ${MOST_IN_A_BATCH} answers at once, each with a suite, an id and approve or decline.`,
  tooMany: `Send up to ${MOST_IN_A_BATCH} answers at once.`,
  notIn: 'Only people in this organisation can answer requests here.',
  nothingOn: `Neither leave, spending nor hours is switched on. ${AN_ADMIN_SWITCHES_IT_ON}`,
  hoursCannotBeDeclined: 'Hours cannot be declined here, only approved. Say what is wrong with them to the person who sent them.',
  badOne: 'This answer was not understood. Give a suite (leave, spend or hours), an id, and approve or decline.',
  badSuite: 'The suite was not understood. Give leave, spend or hours.',
  keptButNotRead: 'Your answer was kept, but the request could not be read back to say more. Check it on the board.',
  twice: 'This request was already answered in this call, so the second answer was left out.',
  couldNot: 'This one could not be answered. Check it on the board before you try again.',
};

const NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const inWords = (n: number) => (n >= 0 && n <= 10 ? NUMBERS[n] : String(n));
const capital = (x: string) => `${x.charAt(0).toUpperCase()}${x.slice(1)}`;

@Injectable()
export class DecisionsInABatchService {
  private readonly logger = new Logger(DecisionsInABatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leave: LeaveBoardService,
    private readonly spending: SpendingService,
    private readonly time: TimeSheetsService,
    @Optional() private readonly told?: ARequestToldOnWhatsApp,
  ) {}

  async decide(reader: { userId: string; organizationId: string }, input: unknown, today = new Date()): Promise<TheResults> {
    const given = (input as { decisions?: unknown } | null)?.decisions;
    if (!Array.isArray(given) || !given.length) throw new BadRequestException(BATCH_REFUSED.nothing);
    if (given.length > MOST_IN_A_BATCH) throw new BadRequestException(BATCH_REFUSED.tooMany);
    const org = reader.organizationId;
    const member = await this.prisma.organizationMembership.findUnique({ where: { userId_organizationId: { userId: reader.userId, organizationId: org } }, select: { role: true } });
    if (!member || member.role === 'GUEST') throw new ForbiddenException(BATCH_REFUSED.notIn);
    const on = await this.prisma.organizationSuite.findMany({ where: { organizationId: org, suite: { in: ['leave', 'spend', 'time'] }, isOn: true }, select: { suite: true } });
    if (!(on ?? []).length) throw new NotFoundException(BATCH_REFUSED.nothingOn);

    const collect: { approverUserIds: string[]; request: AWaitingRequest }[] = [];
    const seen = new Set<string>();
    const results: AResult[] = [];
    for (const one of given as Partial<AnAnswerGiven>[]) {
      const suite = one?.suite;
      const id = typeof one?.id === 'string' ? one.id.trim() : '';
      if (suite !== 'leave' && suite !== 'spend' && suite !== 'hours') {
        results.push({ id, suite: null, ok: false, says: BATCH_REFUSED.badSuite });
        continue;
      }
      if (!id || (one?.answer !== 'approve' && one?.answer !== 'decline')) {
        results.push({ id, suite, ok: false, says: BATCH_REFUSED.badOne });
        continue;
      }
      if (seen.has(`${suite}|${id}`)) { results.push({ id, suite, ok: false, says: BATCH_REFUSED.twice }); continue; }
      seen.add(`${suite}|${id}`);
      try {
        results.push({ id, suite, ok: true, says: await this.answerOne(reader, suite, id, one.answer, typeof one.reason === 'string' ? one.reason : undefined, today, collect) });
      } catch (err: unknown) {
        results.push({ id, suite, ok: false, says: this.saidPlainly(err) });
      }
    }
    /* Whoever decides the next step of what was approved is told once for all that arrived together. */
    if (this.told && collect.length) {
      try {
        if (typeof this.told.waitingMany === 'function') await this.told.waitingMany(org, collect, today);
        else for (const b of collect) await this.told.waiting(org, b.approverUserIds, b.request);
      } catch { /* the answers stand */ }
    }
    const answered = results.filter((r) => r.ok).length;
    const left = results.length - answered;
    const total = results.length;
    let says: string;
    if (!left) says = total === 1 ? 'The answer was kept.' : `All ${inWords(total)} answers were kept.`;
    else if (!answered) says = total === 1 ? 'The answer could not be kept, and it says why.' : `None of the ${inWords(total)} answers could be kept, and each says why.`;
    else says = `${capital(inWords(answered))} of the ${inWords(total)} answers ${answered === 1 ? 'was' : 'were'} kept. ${capital(inWords(left))} could not be kept, and ${left === 1 ? 'it says' : 'each says'} why.`;
    return { results, answered, says };
  }

  /** A refusal, said as the single route says it. */
  private saidPlainly(err: unknown): string {
    if (err instanceof HttpException) {
      const m = err.getResponse();
      const text = typeof m === 'string' ? m : (m as { message?: unknown })?.message;
      if (typeof text === 'string' && text.trim()) return text;
      if (Array.isArray(text) && typeof text[0] === 'string') return text[0];
    }
    this.logger.warn(`One answer in a batch could not be given: ${(err as Error)?.message}`);
    return BATCH_REFUSED.couldNot;
  }

  private async answerOne(
    reader: { userId: string; organizationId: string }, suite: 'leave' | 'spend' | 'hours', id: string, answer: 'approve' | 'decline', reason: string | undefined,
    today: Date, collect: { approverUserIds: string[]; request: AWaitingRequest }[],
  ): Promise<string> {
    const outcome = answer === 'approve' ? 'approved' : 'declined';
    const word = outcome === 'approved' ? 'You approved' : 'You declined';
    const org = reader.organizationId;
    if (suite === 'leave') {
      await this.leave.decide(reader, id, outcome, reason, { lean: true, collect });
      /* From here the answer is written. Reading it back to say it can fail on its own, and then it says so. */
      try {
        const row = await this.prisma.leaveRequest.findUnique({ where: { id }, select: { userId: true, startsOn: true, endsOn: true, status: true } });
        const first = await this.firstName(row!.userId);
        const thing = aLeaveRequest(id, row!.userId, first, row!.startsOn.toISOString().slice(0, 10), row!.endsOn.toISOString().slice(0, 10)).thing;
        const next = row!.status === 'waiting' ? await this.leave.nowWaitingFor(org, id) : null;
        return `${word} ${thing}.${next ? ` It now waits for ${next}.` : ''}`;
      } catch { return BATCH_REFUSED.keptButNotRead; }
    }
    if (suite === 'spend') {
      await this.spending.decide(reader, id, outcome, today, reason, { lean: true, collect });
      try {
        const row = await this.prisma.spendRequest.findUnique({ where: { id }, select: { userId: true, amount: true, what: true, status: true } });
        const first = await this.firstName(row!.userId);
        const suiteRow = await this.prisma.organizationSuite.findUnique({ where: { organizationId_suite: { organizationId: org, suite: 'spend' } }, select: { answers: true } });
        const currency = typeof (suiteRow?.answers as { currency?: unknown } | null)?.currency === 'string' ? ((suiteRow!.answers as { currency: string }).currency) : null;
        const thing = aSpendRequest(id, row!.userId, first, Number(row!.amount), currency, row!.what).thing;
        const next = row!.status === 'waiting' ? await this.spending.nowWaitingFor(org, id) : null;
        return `${word} ${thing}.${next ? ` It now waits for ${next}.` : ''}`;
      } catch { return BATCH_REFUSED.keptButNotRead; }
    }
    /* Hours: the id is the person and the week's Monday, joined by "|", as the record keeps it. They can be approved and never declined. */
    if (outcome === 'declined') throw new BadRequestException(BATCH_REFUSED.hoursCannotBeDeclined);
    const [personId, weekOf] = id.split('|');
    if (!personId || !weekOf) throw new BadRequestException(BATCH_REFUSED.badOne);
    await this.time.approve(reader, personId, weekOf, today, { lean: true });
    try {
      const first = await this.firstName(personId);
      const next = await this.time.nowWaitingFor(org, personId, weekOf);
      return `${word} ${whose(first)} hours for the week of ${saidAsADay(weekOf)}.${next ? ` They now wait for ${next}.` : ''}`;
    } catch { return BATCH_REFUSED.keptButNotRead; }
  }

  private async firstName(userId: string): Promise<string> {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true } }).catch(() => null);
    return u?.firstName?.trim() || 'Somebody';
  }
}
