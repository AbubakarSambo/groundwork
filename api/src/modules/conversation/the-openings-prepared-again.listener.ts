import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GroundworkEvents, type AssessmentReadyEvent, type CommitmentsSettledEvent, type SetupReadEvent } from '../../common';
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

  /*
   * ONCE SETUP IS SAVED AND READ (staging check S9, 4 November 2026): Rita's first question took 10 to 25 seconds, because nothing had
   * prepared her first session's opener; it was written while she waited. The first sessions are prepared as soon as setup's words
   * are on record, as every later session is at the end of the one before.
   */
  @OnEvent(GroundworkEvents.SETUP_READ, { async: true })
  async afterSetup(event: SetupReadEvent) {
    if (event?.groundId) await this.conversation.prepareTheOpeningsIn(event.groundId).catch(() => undefined);
  }

  @OnEvent(GroundworkEvents.COMMITMENTS_SETTLED, { async: true })
  async afterPromisesSettled(event: CommitmentsSettledEvent) {
    if (event?.groundId) await this.conversation.prepareTheOpeningsIn(event.groundId).catch(() => undefined);
  }
}
