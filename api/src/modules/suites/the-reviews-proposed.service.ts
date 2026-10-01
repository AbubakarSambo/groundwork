import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ENDINGS_WHERE_THEY_DO_NOT_CARRY_ON,
  PROPOSED_BY_GROUNDWORK,
  SCENARIOS_ABOUT_ONE_PERSON,
  addMonths,
  monthsIn,
  theKindOfAProposedReview,
} from './a-review-falls-due';

const DAY = 86_400_000;
/** How far ahead of the date a review is proposed. */
export const DAYS_AHEAD_A_REVIEW_IS_PROPOSED = 30;

const dayOf = (d: Date): Date => new Date(`${d.toISOString().slice(0, 10)}T00:00:00.000Z`);

/**
 * PROPOSING A REVIEW THAT FALLS DUE FROM INSIDE THE PRODUCT (week 11; see a-review-falls-due.ts).
 *
 * The one thing this does is write a date into `EvaluationDue`, marked as Groundwork's proposal. It
 * never writes a `PerformanceReview` (only the writer's yes does, in ReviewsService.start), never
 * writes to, reads for, or sends anything to the person the review is about, and does nothing at
 * all while the organisation has not switched the reviews suite on. A failure never reaches the
 * thing it rode in on.
 */
@Injectable()
export class ReviewsProposedService {
  private readonly logger = new Logger(ReviewsProposedService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** A check-in has ended. If it was about one person and they carry on, a review is proposed for today. */
  async whenACheckInEnds(groundId: string, today: Date = new Date()): Promise<{ id: string } | null> {
    try {
      const ground = await this.prisma.ground.findUnique({
        where: { id: groundId },
        select: {
          organizationId: true, scenario: true, endState: true, initiatorId: true,
          participants: { where: { managingOnly: false }, select: { userId: true, partyType: true } },
        },
      });
      if (!ground || !ground.scenario) return null;
      if (!(SCENARIOS_ABOUT_ONE_PERSON as readonly string[]).includes(ground.scenario)) return null;
      if (ground.endState && (ENDINGS_WHERE_THEY_DO_NOT_CARRY_ON as readonly string[]).includes(ground.endState)) return null;
      if (!(await this.reviewsAreOn(ground.organizationId))) return null;

      const theirs = ground.participants.filter((p) => p.partyType !== 'INITIATOR' && p.userId && p.userId !== ground.initiatorId);
      if (theirs.length !== 1) return null;
      const person = await this.prisma.person.findFirst({
        where: { organizationId: ground.organizationId, linkedUserId: theirs[0].userId!, active: true },
        select: { externalId: true },
      });
      if (!person) return null;

      /* One proposal at a time: nothing new while a review for this person is proposed and not started. */
      if (await this.aProposalIsWaiting(ground.organizationId, person.externalId, today)) return null;

      return await this.prisma.evaluationDue.create({
        data: {
          organizationId: ground.organizationId,
          personExternalId: person.externalId,
          dueOn: dayOf(today),
          kind: theKindOfAProposedReview.aCheckInEnded,
          source: PROPOSED_BY_GROUNDWORK.aCheckInEnded,
        },
        select: { id: true },
      });
    } catch (err: any) {
      this.logger.warn(`Proposing a review after check-in ${groundId} ended failed: ${err?.message}`);
      return null;
    }
  }

  /**
   * The date the organisation set for reviews ("Every 6 months") comes round. For each person who has
   * had a review fall due before, the next one is that date plus the months asked for, proposed once it
   * is within a month. Nobody with no earlier review is guessed at: nothing in the record says when
   * their first one would be.
   */
  async whenTheOrganisationsDateComesRound(today: Date = new Date()): Promise<{ proposed: number }> {
    let proposed = 0;
    const suites = await this.prisma.organizationSuite.findMany({
      where: { suite: 'reviews', isOn: true },
      select: { organizationId: true, answers: true },
    });
    for (const suite of suites) {
      try {
        const every = ((suite.answers ?? {}) as Record<string, unknown>).every;
        const months = monthsIn(typeof every === 'string' ? every : null);
        if (!months) continue;
        const dues = await this.prisma.evaluationDue.findMany({
          where: { organizationId: suite.organizationId },
          select: { personExternalId: true, dueOn: true },
        });
        const latest = new Map<string, Date>();
        for (const d of dues) if (!latest.has(d.personExternalId) || d.dueOn > latest.get(d.personExternalId)!) latest.set(d.personExternalId, d.dueOn);
        const active = new Set((await this.prisma.person.findMany({
          where: { organizationId: suite.organizationId, active: true }, select: { externalId: true },
        })).map((p) => p.externalId));
        for (const [externalId, last] of latest) {
          if (!active.has(externalId)) continue;
          const next = addMonths(last, months);
          if (next.getTime() > today.getTime() + DAYS_AHEAD_A_REVIEW_IS_PROPOSED * DAY) continue;
          if (next.getTime() <= last.getTime()) continue;
          await this.prisma.evaluationDue.create({
            data: {
              organizationId: suite.organizationId, personExternalId: externalId, dueOn: dayOf(next),
              kind: theKindOfAProposedReview.theOrganisationsDate, source: PROPOSED_BY_GROUNDWORK.theOrganisationsDate,
            },
            select: { id: true },
          });
          proposed += 1;
        }
      } catch (err: any) {
        this.logger.warn(`Proposing reviews for ${suite.organizationId} failed: ${err?.message}`);
      }
    }
    return { proposed };
  }

  private async reviewsAreOn(organizationId: string): Promise<boolean> {
    const suite = await this.prisma.organizationSuite.findUnique({
      where: { organizationId_suite: { organizationId, suite: 'reviews' } },
      select: { isOn: true },
    });
    return !!suite?.isOn;
  }

  /** A review for this person that nobody has started yet, from today on. */
  private async aProposalIsWaiting(organizationId: string, personExternalId: string, today: Date): Promise<boolean> {
    const waiting = await this.prisma.evaluationDue.findMany({
      where: { organizationId, personExternalId, dueOn: { gte: dayOf(new Date(today.getTime() - 30 * DAY)) } },
      select: { id: true },
    });
    if (!waiting.length) return false;
    const started = await this.prisma.performanceReview.findMany({
      where: { evaluationDueId: { in: waiting.map((w) => w.id) } },
      select: { evaluationDueId: true },
    });
    const startedIds = new Set(started.map((s) => s.evaluationDueId));
    return waiting.some((w) => !startedIds.has(w.id));
  }
}
