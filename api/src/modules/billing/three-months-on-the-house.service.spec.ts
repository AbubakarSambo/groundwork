import { ThreeMonthsOnTheHouseService } from './three-months-on-the-house.service';
import { BadRequestException } from '@nestjs/common';

/**
 * "WE PUT IN SOMEONE'S EMAIL AND THEIR ORG GETS FREE USE FOR THREE MONTHS."
 *
 * Three rules, each of which is a way the feature fails quietly rather than loudly: an address that
 * does not match means the person signs up and sees nothing; a clock that starts at the grant means
 * the ones we forget to chase are the ones that expire unused; and a claim that throws means
 * somebody cannot create their organisation because of a discount.
 */
function serviceWith(row: any) {
  const state: any = { row, org: null as any };
  const prisma: any = {
    freeRun: {
      findUnique: jest.fn(async () => state.row),
      upsert: jest.fn(async ({ create, update }: any) => ({ id: 'fr1', ...(state.row ? { ...state.row, ...update } : create) })),
      update: jest.fn(async ({ data }: any) => { state.row = { ...state.row, ...data }; return state.row; }),
      findMany: jest.fn(async () => (state.row ? [state.row] : [])),
    },
    organization: { update: jest.fn(async ({ data }: any) => { state.org = data; return data; }) },
    $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
  };
  return { svc: new ThreeMonthsOnTheHouseService(prisma), prisma, state };
}

describe('three months on the house', () => {
  it('refuses something that is not an address, rather than promising nobody anything', async () => {
    const { svc } = serviceWith(null);
    await expect(svc.grant({ email: 'not an email' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lowercases the address, because a grant that misses is worse than no grant', async () => {
    const { svc, prisma } = serviceWith(null);
    await svc.grant({ email: '  Sam@Work.COM ' });
    expect(prisma.freeRun.upsert.mock.calls[0][0].where.email).toBe('sam@work.com');
  });

  /* Changed 5 October 2026: every free run is one month (Hafsah), where this pinned the three she first asked for. */
  it('defaults to one month, and caps a typo', async () => {
    const { svc, prisma } = serviceWith(null);
    await svc.grant({ email: 'a@b.com' });
    expect(prisma.freeRun.upsert.mock.calls[0][0].create.months).toBe(1);
    await svc.grant({ email: 'a@b.com', months: 900 });
    expect(prisma.freeRun.upsert.mock.calls[1][0].update.months).toBe(24);
  });

  it('will not re-promise one somebody has already taken up', async () => {
    const { svc } = serviceWith({ id: 'fr1', email: 'a@b.com', claimedAt: new Date() });
    await expect(svc.grant({ email: 'a@b.com' })).rejects.toBeInstanceOf(BadRequestException);
  });

  /* The clock starts at the claim: a promise made in September and taken up in November is still
     three whole months. */
  it('starts the months when they sign up, and writes the end date on the organisation', async () => {
    const { svc, prisma } = serviceWith({ id: 'fr1', email: 'a@b.com', months: 3, plan: 'GROWTH', revokedAt: null, claimedAt: null });
    const taken = await svc.claimFor('A@B.com', 'org1');
    expect(taken?.months).toBe(3);
    const wrote = prisma.organization.update.mock.calls[0][0].data;
    expect(wrote.freePlan).toBe('GROWTH');
    expect(new Date(wrote.freeUntil).getTime()).toBeGreaterThan(Date.now());
  });

  it('gives nothing twice, and nothing to an address that was withdrawn', async () => {
    const claimed = serviceWith({ id: 'fr1', email: 'a@b.com', months: 3, plan: 'GROWTH', claimedAt: new Date() });
    expect(await claimed.svc.claimFor('a@b.com', 'org1')).toBeNull();
    const gone = serviceWith({ id: 'fr2', email: 'a@b.com', months: 3, plan: 'GROWTH', revokedAt: new Date() });
    expect(await gone.svc.claimFor('a@b.com', 'org1')).toBeNull();
  });

  /* A discount must never be able to stop somebody creating their organisation. */
  it('swallows its own failure at sign-up rather than blocking the sign-up', async () => {
    const { svc, prisma } = serviceWith({ id: 'fr1', email: 'a@b.com', months: 3, plan: 'GROWTH' });
    prisma.$transaction.mockRejectedValueOnce(new Error('database is having a day'));
    await expect(svc.claimFor('a@b.com', 'org1')).resolves.toBeNull();
  });

  it('tells the sign-up screen only how long and on what', async () => {
    const { svc } = serviceWith({ id: 'fr1', email: 'a@b.com', months: 3, plan: 'GROWTH', note: 'partner deal', grantedByUserId: 'u1' });
    expect(await svc.whatIsWaitingFor('a@b.com')).toEqual({ months: 3, plan: 'GROWTH' });
  });
});

/** Hafsah, 22 Sep 2026: "it didn't actually give them free, it is saying waiting for them to sign up" - about people who had. */
describe('somebody who has already signed up is not waiting to', () => {
  function serviceWithAUser(user: any) {
    const state: any = { row: null as any, org: null as any };
    const prisma: any = {
      freeRun: {
        findUnique: jest.fn(async () => state.row),
        upsert: jest.fn(async ({ create }: any) => { state.row = { id: 'fr1', claimedAt: null, revokedAt: null, ...create }; return state.row; }),
        update: jest.fn(async ({ data }: any) => { state.row = { ...state.row, ...data }; return state.row; }),
      },
      user: { findUnique: jest.fn(async () => user) },
      organization: { update: jest.fn(async ({ where, data }: any) => { state.org = { where, data }; return data; }) },
      $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
    };
    return { svc: new ThreeMonthsOnTheHouseService(prisma), prisma, state };
  }

  it('lands the months on their organisation the moment the promise is made', async () => {
    const { svc, state } = serviceWithAUser({ organizationId: 'org-ilri' });
    const row: any = await svc.grant({ email: 'hafsah@coamana.com', months: 1 });
    expect(row.claimedAt).toBeInstanceOf(Date);
    expect(row.claimedByOrganizationId).toBe('org-ilri');
    expect(state.org.where).toEqual({ id: 'org-ilri' });
    expect(state.org.data.freeUntil).toBeInstanceOf(Date);
  });

  it('and still waits for somebody who has not', async () => {
    const { svc, state } = serviceWithAUser(null);
    const row: any = await svc.grant({ email: 'new@person.test' });
    expect(row.claimedAt).toBeNull();
    expect(state.org).toBeNull();
  });
});
