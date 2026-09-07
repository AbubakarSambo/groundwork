import { readFileSync } from 'fs';
import { join } from 'path';
import { BillingService } from './billing.service';
import { SEAT_WHERE } from '../../common/seats';

/**
 * AN ORGANISATION WAS REFUSED A SEAT ITS OWN BILLING PAGE SAID IT HAD.
 *
 * Two queries answered the same question, "how many people are on this account", and disagreed:
 *
 *   the gate     canInviteMember   `_count: { select: { users: true } }`   every User row
 *   the display  getStatus         `user.count({ isActive: true })`        active rows only
 *
 * Neither was wrong on its own. An org with two deactivated members read "3 of 5 people" on its
 * billing page and could not invite a fourth, and there is no support answer to that, because both
 * screens are telling the truth about different questions.
 *
 * The test that matters here is BEHAVIOURAL, not a grep: both paths are driven against ONE table of
 * users, so a future change that alters one predicate and not the other fails on the mismatch
 * rather than on the wording of a where clause.
 */

/** One user table, two readers. `count` applies the filters the real Prisma would. */
function fakePrisma(users: { isActive: boolean; deletedAt: Date | null }[], plan: string | null) {
  const matches = (u: (typeof users)[number], where: any) =>
    (where.isActive === undefined || u.isActive === where.isActive) &&
    (where.deletedAt === undefined || (where.deletedAt === null ? u.deletedAt === null : u.deletedAt !== null));

  return {
    user: { count: async ({ where }: any) => users.filter((u) => matches(u, where)).length },
    organization: {
      findUnique: async ({ select }: any) => {
        const out: any = {
          subscriptionPlan: plan,
          subscriptionStatus: plan ? 'active' : null,
          stripeCustomerId: null,
          defaultPaymentMethodId: null,
          subscriptionPeriodEnd: null,
          freeExtensionUsed: false,
        };
        /** The gate reads its number through a filtered relation count, so honour the filter. */
        if (select?._count?.select?.users) {
          out._count = { users: users.filter((u) => matches(u, select._count.select.users.where ?? {})).length };
        }
        return out;
      },
    },
    ground: { findMany: async () => [], count: async () => 0 },
    /* This spec is about seats. The usage counts on the same response answer zero and stay out of
       its way - they are covered where they are rendered. */
    report: { count: async () => 0 },
    groundParticipant: { findMany: async () => [] },
  } as any;
}

/**
 * The caps moved into `pricing_plans` after this spec was written, so the service reads them
 * through PricingService now. Starter's 5 is stated HERE rather than imported, because the point
 * of this file is that two readers agree about the same PEOPLE - the cap is just a number both
 * sides are compared against.
 */
const STARTER_CAP = 5;

function svcFor(users: { isActive: boolean; deletedAt: Date | null }[], plan: string | null) {
  const prisma = fakePrisma(users, plan);
  const pricing = {
    memberCapFor: async () => STARTER_CAP,
    getFreeMemberLimit: async () => STARTER_CAP,
  } as any;
  return new BillingService(prisma, { stripe: {} } as any, pricing, {} as any, { sendMemberCapWarning: async () => undefined } as any, {} as any);
}

/** Three usable people, two deactivated, one soft-deleted. Six rows, three seats. */
const MIXED = [
  { isActive: true, deletedAt: null },
  { isActive: true, deletedAt: null },
  { isActive: true, deletedAt: null },
  { isActive: false, deletedAt: null },
  { isActive: false, deletedAt: null },
  { isActive: true, deletedAt: new Date() },
];

describe('the gate and the billing page count the same people', () => {
  it('agree on an account with deactivated and deleted members', async () => {
    const svc = svcFor(MIXED, 'STARTER');
    const status = await svc.getStatus('org1');
    /** Starter caps at 5. Three seats, so an invitation must be allowed. */
    const gate = await svc.canInviteMember('org1');

    expect(status.people.count).toBe(3);
    expect(gate.allowed).toBe(true);
  });

  it('and the exact failure this closes: 3 of 5 shown, invitation refused', async () => {
    /**
     * The old gate counted all six rows against a cap of five and refused. This asserts the two
     * numbers cannot part company again: whatever the display says, the gate has that much room.
     */
    const svc = svcFor(MIXED, 'STARTER');
    const status = await svc.getStatus('org1');
    const gate = await svc.canInviteMember('org1');
    const cap = status.people.cap!;
    expect(cap).toBe(STARTER_CAP);
    expect(status.people.count).toBeLessThan(cap);
    expect(gate.allowed).toBe(true);
  });

  it('a genuinely full account is still refused, and the reason names the cap', async () => {
    /** The control. Loosening the count must not have loosened the cap. */
    const full = Array.from({ length: 5 }, () => ({ isActive: true, deletedAt: null }));
    const svc = svcFor(full, 'STARTER');
    const status = await svc.getStatus('org1');
    const gate = await svc.canInviteMember('org1');

    expect(status.people.count).toBe(5);
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toContain('5');
  });

  it('a deactivated member frees the seat they were holding', async () => {
    /**
     * The point of the definition, stated as behaviour: five active people are full, and
     * deactivating one leaves room, on BOTH screens, without deleting anybody.
     */
    const afterDeactivating = [
      ...Array.from({ length: 4 }, () => ({ isActive: true, deletedAt: null })),
      { isActive: false, deletedAt: null },
    ];
    const svc = svcFor(afterDeactivating, 'STARTER');
    expect((await svc.getStatus('org1')).people.count).toBe(4);
    expect((await svc.canInviteMember('org1')).allowed).toBe(true);
  });
});

describe('there is one definition of a seat, not a copy per call site', () => {
  const SEAT_SITES = [
    'src/modules/billing/billing.service.ts',
    'src/modules/admin/admin.service.ts',
    'src/modules/prompts/prompts.service.ts',
  ];

  it('the predicate itself is what we say it is', () => {
    /*
     * The third key arrived with the door queue. Accepting a check-in invitation to an organisation
     * you were not already in creates your account there and queues you for an admin - until they
     * answer you cannot open a check-in at all, so charging for you would be charging for somebody
     * who can do nothing. It would also make the queue pointless: the reason it exists is that
     * adding an address to a check-in was quietly adding a person to a bill.
     *
     * Pinned by value on purpose. A seat predicate that can gain a key without a test failing is
     * how the two screens came apart the first time.
     */
    expect(SEAT_WHERE).toEqual({ isActive: true, deletedAt: null, awaitingOrgApproval: false });
  });

  it('no seat site counts users without going through it', () => {
    /**
     * Comments stripped first. This repo quotes code verbatim inside long comments, including the
     * old `_count: { select: { users: true } }` in seats.ts itself, and a guard a comment can
     * satisfy is not a guard.
     */
    for (const rel of SEAT_SITES) {
      const code = readFileSync(join(__dirname, '..', '..', '..', rel), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      expect(code).not.toMatch(/_count: \{ select: \{ (grounds: true, )?users: true/);
      expect(code).toMatch(/SEAT_WHERE|SEAT_RELATION_COUNT/);
    }
  });

  it('the two counts that ask a DIFFERENT question are left alone, deliberately', () => {
    /**
     * Not oversights, and a future sweep must not "fix" them into seat counts:
     *   - the team list total must match the rows it paginates, which include deactivated people.
     *   - the org-delete predicate must see every row, because deleting an org destroys a
     *     deactivated person's data too.
     */
    const users = readFileSync(join(__dirname, '../users/users.service.ts'), 'utf8');
    expect(users).toMatch(/user\.count\(\{ where: \{ organizationId, deletedAt: null \} \}\)/);

    const sweep = readFileSync(join(__dirname, '../entry/unverified-sweep.ts'), 'utf8');
    expect(sweep).toMatch(/prisma\.user\.count\(\{ where: \{ organizationId: user\.organizationId, id: \{ not: user\.id \} \} \}\)/);
  });
});
