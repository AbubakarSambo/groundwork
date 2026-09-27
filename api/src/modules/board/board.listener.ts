import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { cleanText } from '../reports/what-the-record-actually-holds';
import { AnthropicService } from '../conversation/anthropic.service';
import { GroundworkEvents, type RoundCompletedEvent } from '../../common/events';
import {
  WHAT_THE_RECORD_SAYS_PROMPT,
  WHAT_THE_RECORD_SAYS_SCHEMA,
  theQuestion,
  onlyWhatIsWorthOffering,
  oneNumberLandsOnce,
  type AReadNumber,
  whatToDoWithTheRead,
} from './what-the-record-says-a-number-is';
import {
  WHAT_THE_ROOM_IS_ABOUT_PROMPT,
  WHAT_THE_ROOM_IS_ABOUT_SCHEMA,
  theLines,
  onlyWhatHolds,
  type WhatTheRoomIsAbout,
} from './what-the-room-is-about';

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
    await this.readWhatTheRoomIsAbout(e);
    try {
      const targets = await this.prisma.groundObjective.findMany({
        where: { groundId: e.groundId },
        select: { id: true, name: true, target: true, count: true, prevCount: true, ownerParticipantId: true, suggestedCount: true, suggestedSaid: true },
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
          /* And WORRY and TENSION: "arrears are at 14%, it's the market" is a worry, and it is also where the
             number is (run 11, 22 Sep 2026, a board reading "0 so far" beside it). The prompt's own rule -
             only where a line reports the value - is what keeps a worry with no figure out. */
          type: { in: ['PROGRESS', 'COMMITMENT', 'SUCCESS_DEFINITION', 'WORRY', 'TENSION'] as any },
        },
        select: { text: true, participantId: true, participant: { select: { partyType: true } } },
      });
      if (!said.length) return;

      /*
       * THE MARKERS COME OFF BEFORE ANYBODY READS THIS - the model, and then the lead.
       *
       * Extraction stores its verifiability marker inside the text column, so every line here
       * arrives as "[VERIFIABILITY:HIGH] All forty migrated by Friday." Fed to the model it is
       * noise in front of every sentence; carried into `suggestedSaid` it is our internal marker
       * printed on the board under "The record shows 40 for this". Caught on a gate run, and it is
       * the fifth time this session that something internal has reached a page by riding inside a
       * text column. `cleanText` is the one that knows how to take it off.
       */
      const lines = said.map((s: any) => ({ text: cleanText(s.text), who: s.participantId ?? null, saidByTheLead: s.participant?.partyType === 'INITIATOR' }));
      const answer = await this.anthropic.extract<{ numbers: AReadNumber[] }>(
        WHAT_THE_RECORD_SAYS_PROMPT,
        [{ role: 'user', content: theQuestion(targets, lines) }],
        WHAT_THE_RECORD_SAYS_SCHEMA,
      );

      const worth = oneNumberLandsOnce(onlyWhatIsWorthOffering(answer?.numbers ?? [], targets, lines), targets);
      let landed = 0;
      for (const n of worth) {
        const target = targets.find((t) => t.id === n.objectiveId)!;
        if (whatToDoWithTheRead(n, target, lines) === 'land') {
          landed += 1;
          await this.prisma.groundObjective.update({
            where: { id: n.objectiveId },
            data: { count: n.count, suggestedCount: null, suggestedSaid: cleanText(n.said), suggestedAtSession: e.sessionNumber },
          }).catch(() => undefined);
        } else {
          await this.prisma.groundObjective.update({
            where: { id: n.objectiveId },
            data: { suggestedCount: n.count, suggestedSaid: cleanText(n.said), suggestedAtSession: e.sessionNumber },
          }).catch(() => undefined);
        }
      }
      if (worth.length) {
        this.logger.log(`Read ${worth.length} number(s) off the record for ground ${e.groundId} round ${e.sessionNumber}; ${landed} landed as the lead's own count.`);
      }
    } catch (err: any) {
      this.logger.warn(`Reading the numbers off the record for ${e.groundId} failed: ${err?.message}`);
    }
  }

  /**
   * WHAT THE ROOM IS ABOUT, READ ONCE A ROUND.
   *
   * Everything anybody has said they are trying to do, everywhere they said they are doing it, and
   * everything they said it about. Read across the WHOLE ground, not one round: an aim somebody
   * stated in round one is still their aim in round four, and a board that dropped it every week
   * would tell a convener the room had changed its mind when nobody had.
   *
   * BEST EFFORT. If this fails the board shows the rest of itself and says this part has not been
   * read yet.
   */
  private async readWhatTheRoomIsAbout(e: RoundCompletedEvent) {
    try {
      const said = await this.prisma.recordEntry.findMany({
        where: {
          disputedAt: null,
          participant: { groundId: e.groundId },
          type: { in: ['SUCCESS_DEFINITION', 'INTENT', 'WORRY', 'ASK'] as any },
        },
        select: {
          text: true,
          participant: { select: { nameGiven: true, user: { select: { firstName: true, lastName: true } } } },
        },
      });
      const lines = said
        .map((s: any) => ({
          text: cleanText(s.text),
          /* THE SAME NAME THE BOARD PRINTS. A model answer keyed on anything else cannot be matched
             back to a person, and `onlyWhatHolds` drops every row it cannot match. A name only, never
             the lead's description of them (request 36): somebody with no name is left out here, as
             the board has no name to match them by either. */
          who: [s.participant?.user?.firstName, s.participant?.user?.lastName].filter(Boolean).join(' ').trim()
            || (s.participant?.nameGiven ?? '').trim() || '',
        }))
        .filter((s: { text: string; who: string }) => s.text && s.who);
      if (lines.length < 2) return;

      const answer = await this.anthropic.extract<Partial<WhatTheRoomIsAbout>>(
        WHAT_THE_ROOM_IS_ABOUT_PROMPT,
        [{ role: 'user', content: theLines(lines) }],
        WHAT_THE_ROOM_IS_ABOUT_SCHEMA,
      );
      const held = onlyWhatHolds(answer ?? null, new Set(lines.map((l: { who: string }) => l.who)));
      if (!held.aims.length && !held.places.length && !held.things.length) return;

      await this.prisma.ground.update({
        where: { id: e.groundId },
        data: { whatTheRoomIsAbout: held as any, whatTheRoomIsAboutSession: e.sessionNumber },
      }).catch(() => undefined);
      this.logger.log(
        `Read ${held.aims.length} aim(s), ${held.places.length} place(s) and ${held.things.length} thing(s) for ground ${e.groundId}.`,
      );
    } catch (err: any) {
      this.logger.warn(`Reading what the room is about for ${e.groundId} failed: ${err?.message}`);
    }
  }
}
