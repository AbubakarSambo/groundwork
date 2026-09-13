import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { AnthropicService } from '../conversation/anthropic.service';
import { GroundworkEvents, type RoundCompletedEvent } from '../../common/events';
import {
  WHAT_THE_RECORD_SAYS_PROMPT,
  WHAT_THE_RECORD_SAYS_SCHEMA,
  theQuestion,
  onlyWhatIsWorthOffering,
  type AReadNumber,
} from './what-the-record-says-a-number-is';

/**
 * WHEN A ROUND CLOSES, READ WHAT THE RECORD SAYS THE NUMBERS ARE AT.
 *
 * ONCE PER ROUND, AND NOT ON A BOARD READ. The board is opened many times a round by everybody on
 * it; a model call there would be paid for on every one of them, and slowly. A round closes once,
 * with both the targets and the round's lines in hand, which is the only moment this needs.
 *
 * BEST EFFORT, ALWAYS. A round closing is the record of what people said; a suggestion beside a
 * number is a convenience. If this throws, the round is still closed and the board still shows the
 * lead's own number - which is what it showed before this existed.
 */
@Injectable()
export class BoardListener {
  private readonly logger = new Logger(BoardListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
  ) {}

  @OnEvent(GroundworkEvents.ROUND_COMPLETED)
  async onRoundCompleted(e: RoundCompletedEvent) {
    try {
      const targets = await this.prisma.groundObjective.findMany({
        where: { groundId: e.groundId },
        select: { id: true, name: true, target: true, count: true },
      });
      if (!targets.length) return;

      /*
       * WHAT PEOPLE SAID THIS ROUND, and only the kinds that can carry a number somebody reached.
       * PROGRESS is the type this read wanted and did not have until today - a thing that happened,
       * which is what a count is. COMMITMENT stays because a commitment reported as done landed
       * there for as long as there was nowhere else for it to go.
       */
      const said = await this.prisma.recordEntry.findMany({
        where: {
          disputedAt: null,
          participant: { groundId: e.groundId },
          checkIn: { sessionNumber: e.sessionNumber },
          type: { in: ['PROGRESS', 'COMMITMENT', 'SUCCESS_DEFINITION'] as any },
        },
        select: { text: true },
      });
      if (!said.length) return;

      const answer = await this.anthropic.extract<{ numbers: AReadNumber[] }>(
        WHAT_THE_RECORD_SAYS_PROMPT,
        [{ role: 'user', content: theQuestion(targets, said.map((s: { text: string }) => ({ text: s.text, who: null }))) }],
        WHAT_THE_RECORD_SAYS_SCHEMA,
      );

      const worth = onlyWhatIsWorthOffering(answer?.numbers ?? [], targets);
      for (const n of worth) {
        await this.prisma.groundObjective.update({
          where: { id: n.objectiveId },
          data: { suggestedCount: n.count, suggestedSaid: n.said, suggestedAtSession: e.sessionNumber },
        }).catch(() => undefined);
      }
      if (worth.length) {
        this.logger.log(`Read ${worth.length} number(s) off the record for ground ${e.groundId} round ${e.sessionNumber}.`);
      }
    } catch (err: any) {
      this.logger.warn(`Reading the numbers off the record for ${e.groundId} failed: ${err?.message}`);
    }
  }
}
