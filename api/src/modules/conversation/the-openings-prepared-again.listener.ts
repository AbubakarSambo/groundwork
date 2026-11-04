import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GroundworkEvents, type AssessmentReadyEvent, type CommitmentsSettledEvent } from '../../common';
import { ConversationService } from './conversation.service';

/**
 * EACH PERSON'S NEXT OPENER IS PREPARED AT THE END OF A SESSION, AND AGAIN WHEN SOMETHING RELEVANT CHANGES (Hafsah, 3 November night;
 * the-opening-prepared-in-advance). When a session's assessment is ready its record lines are written, so the fact line is read from
 * the record as it now stands; promises settled (a payment, a delivery) change it too. A draft nothing has changed since is left alone.
 */
@Injectable()
export class TheOpeningsPreparedAgainListener {
  constructor(private conversation: ConversationService) {}

  @OnEvent(GroundworkEvents.ASSESSMENT_READY, { async: true })
  async afterASession(event: AssessmentReadyEvent) {
    if (event?.groundId) await this.conversation.prepareTheOpeningsIn(event.groundId).catch(() => undefined);
  }

  @OnEvent(GroundworkEvents.COMMITMENTS_SETTLED, { async: true })
  async afterPromisesSettled(event: CommitmentsSettledEvent) {
    if (event?.groundId) await this.conversation.prepareTheOpeningsIn(event.groundId).catch(() => undefined);
  }
}
