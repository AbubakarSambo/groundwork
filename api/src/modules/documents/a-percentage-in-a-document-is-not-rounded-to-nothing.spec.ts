import { DocumentsService } from './documents.service';

/**
 * DUMPS AND DOCUMENTS (4 October 2026). In the onboarding plan "forecast accurate to within 20%" was
 * waiting to be written as a target of 0, and "discounts above 10% without Funmi" as a limit of 0: the
 * model gave 0.2 and 0.1, and they were rounded to whole numbers. A fraction is kept as a percentage
 * only where the document says that percentage.
 */
const PLAN = 'Chidera Nwosu. Her forecast accurate to within 20%. No discounts above 10% without Funmi. Pipeline N18m by day 90.';
const people = { chidera: { id: 'p-c', userId: 'u-c', email: 'chidera@x.test', managingOnly: false, user: { firstName: 'Chidera', lastName: 'Nwosu' } }, lead: { id: 'p-l', userId: 'u-lead', email: 'hannah@x.test', managingOnly: false, user: { firstName: 'Hannah', lastName: 'Cole' } } };

describe('a document\'s percentage', () => {
  it('is kept as the percentage the document says, and a fraction it cannot account for is not kept', async () => {
    const s = Object.create(DocumentsService.prototype) as any;
    s.prisma = {
      ground: { findUnique: async () => ({ initiatorId: 'u-lead', participants: Object.values(people), objectives: [] }) },
      groundDocument: { update: async ({ data }: any) => data },
    };
    s.anthropic = { extract: async () => ({
      whatItIs: 'It is a plan.',
      forOnePerson: [
        { personName: 'Chidera Nwosu', what: 'forecast accurate to within', target: 0.2 },
        { personName: 'Chidera Nwosu', what: 'pipeline created', target: 18_000_000 },
        { personName: 'Chidera Nwosu', what: 'a share nobody wrote', target: 0.07 },
      ],
      forEverybody: [{ what: 'discounts without Funmi', target: 0.1, kind: 'not to exceed' }],
      dates: [],
    }) };
    s.config = { get: () => true };
    s.logger = { log: jest.fn(), warn: jest.fn() };
    const held = await s.whatItHolds('d1', 'g1', 'p-l', PLAN, 'plan.txt');
    expect(held.forOnePerson.map((r: any) => `${r.what} ${r.target}`)).toEqual(['forecast accurate to within 20', 'pipeline created 18000000']);
    expect(held.forEverybody.map((r: any) => `${r.what} ${r.target}`)).toEqual(['discounts without Funmi 10']);
    expect(held.waiting.map((w: any) => w.target)).toEqual([20, 18_000_000, 10]);
  });
});

describe('a number the document gives to a person is theirs and not also everyone\'s', () => {
  it('keeps the owner\'s number and drops the same measure at the same figure from the group\'s, and keeps a different one', async () => {
    const s = Object.create(DocumentsService.prototype) as any;
    s.prisma = {
      ground: { findUnique: async () => ({ initiatorId: 'u-lead', participants: Object.values(people), objectives: [] }) },
      groundDocument: { update: async ({ data }: any) => data },
    };
    s.anthropic = { extract: async () => ({
      whatItIs: 'It is a plan.',
      forOnePerson: [
        { personName: 'Chidera Nwosu', what: 'Pipeline created', target: 18_000_000 },
        { personName: 'Hannah Cole', what: 'Hires', target: 6 },
        { personName: 'Gbenga Salami', what: 'Turnover', target: 4 },
      ],
      forEverybody: [
        { what: 'pipeline created', target: 18_000_000 },
        { what: 'Turnover', target: 4, kind: 'not to exceed' },
        { what: 'Total budget', target: 15_000_000, kind: 'not to exceed' },
      ],
      dates: [],
    }) };
    s.config = { get: () => true };
    s.logger = { log: jest.fn(), warn: jest.fn() };
    const held = await s.whatItHolds('d1', 'g1', 'p-l', PLAN, 'plan.txt');
    expect(held.forEverybody.map((r: any) => r.what)).toEqual(['Total budget']);
    expect(held.forOnePerson.map((r: any) => r.who)).toEqual(['Chidera Nwosu', 'Hannah Cole']);
    expect(held.unmatched).toEqual(['Gbenga Salami']);
  });
});
