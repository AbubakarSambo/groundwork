import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SubscriptionPlan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from './pricing.service';
import { GroundworkEvents, type OrgSizeSaidEvent, type AnchorCheckInStartedEvent } from '../../common/events';
import { theAnchorScenarioIsOn } from '../admin/what-is-hidden-at-release';
import { aFreeRunEndsOn, whatCoversThem } from '../../common/subscription';
import { seatsIn } from '../../common/seats';

/**
 * THE FREE TRIAL, GIVEN FOR REAL (U.19). Hafsah's decision of 26 September: teams of fewer than 20
 * people get Groundwork free. Decision 78 (2 October) made it one month; the length is the setting's.
 *
 * BEHIND THE ONE SETTING. `pricing.freeTrial` holds the size and the length and whether it is on,
 * and the screens say the trial's sentence only while it is on (client/src/lib/the-free-trial.ts).
 * This grants it only while it is on, so turning the setting on makes the sentence and the grant true
 * together, and while it is off nothing here does anything at all. It is off by default.
 *
 * WHEN. "Create an organisation" asks whether the team is fewer than the trial's size, and only while
 * the trial is on. The answer "fewer" is what grants it; "Teams of 20 or more start on a plan", as the
 * prototype's pricing page says, so "more" grants nothing.
 *
 * WHAT. The months are an ordinary free run (`freeUntil` and `freePlan`), which every gate already
 * reads as cover, and nothing touches Stripe: no customer, no card, no subscription, no charge. When
 * the months end, the organisation is back on the free tier exactly as today, and nothing is charged
 * until an admin chooses a plan. The plan it covers is the smallest plan with a price whose seat limit
 * holds a team just under the trial's size, read from `pricing_plans`, so the size and the plan can
 * never disagree (Small Team today, up to 20 people).
 *
 * ONCE. An organisation is given the trial once (`freeTrialStartedAt`), never on top of a free run we
 * already gave it, and never to one that is paying.
 */
@Injectable()
export class TheFreeTrialService {
  private readonly logger = new Logger(TheFreeTrialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  /**
   * THE ANCHOR'S ONE-MONTH TRIAL (anchor piece 34). Given when a check-in is started from the anchor link, only while
   * both the anchor switch and `pricing.anchorTrial` are on, once per organisation, never on top of a free run we
   * already gave it and never to one that is paying, exactly as the free trial is. It covers the plan that holds 20
   * people, the lead included. Nothing touches Stripe.
   */
  @OnEvent(GroundworkEvents.ANCHOR_CHECK_IN_STARTED)
  async whenAnAnchorCheckInStarts(event: AnchorCheckInStartedEvent): Promise<void> {
    await this.grantTheAnchorTrial(event.organizationId);
  }

  async grantTheAnchorTrial(
    organizationId: string,
    now: Date = new Date(),
  ): Promise<{ granted: false; why: string } | { granted: true; plan: SubscriptionPlan; until: Date }> {
    try {
      if (!(await theAnchorScenarioIsOn(this.prisma))) return { granted: false, why: 'the anchor scenario is off' };
      const trial = await this.pricing.getAnchorTrial();
      if (!trial.on) return { granted: false, why: 'the anchor trial is off' };
      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { subscriptionPlan: true, subscriptionStatus: true, freeUntil: true, freePlan: true, freeTrialStartedAt: true },
      });
      if (!org) return { granted: false, why: 'no such organisation' };
      if (org.freeTrialStartedAt) return { granted: false, why: 'it has had a trial already' };
      if (whatCoversThem(org, now).covers === 'paid') return { granted: false, why: 'it is paying' };
      if (org.freeUntil) return { granted: false, why: 'it has a free run of its own' };
      /* Twenty people, the lead included: a plan whose seat limit is at least 20. */
      const plan = await this.thePlanItCovers(trial.people + 1);
      if (!plan) return { granted: false, why: 'no plan holds a team of that size' };
      const until = aFreeRunEndsOn(now, trial.months);
      const written = await this.prisma.organization.updateMany({
        where: { id: organizationId, freeTrialStartedAt: null, freeUntil: null },
        data: { freeTrialStartedAt: now, freeUntil: until, freePlan: plan },
      });
      if (!written.count) return { granted: false, why: 'it changed while we looked' };
      this.logger.log(`Anchor trial given to ${organizationId}: ${trial.months} month on ${plan}, ending ${until.toISOString().slice(0, 10)}.`);
      return { granted: true, plan, until };
    } catch (err: any) {
      this.logger.error(`The anchor trial could not be given to ${organizationId}: ${err?.message}`);
      return { granted: false, why: 'something failed' };
    }
  }

  @OnEvent(GroundworkEvents.ORG_SIZE_SAID)
  async whenTheySayTheirSize(event: OrgSizeSaidEvent): Promise<void> {
    await this.grantIfItApplies(event.organizationId, event.said);
  }

  /**
   * Gives the trial if it applies, and says what it did. Never throws: a trial that fails to attach
   * must never stop somebody creating or naming their organisation.
   */
  async grantIfItApplies(
    organizationId: string,
    said: 'fewer' | 'more',
    now: Date = new Date(),
  ): Promise<{ granted: false; why: string } | { granted: true; plan: SubscriptionPlan; until: Date }> {
    try {
      const trial = await this.pricing.getFreeTrial();
      if (!trial.on) return { granted: false, why: 'the free trial is off' };
      if (said !== 'fewer') return { granted: false, why: 'the team is not under the trial size' };

      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { subscriptionPlan: true, subscriptionStatus: true, freeUntil: true, freePlan: true, freeTrialStartedAt: true },
      });
      if (!org) return { granted: false, why: 'no such organisation' };
      if (org.freeTrialStartedAt) return { granted: false, why: 'it has had the trial already' };
      if (whatCoversThem(org, now).covers === 'paid') return { granted: false, why: 'it is paying' };
      if (org.freeUntil) return { granted: false, why: 'it has a free run of its own' };

      /* What they said is checked against who is really here, counted as billing counts a seat. */
      const seats = await this.prisma.user.count({ where: seatsIn(organizationId) });
      if (seats >= trial.teamsUnder) return { granted: false, why: 'the team is not under the trial size' };

      const plan = await this.thePlanItCovers(trial.teamsUnder);
      if (!plan) {
        this.logger.warn(`No plan holds a team under ${trial.teamsUnder}, so ${organizationId} was not given the free trial.`);
        return { granted: false, why: 'no plan holds a team of that size' };
      }

      const until = aFreeRunEndsOn(now, trial.months);
      /* Only if still untouched, so two answers at once cannot give it twice or overwrite a free run. */
      const written = await this.prisma.organization.updateMany({
        where: { id: organizationId, freeTrialStartedAt: null, freeUntil: null },
        data: { freeTrialStartedAt: now, freeUntil: until, freePlan: plan },
      });
      if (!written.count) return { granted: false, why: 'it changed while we looked' };
      this.logger.log(`Free trial given to ${organizationId}: ${trial.months} months on ${plan}, ending ${until.toISOString().slice(0, 10)}.`);
      return { granted: true, plan, until };
    } catch (err: any) {
      this.logger.error(`The free trial could not be given to ${organizationId}: ${err?.message}`);
      return { granted: false, why: 'something failed' };
    }
  }

  /** The smallest priced plan whose seat limit holds a team of `teamsUnder - 1` people. */
  private async thePlanItCovers(teamsUnder: number): Promise<SubscriptionPlan | null> {
    const plans = await this.pricing.listPlans();
    const fits = plans
      .filter((p) => p.amountCents !== null && (p.memberCap === null || p.memberCap >= teamsUnder - 1))
      .sort((a, b) => (a.amountCents as number) - (b.amountCents as number));
    return fits[0]?.plan ?? null;
  }
}
