/**
 * A claim went to REQUESTED and nothing reached anybody. The only way an approver learned of one
 * was opening the spend page and looking for it — so a claim could sit for a fortnight while the
 * person who submitted it assumed it was in hand and the person who could decide it did not know it
 * existed, and neither of them was wrong.
 *
 * IT IS NOT AN EMAIL, and that is the interesting part. The first attempt reached into the
 * product's mailer and `the-boundary-that-must-not-move.spec.ts` refused it — the ops system
 * imports nothing from the product, so that swapping ops for somebody else's ERP leaves every
 * check-in working. The notification goes where these people already look instead.
 */
import { OpsCeoService } from './ops-ceo.service';

const claim = (over: any = {}) => ({
  id: 'e1', date: new Date(Date.now() - 3 * 86_400_000), description: 'Flights to Nairobi',
  category: 'TRAVEL', amount: 1240.5, requesterId: 'p-ada', ...over,
});

function makeService(claims: any[]) {
  const asked: any[] = [];
  const prisma: any = {
    opsExpense: {
      findMany: jest.fn(async (a: any) => { asked.push(a); return claims.filter((c) => !a.where?.requesterId?.not || c.requesterId !== a.where.requesterId.not); }),
    },
    opsPerson: { findMany: jest.fn(async () => [{ id: 'p-ada', displayName: 'Ada' }, { id: 'p-sam', displayName: 'Sam' }]) },
  };
  return { service: new OpsCeoService(prisma), asked };
}

const whoCanDecide = { personId: 'p-ceo', key: 'ceo', displayName: 'The CEO', functionalRole: 'CEO' as any, capabilities: ['spend:approve'] };
const whoCannot = { ...whoCanDecide, personId: 'p-ada', key: 'ada', capabilities: ['spend:submit'] };

describe('a claim nobody knows about sits', () => {
  it('tells somebody who can decide what is waiting', async () => {
    const { service } = makeService([claim()]);
    const out = await service.spendWaitingOnYou(whoCanDecide as any);
    expect(out.claims).toHaveLength(1);
    expect(out.claims[0].who).toBe('Ada');
    expect(out.claims[0].amount).toBe(1240.5);
  });

  it('says how long it has been sitting, which is what decides whether to look now', async () => {
    const { service } = makeService([claim()]);
    const out = await service.spendWaitingOnYou(whoCanDecide as any);
    expect(out.claims[0].waitingDays).toBe(3);
  });

  it('and the total, so a page can lead with one number', async () => {
    const { service } = makeService([claim(), claim({ id: 'e2', amount: 60 })]);
    const out = await service.spendWaitingOnYou(whoCanDecide as any);
    expect(out.total).toBe(1300.5);
  });

  it('returns nothing at all to somebody who cannot decide spend', async () => {
    /* A board section that is permanently empty is a locked menu item wearing a friendlier face. */
    const { service, asked } = makeService([claim()]);
    const out = await service.spendWaitingOnYou(whoCannot as any);
    expect(out).toEqual({ claims: [], total: 0 });
    /* It should not even query. */
    expect(asked).toEqual([]);
  });

  it('never lists your own claim, because nobody approves their own spend', async () => {
    const { service, asked } = makeService([claim({ requesterId: 'p-ceo' })]);
    const out = await service.spendWaitingOnYou(whoCanDecide as any);
    expect(out.claims).toEqual([]);
    expect(asked[0].where.requesterId).toEqual({ not: 'p-ceo' });
  });

  it('asks only for claims that need a decision', async () => {
    const { service, asked } = makeService([]);
    await service.spendWaitingOnYou(whoCanDecide as any);
    expect(asked[0].where.status).toBe('REQUESTED');
  });

  it('and names people without a relation the schema does not have', async () => {
    /* `requesterId` is a plain column. The ops system holds its own references, the same shape as
       `OpsPerson.userId` - see the boundary spec. */
    const { service } = makeService([claim({ requesterId: 'p-unknown' })]);
    const out = await service.spendWaitingOnYou(whoCanDecide as any);
    expect(out.claims[0].who).toBe('Somebody on the team');
  });
});

describe('and it did not cross the boundary to do it', () => {
  const fs = require('fs');
  const path = require('path');
  /*
   * COMMENTS STRIPPED FIRST. The note in ops-ceo.service explaining why this is NOT an email names
   * the product's mailer in order to say it is not reached for - so a match against the raw file
   * would fail on the explanation of the fix. Caught by the meta-guard that exists for exactly
   * this: a-guard-that-a-comment-satisfies-is-not-a-guard.
   */
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const service = strip(fs.readFileSync(path.join(__dirname, 'ops-ceo.service.ts'), 'utf8'));
  const module_ = strip(fs.readFileSync(path.join(__dirname, 'ops.module.ts'), 'utf8'));

  it('imports nothing from the product', () => {
    for (const crossing of ['email/email.service', 'email/email.module', 'workspace/', 'conversation/']) {
      expect({ crossing, inService: service.includes(crossing), inModule: module_.includes(crossing) })
        .toEqual({ crossing, inService: false, inModule: false });
    }
  });
});
