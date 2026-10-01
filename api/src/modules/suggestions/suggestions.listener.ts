import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { GroundworkEvents, CheckInCompletedEvent, CommitmentsSettledEvent } from '../../common';
import { SuggestionsService } from './suggestions.service';
import { OneAtATime } from '../reports/one-warm-up-at-a-time';
import { labelsForParties } from '../reports/party-labels';
import { commitmentsKeptInTheLastFourWeeks } from '../grounds/your-board';
import { theirApprovedLeave } from '../suites/who-is-away';

/**
 * WEEK 10, WIRED IN: A SUGGESTION IS REACHED WHEN SOMETHING NEW COMES IN, NEVER WHEN A PAGE IS
 * OPENED (decision 7).
 *
 * The same event patterns.listener.ts and reports.listener.ts already act on: a check-in
 * completing. Every writer runs (the product's rule is "default on, hold the last inch") - this
 * tries every participant of the ground, for every completed check-in, whether or not any
 * threshold is set. With nothing set, SuggestionsService.reachFromTheRecord reaches nothing for
 * anybody, which is the correct, quiet result (decision 33), not a reason to skip the attempt.
 *
 * ONE RUN AT A TIME, PER ROUND (reused from one-warm-up-at-a-time.ts, decision 44 / 1a481c32):
 * several parties finishing the same round each fire checkin.completed, and each would otherwise
 * read and try to write for everyone in the ground at once. A trigger while a run is out for that
 * round books one more for after it, shared by every later trigger in that time - nothing is
 * skipped, nothing runs twice at once. record()'s own rule (confirmed item 17: a new suggestion
 * never replaces one nobody has decided) makes a second run of the same round harmless even so.
 *
 * A failure for one person, or the whole run, is caught and logged - reaching a suggestion is
 * never allowed to break the check-in it rode in on.
 *
 * ALSO WHEN A COMMITMENT IS SETTLED (commitments.settled). Settling what a person said they would do
 * is a model call that finishes after checkin.completed has fired, so reading only on completion
 * always counted the record one check-in late: the session that took a person across the line
 * reached nothing until the next one. A person settling one by hand is something new too.
 *
 * THEIR OWN ANSWER IS THEIR SIDE, NOT THE LAST THING THEY SAID. The lead reads the person's answer to
 * the suggestion itself (their side, which the lead waits for, decision 53). The last thing a person
 * typed in their latest check-in was read here before, and in the record that is mostly a goodbye
 * ("That is all I have.", "No other blockers that I can name right now."), which the lead then read
 * as "Tobi's own answer." Nothing is guessed in its place.
 *
 * ONLY ON AN EVALUATION CHECK-IN (decision 6, clarified 29 September). SuggestionsService.reachFromTheRecord
 * reaches nothing on any other check-in (aVerdictIsReachedOn), so this runs everywhere and writes only there.
 *
 * AFTER A DECISION, A FRESH START (decided for Hafsah to confirm). Once the lead has decided a
 * suggestion, the next one about the same person on the same check-in counts only what was settled
 * after that decision - the decision's own "over the next four weeks" - rather than reaching a new
 * suggestion from the same misses at the very next check-in. A suggestion nobody has decided is never
 * replaced (confirmed item 17, SuggestionsService.record).
 */
@Injectable()
export class SuggestionsListener {
  private readonly logger = new Logger(SuggestionsListener.name);
  private readonly reaching = new OneAtATime<void>();

  constructor(
    private prisma: PrismaService,
    private suggestions: SuggestionsService,
  ) {}

  @OnEvent(GroundworkEvents.CHECK_IN_COMPLETED)
  async onCheckInCompleted(event: CheckInCompletedEvent) {
    await this.reaching
      .run(`${event.groundId}:${event.sessionNumber}`, () => Promise.resolve(null), () => this.reachForEveryoneIn(event.groundId))
      .catch((err: any) => this.logger.error(`Reaching a suggestion on checkin.completed failed for ground ${event.groundId}: ${err.message}`));
  }

  @OnEvent(GroundworkEvents.COMMITMENTS_SETTLED)
  async onCommitmentsSettled(event: CommitmentsSettledEvent) {
    await this.reaching
      .run(`${event.groundId}:settled:${event.participantId}`, () => Promise.resolve(null), () => this.reachForEveryoneIn(event.groundId, event.participantId))
      .catch((err: any) => this.logger.error(`Reaching a suggestion on commitments.settled failed for ground ${event.groundId}: ${err.message}`));
  }

  private async reachForEveryoneIn(groundId: string, onlyParticipantId?: string): Promise<void> {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        initiatorId: true,
        participants: {
          select: {
            id: true, userId: true, partyType: true, roleAsDescribed: true, email: true, createdAt: true, nameGiven: true, managingOnly: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
    if (!ground) return;
    const labels = labelsForParties(ground.participants as any);
    const lead = (ground.participants as any[]).find((p) => p.userId && p.userId === ground.initiatorId)
      ?? (ground.participants as any[]).find((p) => p.partyType === 'INITIATOR');
    const leadLabel = lead ? labels.get(lead.id) ?? null : null;

    for (const p of ground.participants as any[]) {
      if (p.managingOnly) continue;
      if (onlyParticipantId && p.id !== onlyParticipantId) continue;
      /* Whoever runs the check-in is not suggested about to themselves. */
      if (lead && p.id === lead.id) continue;
      try {
        const [commitments, lastDecided] = await Promise.all([
          this.prisma.groundCommitment.findMany({
            where: { participantId: p.id, groundId, status: { in: ['DONE', 'NOT_DONE'] } },
            select: { status: true, createdAt: true, settledAt: true },
          }),
          this.prisma.suggestion.findFirst({
            where: { groundId, aboutParticipantId: p.id, decision: { not: null } },
            orderBy: { decidedAt: 'desc' },
            select: { decidedAt: true },
          }),
        ]);
        const since = lastDecided?.decidedAt ? new Date(lastDecided.decidedAt).getTime() : 0;
        const counted = since
          ? commitments.filter((c) => new Date(c.settledAt ?? c.createdAt).getTime() > since)
          : commitments;
        /* A promise not kept while on approved leave is not a miss (week 23). */
        const theirLeave = p.userId ? await theirApprovedLeave(this.prisma as any, p.userId, null) : [];
        await this.suggestions.reachFromTheRecord(groundId, {
          aboutParticipantId: p.id,
          aboutLabel: labels.get(p.id) ?? 'This person',
          leadLabel,
          commitmentsSettledRecently: commitmentsKeptInTheLastFourWeeks(counted, new Date(), theirLeave),
          ownWords: null,
        });
      } catch (err: any) {
        this.logger.warn(`Reaching a suggestion for participant ${p.id} on ${groundId} failed: ${err?.message}`);
      }
    }
  }
}
