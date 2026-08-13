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
    for (const field of ['subscriptionPlan: true', 'subscriptionStatus: true', 'subscriptionPeriodEnd: true']) {
      expect(GET_STATUS).toContain(field);
    }
  });

  it('and returns it, so the client never has to find it on a ground', () => {
    expect(GET_STATUS).toMatch(/subscription: \{/);
    expect(GET_STATUS).toMatch(/plan: org\.subscriptionPlan/);
    expect(GET_STATUS).toMatch(/status: org\.subscriptionStatus/);
  });

  it('counts the people, against the plan\'s cap', () => {
    expect(GET_STATUS).toMatch(/people: \{ count: peopleCount, cap:/);
    // Active users only: somebody removed from the organisation is not a seat.
    expect(GET_STATUS).toMatch(/user\.count\(\{ where: \{ organizationId, isActive: true \} \}\)/);
  });

  it('and uses the caps already defined here rather than a second copy', () => {
    /**
     * `PLAN_MEMBER_CAPS` exists on this service and in `client/src/api/billing.ts`. A third copy
     * inside one method is how the three drift.
     */
    expect(GET_STATUS).toContain('this.PLAN_MEMBER_CAPS[org.subscriptionPlan]');
  });

  it('an unlimited or absent plan reports no cap rather than a made-up one', () => {
    expect(GET_STATUS).toMatch(/org\.subscriptionPlan \? this\.PLAN_MEMBER_CAPS\[org\.subscriptionPlan\] : null/);
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
