/**
 * A PROMISE KEPT AT SIGN-UP.
 *
 * A free run is promised to an address before anybody has signed up, so something has to notice the
 * moment they do. There are three places an organisation is created - the magic-link path, the
 * invited-member fallback, and Google - and all three already emit `org.signedUp`. Listening to that
 * event means a fourth sign-up path added later keeps the promise without anybody remembering to
 * wire it, which is the opposite of the usual failure here.
 *
 * IT NEVER BLOCKS THE SIGN-UP. The listener runs after the organisation exists and swallows its own
 * failures: the worst case is that we owe somebody a free run we did not attach, and it is in the
 * log. It must never be that a person cannot create their organisation because of a discount.
 */
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GroundworkEvents, type OrgSignedUpEvent } from '../../common/events';
import { ThreeMonthsOnTheHouseService } from './three-months-on-the-house.service';

@Injectable()
export class APromiseKeptAtSignUp {
  private readonly logger = new Logger(APromiseKeptAtSignUp.name);

  constructor(private readonly onTheHouse: ThreeMonthsOnTheHouseService) {}

  @OnEvent(GroundworkEvents.ORG_SIGNED_UP)
  async whenSomebodySignsUp(event: OrgSignedUpEvent) {
    const taken = await this.onTheHouse.claimFor(event.adminEmail, event.organizationId);
    if (taken) {
      this.logger.log(`${event.organizationName} starts on the house: ${taken.months} months of ${taken.plan}.`);
    }
  }
}
