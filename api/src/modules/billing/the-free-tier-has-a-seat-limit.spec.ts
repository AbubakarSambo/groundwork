import { readFileSync } from 'fs';
import { join } from 'path';
import { BillingService, freeSeatLimitMessage, paidSeatLimitMessage } from './billing.service';
import { DEFAULT_FREE_MEMBER_LIMIT } from './pricing.service';

/**
 * PERSON NUMBER SIX WAS SIMPLY ADDED.
 *
 * `canInviteMember` returned `{ allowed: true }` on its first line for any organisation without an
 * active subscription, so free accounts were exempt from seat caps entirely. The free tier is now
 * "10 check-ins, for teams of 5 or fewer", and this is the gate that means it.
 *
 * Three properties, all of which were decided rather than assumed:
 *
 *   1. The count INCLUDES the creator, so five means them plus four others. Every message says so,
 *      because "5 people" reads as "5 people I can invite".
 *   2. Nothing existing is touched. An account already over the limit keeps every member and is
 *      only stopped from adding more - this gate is only ever asked about somebody NEW.
 *   3. The caps come from the database, so this file states no cap of its own.
 */

function svc(opts: {
  seats: number;
  plan?: string | null;
  status?: string | null;
  freeLimit?: number;
  cap?: number | null;
}) {
  const prisma = {
    user: { count: async () => opts.seats },
    organization: {
      findUnique: async ({ select }: any) => {
        const out: any = { subscriptionPlan: opts.plan ?? null, subscriptionStatus: opts.status ?? null };
        if (select?._count?.select?.users) out._count = { users: opts.seats };
        /** The admin-notification lookup asks for users; nobody to notify keeps the test quiet. */
        if (select?.users) out.users = [];
        return out;
      },
    },
  } as any;
  const pricing = {
    getFreeMemberLimit: async () => opts.freeLimit ?? DEFAULT_FREE_MEMBER_LIMIT,
    memberCapFor: async () => (opts.cap === undefined ? null : opts.cap),
  } as any;
  return new BillingService(prisma, { stripe: {} } as any, pricing, {} as any, { sendMemberCapWarning: async () => undefined } as any, {} as any);
}

describe('a free organisation has a seat limit', () => {
  it('the fifth person is allowed, because the limit is five INCLUDING the creator', async () => {
    /** Four already there, the creator among them, so the fifth is the last one that fits. */
    const res = await svc({ seats: 4 }).canInviteMember('org1');
    expect(res.allowed).toBe(true);
  });

  it('the sixth is refused', async () => {
    const res = await svc({ seats: 5 }).canInviteMember('org1');
    expect(res.allowed).toBe(false);
  });

  it('and the refusal says the count includes them, and what subscribing gives', async () => {
    const res = await svc({ seats: 5 }).canInviteMember('org1');
    expect(res.reason).toContain('including you');
    expect(res.reason).toContain('invite 4 others');
    expect(res.reason).toContain('Subscribe');
    /** Plain and non-punitive: nothing about what they did wrong, no "not allowed". */
    expect(res.reason).not.toMatch(/not allowed|cannot|denied|exceeded/i);
  });

  it('an account ALREADY over the limit keeps everybody and is only stopped from adding', async () => {
    /**
     * The no-retroactive-lockout property, as behaviour. A free account sitting at nine people is
     * refused a tenth and nothing else happens to it: this method only ever answers "may I add
     * one more", and it has no path that removes anybody.
     */
    const res = await svc({ seats: 9 }).canInviteMember('org1');
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('including you');
  });

  it('the limit is whatever an admin has set, not a number in this file', async () => {
    expect((await svc({ seats: 7, freeLimit: 8 }).canInviteMember('org1')).allowed).toBe(true);
    expect((await svc({ seats: 8, freeLimit: 8 }).canInviteMember('org1')).allowed).toBe(false);
  });
});

describe('a subscribed organisation uses its plan cap, from the database', () => {
  it('under the cap is allowed', async () => {
    const res = await svc({ seats: 19, plan: 'SMALL_TEAM', status: 'active', cap: 20 }).canInviteMember('org1');
    expect(res.allowed).toBe(true);
  });

  it('at the cap is refused, and the message names the plan and the number', async () => {
    const res = await svc({ seats: 20, plan: 'SMALL_TEAM', status: 'active', cap: 20 }).canInviteMember('org1');
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('Small Team');
    expect(res.reason).toContain('20 people, including you');
  });

  it('a null cap means unlimited', async () => {
    const res = await svc({ seats: 5000, plan: 'ENTERPRISE', status: 'active', cap: null }).canInviteMember('org1');
    expect(res.allowed).toBe(true);
  });

  it('a lapsed subscription falls back to the FREE limit rather than to unlimited', async () => {
    /**
     * The dangerous middle state. `subscriptionPlan` is set and the status is not active, which
     * the old code read as "no subscription, therefore no limit". It has to mean the free limit,
     * or cancelling a plan is how you get infinite seats.
     */
    const res = await svc({ seats: 30, plan: 'SCALE', status: 'canceled' }).canInviteMember('org1');
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('free plan');
  });
});

describe('the messages, and where the caps are allowed to live', () => {
  it('both messages state the count includes the reader', () => {
    expect(freeSeatLimitMessage(5)).toContain('including you');
    expect(paidSeatLimitMessage('Growth', 100)).toContain('including you');
  });

  it('the free message does the arithmetic so the reader does not have to', () => {
    expect(freeSeatLimitMessage(5)).toContain('invite 4 others');
  });

  it('billing.service states no seat cap of its own', () => {
    /**
     * Comments stripped. This file now EXPLAINS the deleted map at length, quoting the plan names
     * while doing it, and a guard a comment can satisfy is not a guard.
     */
    const code = readFileSync(join(__dirname, 'billing.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/PLAN_MEMBER_CAPS/);
    expect(code).not.toMatch(/SubscriptionPlan\.SCALE\]:\s*\d+/);
    expect(code).toMatch(/pricing\.memberCapFor/);
  });

  it('and the plan labels no longer carry a seat count', () => {
    /** "Starter (up to 5 people)" reached Stripe as the Product name, a fourth copy of the cap. */
    const code = readFileSync(join(__dirname, 'pricing.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const labels = code.slice(code.indexOf('PLAN_LABELS'), code.indexOf('FREE_GROUND_LIMIT_KEY'));
    expect(labels).not.toMatch(/up to \d/i);
    expect(labels).not.toMatch(/people/i);
  });
});
