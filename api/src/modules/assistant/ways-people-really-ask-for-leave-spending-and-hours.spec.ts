import { readLeaveDates, soundsLikeLeave } from '../suites/leave-said-in-chat';
import { readHours } from '../suites/hours-said-in-chat';
import { readSpending } from '../suites/spend-said-in-chat';
import { AssistantService } from './assistant.service';

/**
 * LEAVE, SPENDING AND HOURS ARE UNDERSTOOD IN THE WAYS PEOPLE REALLY SAY THEM (4 October review, item S8).
 * "Can I buy a new laptop for 95,000?" and "I need 5000 for airtime" were not read as spending and got "I
 * cannot answer that one yet"; "a week off from 19 October" was read as one day; "Spent 2 hours on
 * Lakeside this morning" was not read as hours. Five or more phrasings each, read as what the person is told.
 * Today is Thursday 1 October 2026.
 */
function svc(left = 38000) {
  const proposals: any[] = [];
  const checkForChat = jest.fn(async () => ({ currency: 'KES', team: 'Operations', left, fits: true, approver: 'manager', limit: null, approverFirstName: 'Wairimu' }));
  const prisma: any = {
    person: { findFirst: jest.fn(async () => ({ id: 'p1', externalId: 'u-1', active: true, linkedUserId: 'u-me', department: 'Operations' })), findMany: jest.fn(async () => []) },
    organizationMembership: { findUnique: jest.fn(async () => ({ role: 'MEMBER' })) },
    ground: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
    assistantProposal: { findFirst: jest.fn(async () => null), create: jest.fn(async ({ data }: any) => { const p = { id: 'pr1', ...data }; proposals.push(p); return p; }), update: jest.fn(async () => ({})) },
    commitment: { create: jest.fn(async () => ({})), findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    detectionQuietPeriod: { findMany: jest.fn(async () => []) },
    organizationMemory: { findMany: jest.fn(async () => []) },
    organizationSuite: { findUnique: jest.fn(async () => null) },
  };
  return new AssistantService(
    prisma, { respond: jest.fn(async () => { throw new Error('model off for these tests'); }) } as any,
    { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) } as any,
    { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any,
    { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
    { pendingFor: async () => [], decide: async () => { throw new Error('none'); } } as any,
    { start: async () => { throw new Error('none'); } } as any, { forPerson: async () => { throw new Error('none'); } } as any,
    { read: async () => ({ read: false, because: 'none' }) } as any,
    { sendRoundDigest: async () => { throw new Error('none'); } } as any,
    {} as any, undefined, undefined, undefined, undefined, { checkForChat, ask: jest.fn() } as any,
  );
}

beforeAll(() => jest.useFakeTimers({ now: new Date('2026-10-01T09:00:00Z'), doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask', 'clearTimeout', 'clearInterval', 'clearImmediate', 'performance'] }));
afterAll(() => jest.useRealTimers());
const said = async (s: AssistantService, q: string) => {
  const r: any = await s.respond('org-a', 'p1', q);
  return { lane: r.lane, text: r.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n') };
};

describe('five realistic ways to ask for leave, to spend, and to log hours', () => {
  const today = new Date('2026-10-01T09:00:00Z');

  it.each([
    ['I need next Thursday and Friday off', '2026-10-08', '2026-10-09'],
    ['Can I take Friday off?', '2026-10-02', '2026-10-02'],
    ['I want to take a week off from 19 October', '2026-10-19', '2026-10-25'],
    ['Could I have the 23rd off?', '2026-10-23', '2026-10-23'],
    ['Is it okay if I take tomorrow off?', '2026-10-02', '2026-10-02'],
  ])('leave: %s', (q, from, to) => {
    expect(soundsLikeLeave(q)).toBe(true);
    expect(readLeaveDates(q, today)).toEqual({ startsOn: from, endsOn: to });
  });

  it.each([
    ['Can I buy a new laptop for 95,000?', 95000, 'a new laptop'],
    ['I need 5000 for airtime', 5000, 'airtime'],
    ['I’d like to buy a projector for KES 60,000', 60000, 'a projector'],
    ['Please can I get 15,000 for the team lunch?', 15000, 'the team lunch'],
    ['Could I claim 3,500 for taxi fares?', 3500, 'taxi fares'],
    ['I want to pay 20k for the venue deposit', 20000, 'the venue deposit'],
    ['Can we order 12 chairs for 30,000?', 30000, '12 chairs'],
  ])('spending: %s', (q, amount, what) => {
    expect(readSpending(q, 'KES')).toEqual({ kind: 'ok', said: { amount, what, currency: 'KES' } });
  });

  it('spending: a quantity with no money in it is not read as spending', () => {
    for (const q of ['I need 10 chairs for the office', 'Can we order 12 chairs?', 'I need 3 days for the audit']) expect(readSpending(q, 'KES')).toEqual({ kind: 'none' });
  });

  it.each([
    ['I did 6 hours on Atlas today', '2026-10-01', 'Atlas', 6],
    ['Spent 2 hours on Lakeside this morning', '2026-10-01', 'Lakeside', 2],
    ['Log 3 hours on Atlas for yesterday', '2026-09-30', 'Atlas', 3],
    ['Add 3 hours to Atlas for yesterday', '2026-09-30', 'Atlas', 3],
    ['I just worked 4 hours on Lakeside today', '2026-10-01', 'Lakeside', 4],
  ])('hours: %s', (q, onDay, client, hours) => {
    expect(readHours(q, ['Atlas', 'Lakeside'], today)).toEqual({ kind: 'ok', said: { onDay, entries: [{ client, hours }] } });
  });

  it('a laptop for 95,000 is said back as a request to spend, end to end', async () => {
    const s = svc();
    expect(await said(s, 'Can I buy a new laptop for 95,000?')).toEqual({
      lane: 'ask_to_spend',
      text: 'You asked to spend KES 95,000 on a new laptop. That is over the Operations budget left for October, which is KES 38,000. Shall I still send it to Wairimu to approve?',
    });
  });
});

describe('an amount written with its currency as a word (clean-install run, 6 October)', () => {
  it.each([
    ['Can I spend 15,000 shillings on fuel for the van this week?', 15000, 'fuel for the van this week', 'KES'],
    ['I need to spend 20,000 shillings on printing', 20000, 'printing', 'KES'],
    ['Can I spend 12,000 naira on fuel?', 12000, 'fuel', 'NGN'],
    ['Can I buy a chair for 300 dollars?', 300, 'a chair', 'USD'],
    ['Can I spend 800 cedis on fuel?', 800, 'fuel', 'GHS'],
    ['Can I spend 5,000 rand on fuel?', 5000, 'fuel', 'ZAR'],
  ])('%s', (q, amount, what, currency) => {
    const read: any = readSpending(q, currency === 'KES' ? 'KES' : currency);
    expect(read).toEqual({ kind: 'ok', said: { amount, what, currency } });
  });

  it('dollars are not taken for shillings', () => {
    expect((readSpending('Can I spend 300 dollars on fuel?', 'KES') as any).say).toBe('Your organisation counts spending in KES, and you wrote USD. Tell me the amount in KES and I will ask again.');
  });

  it('Amani asks what the money is for, answers it, and the answer is taken as the reason, said back before it goes', async () => {
    const s = svc();
    const prisma: any = (s as any).prisma;
    const first: any = await s.respond('org-a', 'p1', 'Can I spend 15,000 shillings this week?');
    expect(first.blocks[0].body).toBe('What is the KES 15,000 for? Tell me in a few words and I will ask again.');
    const parked = prisma.assistantProposal.create.mock.calls.map((c: any) => c[0].data).find((d: any) => d.kind === 'spend_purpose');
    expect(parked.payload).toEqual({ amount: 15000, currency: 'KES' });
    prisma.assistantProposal.findFirst.mockImplementationOnce(async () => ({ id: 'pp1', state: 'PENDING', createdAt: new Date(), ...parked }));
    const second: any = await s.respond('org-a', 'p1', 'Fuel for the van to deliver the Fresh Basket order.');
    expect(second.lane).toBe('ask_to_spend');
    expect(second.blocks[0].body).toMatch(/^You asked to spend KES 15,000 on Fuel for the van to deliver the Fresh Basket order\./);
    expect(JSON.stringify(second)).not.toContain('cannot answer');
  });
});

