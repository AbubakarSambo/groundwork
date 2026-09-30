import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TurnRole, CheckInStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GroundworkEvents, CheckInCompletedEvent } from '../../common';
import { SuggestionsService } from './suggestions.service';
import { OneAtATime } from '../reports/one-warm-up-at-a-time';
import { labelsForParties } from '../reports/party-labels';
import { commitmentsKeptInTheLastFourWeeks } from '../grounds/your-board';

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

  private async reachForEveryoneIn(groundId: string): Promise<void> {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        participants: {
          where: { managingOnly: false },
          select: {
            id: true, partyType: true, roleAsDescribed: true, email: true, createdAt: true, nameGiven: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
    if (!ground) return;
    const labels = labelsForParties(ground.participants as any);

    for (const p of ground.participants) {
      try {
        const [commitments, lastSaid] = await Promise.all([
          this.prisma.groundCommitment.findMany({
            where: { participantId: p.id, status: { in: ['DONE', 'NOT_DONE'] } },
            select: { status: true, createdAt: true },
          }),
          this.prisma.checkIn.findFirst({
            where: { participantId: p.id, groundId, status: CheckInStatus.COMPLETED },
            orderBy: { createdAt: 'desc' },
            select: { turns: { where: { role: TurnRole.PERSON }, orderBy: { createdAt: 'desc' }, take: 1, select: { content: true } } },
          }),
        ]);
        await this.suggestions.reachFromTheRecord(groundId, {
          aboutParticipantId: p.id,
          aboutLabel: labels.get(p.id) ?? 'This person',
          commitmentsSettledRecently: commitmentsKeptInTheLastFourWeeks(commitments),
          ownWords: lastSaid?.turns?.[0]?.content?.trim() || null,
        });
      } catch (err: any) {
        this.logger.warn(`Reaching a suggestion for participant ${p.id} on ${groundId} failed: ${err?.message}`);
      }
    }
  }
}
