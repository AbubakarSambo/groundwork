import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A PAYING ORGANISATION WITH NO OPEN GROUNDS COULD NOT MANAGE ITS SUBSCRIPTION. W14-6.
 *
 * `GET /billing/status` returned active grounds and a card. Nothing else. So `BillingPage` had
 * nowhere to read the plan from and took it off `grounds[0].org` - "all grounds share the same
 * org", which is true and beside the point.
 *
 * An organisation that has closed its grounds has no `grounds[0]`. So a **paying customer saw
 * "Free · No subscription"**, and Pause, Resume and Cancel disappeared with it: the one page
 * somebody visits to stop being charged was the page that denied they were being charged.
 *
 * Found by reading the page after she said billing "looks like ground setup" when it is org
 * setup. She was describing the shape; the shape was hiding a live bug.
 *
 * The seat count travels with it (W14-7) for the same reason: every plan is priced by people and
 * the product never said how many the organisation had.
 */
const SERVICE = readFileSync(join(__dirname, 'billing.service.ts'), 'utf8');
const CODE = SERVICE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** The body of getStatus, so a field elsewhere in the file cannot stand in for it. */
const GET_STATUS = CODE.slice(CODE.indexOf('async getStatus('), CODE.indexOf('async cancelAccount('));

describe('what /billing/status returns', () => {
  it('found getStatus at all', () => {
    // The whole basis of this file.
    expect(GET_STATUS).toContain('activeGrounds');
    expect(GET_STATUS.length).toBeGreaterThan(400);
  });

  it('reads the subscription off the organisation', () => {
    /* The plan and its status come through the one shared list of what a cover read needs (2 November 2026). */
    expect(GET_STATUS).toContain('this.theOrgWithItsCover(organizationId');
    expect(CODE).toMatch(/const select = \{ \.\.\.WHAT_COVER_READS, \.\.\.extra \}/);
    expect(GET_STATUS).toContain('subscriptionPeriodEnd: true');
    const shared = readFileSync(join(__dirname, '../../common/subscription.ts'), 'utf8');
    for (const field of ['subscriptionPlan: true', 'subscriptionStatus: true']) expect(shared.slice(shared.indexOf('export const WHAT_COVER_READS'))).toContain(field);
  });

  it('and returns it, so the client never has to find it on a ground', () => {
    expect(GET_STATUS).toMatch(/subscription: \{/);
    expect(GET_STATUS).toMatch(/plan: org\.subscriptionPlan/);
    expect(GET_STATUS).toMatch(/status: org\.subscriptionStatus/);
  });

  it('counts the people, against the plan\'s cap', () => {
    expect(GET_STATUS).toMatch(/people: \{ count: peopleCount, cap:/);
    /**
     * Through the one shared definition, not a where clause typed out here. This assertion used to
     * pin `{ organizationId, isActive: true }` literally, which is exactly how this count and the
     * invite gate were free to mean different things: each had its own predicate and its own guard
     * agreeing with it.
     */
    /* U.19: the one definition is now `seatsIn`, read from the memberships, through `seatsTaken`,
       which the invite gate uses too. */
    expect(GET_STATUS).toMatch(/const peopleCount = await this\.seatsTaken\(organizationId\)/);
    expect(CODE).toMatch(/user\.count\(\{ where: seatsIn\(organizationId\) \}\)/);
  });

  it('and reads the cap from the table rather than a map in the code', () => {
    /**
     * This used to assert `this.PLAN_MEMBER_CAPS[org.subscriptionPlan]`, a hardcoded map on this
     * service - and there were three more copies, on the client, in the plan labels, and in a
     * second client map. The caps are now `pricing_plans.memberCap`, edited in the same admin
     * screen as the prices, and this pins that nothing here states a cap of its own.
     */
    /* The plan it reads is now whichever covers them - their own, or one we gave them on the
       house - and it still comes from the table rather than a map in this file. */
    expect(GET_STATUS).toContain('this.pricing.memberCapFor(covers.plan as any)');
    expect(GET_STATUS).not.toContain('PLAN_MEMBER_CAPS');
  });

  it('an organisation nothing covers reports a cap of one, the person who set it up, not "no cap"', () => {
    /* Updated 23 November 2026: there is no free plan of five people; the free trial is cover, so it reports its plan's cap. */
    expect(GET_STATUS).toContain("covers.covers === 'free tier' ? 1 : covers.plan ? await this.pricing.memberCapFor(covers.plan as any) : null");
  });

  it('and the cap it reports is the one the gate will apply', () => {
    /**
     * Same two sources, same order, in both places. This is the shape of the seat-count defect
     * one level up: two readers of one number, each correct alone.
     */
    const gate = CODE.slice(CODE.indexOf('async canInviteMember('), CODE.indexOf('private async warnAboutTheMemberCap('));
    for (const call of ['this.theOrgWithItsCover(organizationId', 'this.pricing.memberCapFor(']) {
      expect(gate).toContain(call);
      expect(GET_STATUS).toContain(call);
    }
  });
});

describe('and the page reads it there', () => {
  const PAGE = readFileSync(
    join(__dirname, '../../../../client/src/pages/billing/BillingPage.tsx'),
    'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('the subscription comes from the billing status', () => {
    expect(PAGE).toMatch(/const orgSub = billingStatus\?\.subscription \?\? null/);
  });

  it('and no longer from the first ground in the list', () => {
    // The exact line that broke it. If this comes back, so does the bug.
    expect(PAGE).not.toMatch(/grounds as any\[\]\)\[0\]/);
    expect(PAGE).not.toMatch(/firstGround\?\.org/);
  });
});
