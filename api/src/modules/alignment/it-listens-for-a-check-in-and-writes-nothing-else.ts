import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GroundworkEvents, CheckInCompletedEvent } from '../../common';
import { PrismaService } from '../prisma/prisma.service';
import { AnthropicService } from '../conversation/anthropic.service';
import { AgreementsService } from './agreements.service';
import { familyFor, BoardFamily } from '../board/board-families';
import { TurnRole } from '@prisma/client';
import {
  WHAT_THEY_SAY_IT_IS_PROMPT, WHAT_THEY_SAY_IT_IS_SCHEMA, whatTheySaidItIs,
} from './what-they-say-the-deal-is';
import { fullNameToCall } from '../engagement/a-name-to-call-them';

/**
 * WHAT SOMEBODY UNDERSTOOD, TAKEN OFF THE CHECK-IN THAT HAS JUST FINISHED.
 *
 * A LISTENER RATHER THAN A CALL, and the reason is not architecture for its own sake: the
 * conversation service is constructed positionally in twenty-odd specs, so reaching this from
 * there means an eleventh constructor parameter and twenty files edited to add a mock that never
 * runs. The event already exists, it already carries everything this needs, and a thing that only
 * ever reads a finished check-in belongs on the side that owns agreements.
 *
 * IT NEEDS TERMS TO COMPARE AGAINST, so it does nothing until a document has been read. That is
 * the right order: what somebody understands a clause to mean is only interesting beside the
 * clause. Before a document arrives there is nothing here, and that is not a failure - it is a
 * check-in about an arrangement nobody has written down yet.
 */
@Injectable()
export class WhatEachSideUnderstands {
  private readonly logger = new Logger(WhatEachSideUnderstands.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
    private readonly agreements: AgreementsService,
  ) {}

  @OnEvent(GroundworkEvents.CHECK_IN_COMPLETED)
  async onCheckInCompleted(event: CheckInCompletedEvent) {
    try {
      await this.read(event);
    } catch (err: any) {
      /* Never the reason a check-in fails to close. */
      this.logger.warn(`Could not read what was understood on ${event.checkInId}: ${err?.message}`);
    }
  }

  private async read(event: CheckInCompletedEvent) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: event.groundId },
      select: { scenario: true, organizationId: true },
    });
    if (!ground || familyFor(ground.scenario) !== BoardFamily.AGREEMENT) return;

    const version = await this.prisma.agreementVersion.findFirst({
      where: { agreement: { organizationId: ground.organizationId, groundId: event.groundId } },
      orderBy: { number: 'desc' },
      /* A term taken off as misread is not put to anybody again, the same as a disputed record
         line is not counted again. It stays in the table and stops being in the question. */
      select: { id: true, terms: { where: { disputedAt: null }, select: { id: true, says: true, reads: true, clause: true } } },
    });
    if (!version?.terms.length) return;

    const turns = await this.prisma.conversationTurn.findMany({
      where: { checkInId: event.checkInId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true },
    });
    if (!turns.length) return;

    const onFile = version.terms;
    const said = await this.anthropic.extract<{ readings?: unknown }>(
      `${WHAT_THEY_SAY_IT_IS_PROMPT}\n\nTHE TERMS ALREADY READ OUT OF THE DOCUMENT:\n`
        + onFile.map((t) => `- id ${t.id}${t.clause ? ` (${t.clause})` : ''}: ${t.says} - read as: ${t.reads}`).join('\n'),
      [{
        role: 'user',
        content: turns.map((t) => `${t.role === TurnRole.AI ? 'GROUNDWORK' : 'PERSON'}: ${t.content}`).join('\n'),
      }],
      WHAT_THEY_SAY_IT_IS_SCHEMA as any,
    );
    const out = whatTheySaidItIs(said ?? null, onFile);
    if (!out.differences.length && !out.notInTheDocument.length) return;

    const participant = await this.prisma.groundParticipant.findUnique({
      where: { id: event.participantId },
      select: { email: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } },
    });
    const who = fullNameToCall({ user: participant?.user, nameGiven: participant?.nameGiven });

    /* Their row's id goes with the reading, so two people with no name ("Someone" each) are two readings, not one said twice (review of 1678157c). */
    const done = await this.agreements.whatTheyUnderstandItToBe(
      ground.organizationId, event.groundId, version.id, who, out, event.participantId,
    );
    this.logger.log(
      `Recorded ${done.recorded} understanding(s) from ${event.checkInId}: `
      + `${out.differences.length} read differently, ${out.notInTheDocument.length} not in the document.`,
    );
  }
}
