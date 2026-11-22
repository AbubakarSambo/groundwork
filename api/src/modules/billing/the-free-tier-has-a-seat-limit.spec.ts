import { readFileSync } from 'fs';
import { join } from 'path';
import { BillingService, freeSeatLimitMessage, paidSeatLimitMessage, NO_PLAN_TO_ADD } from './billing.service';

/**
 * PERSON NUMBER SIX WAS SIMPLY ADDED.
 *
 * `canInviteMember` returned `{ allowed: true }` on its first line for any organisation without an
 * active subscription, so free accounts were exempt from seat caps entirely.
 *
 * UPDATED 23 November 2026: there is no free tier of five people any more (Hafsah, 22 November: the free plan is the free trial,
 * for teams under 20). An organisation that nothing covers, because its trial is over or its team starts on a plan, adds
 * nobody new until it chooses a plan. Nobody already here is removed.
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
    memberCapFor: async () => (opts.cap === undefined ? null : opts.cap),
  } as any;
  return new BillingService(prisma, { stripe: {} } as any, pricing, {} as any, { sendMemberCapWarning: async () => undefined } as any, {} as any);
}

describe('an organisation nothing covers adds nobody new', () => {
  it('the person who set it up is there; the next person waits for a plan', async () => {
    const res = await svc({ seats: 1 }).canInviteMember('org1');
    expect(res).toEqual({ allowed: false, reason: NO_PLAN_TO_ADD });
    expect(NO_PLAN_TO_ADD).toBe('Your organisation has no plan yet. Choose one on Plan and billing to add people.');
  });

  it('an account ALREADY over it keeps everybody and is only stopped from adding', async () => {
    const res = await svc({ seats: 9 }).canInviteMember('org1');
    expect(res.allowed).toBe(false);
    expect(res.reason).not.toMatch(/not allowed|denied|exceeded/i);
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

  it('a lapsed subscription falls back to no plan rather than to unlimited', async () => {
    /**
     * The dangerous middle state. `subscriptionPlan` is set and the status is not active, which
     * the old code read as "no subscription, therefore no limit". It has to mean the free limit,
     * or cancelling a plan is how you get infinite seats.
     */
    const res = await svc({ seats: 30, plan: 'SCALE', status: 'canceled' }).canInviteMember('org1');
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe(NO_PLAN_TO_ADD);
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
    const start = code.indexOf('PLAN_LABELS');
    const labels = code.slice(start, code.indexOf('export', start + 1));
    expect(labels).not.toMatch(/up to \d/i);
    expect(labels).not.toMatch(/people/i);
  });
});
