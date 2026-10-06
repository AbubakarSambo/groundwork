import { Injectable, Logger, Optional } from '@nestjs/common';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { aReviewWasDecided, aReviewWasStarted } from '../whatsapp/what-goes-to-a-phone';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';

/**
 * A REVIEW, TOLD ON WHATSAPP (item 16; decisions 82 and 83).
 *
 * A review is kept in the app. What may reach the person's phone is only that it waits for them there:
 * who started it, or who decided it. Never a line of what Groundwork noticed, the manager's words, the
 * decision or its reasons, and never anything to anybody but the person the review is about.
 *
 * Every send goes through the WhatsApp sender, which keeps every rule in one place: STOP and "not now",
 * the add-on and the month's limit, the 24 hours (outside them only the approved template goes, and
 * while it is not approved the send is recorded as not sent), and Groundwork's one message of the day
 * (both count, a-message-outside-the-window.ts). Held back, the review still waits in the app.
 *
 * Never throws into the review it follows: a message that could not go is recorded, and the review stands.
 */
@Injectable()
export class AReviewToldOnWhatsApp {
  private readonly logger = new Logger(AReviewToldOnWhatsApp.name);

  constructor(
    private readonly reach: ARequestToldOnWhatsApp,
    @Optional() private readonly whatsapp?: WhatsAppService,
  ) {}

  /** The person is told their review was started, or decided, by its writer. True when it went. */
  async toThePerson(organizationId: string, personUserId: string | null | undefined, writerUserId: string, what: 'started' | 'decided'): Promise<boolean> {
    if (!this.whatsapp || !personUserId || personUserId === writerUserId) return false;
    try {
      const to = await this.reach.reach(organizationId, personUserId);
      if (!to.phone) return false;
      const writer = await this.reach.firstNameOf(writerUserId);
      const said = what === 'started' ? aReviewWasStarted(to.firstName, writer) : aReviewWasDecided(to.firstName, writer);
      return (await this.whatsapp.sendFor(organizationId, to.phone, said.text, { kind: said.kind, params: said.params })).sent;
    } catch (err: any) {
      this.logger.warn(`Could not tell somebody their review was ${what}: ${err?.message}`);
      return false;
    }
  }
}
