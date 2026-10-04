import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AssistantService } from './assistant.service';

/**
 * ASK GROUNDWORK ANSWERS THE QUESTIONS A PERSON ASKS ABOUT THEIR OWN LEAVE, REQUESTS AND WORK (4 October
 * review, items A2 and A3). Each used to get "I cannot answer that one yet". Read here as what the person
 * is told, for a member, a lead, an admin and a guest. Today is Thursday 1 October 2026.
 */
jest.mock('../suites/who-approves', () => ({
  whoApprovesFor: jest.fn(async (_p: any, input: any) => (input.suite === 'time' ? { kind: 'admin' } : { kind: 'manager', userId: 'u-boss', firstName: 'Wairimu' })),
}));

interface Opts {
  /** The approved leave of the reader's teammates, dates only, or null where the reader has no team (decision 93, row 25). */
  teammates?: { name: string; startsOn: string; endsOn: string }[] | null;
  role?: 'MEMBER' | 'LEAD' | 'ADMIN' | 'GUEST';
  leaveOff?: boolean;
  spendOff?: boolean;
  kinds?: { key: string; name: string; perYear: number | null; daysLeft: number | null }[];
  daysLeft?: number | null;
  perYear?: number | null;
  leaveRequests?: any[];
  spendRequests?: any[];
  waitingLeave?: any[];
  waitingSpend?: any[];
  off?: any[];
  limit?: number | null;
  commitments?: any[];
  toDos?: any[];
}

function svc(o: Opts = {}) {
  const role = o.role ?? 'MEMBER';
  const off = () => { throw new NotFoundException('off'); };
  const leave = {
    mine: jest.fn(async () => {
      if (o.leaveOff) off();
      if (role === 'GUEST') throw new ForbiddenException('Only people in this organisation can ask for leave here.');
      return { perYear: o.perYear === undefined ? 20 : o.perYear, daysLeft: o.daysLeft === undefined ? 17 : o.daysLeft, kinds: o.kinds ?? [], requests: o.leaveRequests ?? [] };
    }),
    teammatesOff: jest.fn(async () => {
      if (o.leaveOff) off();
      if (role === 'GUEST') return null;
      return o.teammates ?? null;
    }),
    board: jest.fn(async () => {
      if (o.leaveOff) off();
      if (role !== 'ADMIN' && role !== 'LEAD') throw new ForbiddenException('Only an admin or a lead can open this board.');
      return { reader: role.toLowerCase(), waiting: o.waitingLeave ?? [], off: o.off ?? [], toldToHr: [] };
    }),
  };
  const spending = {
    mine: jest.fn(async () => { if (o.spendOff) off(); if (role === 'GUEST') throw new ForbiddenException('Only people in this organisation can ask to spend here.'); return { currency: 'KES', requests: o.spendRequests ?? [] }; }),
    board: jest.fn(async () => { if (o.spendOff) off(); return { currency: 'KES', waiting: o.waitingSpend ?? [] }; }),
    checkForChat: jest.fn(async (_org: string, _u: string, amount: number) => {
      if (o.spendOff) off();
      const above = o.limit != null && amount > o.limit;
      return { currency: 'KES', team: 'Operations', left: 38000, fits: true, approver: 'manager', limit: o.limit ?? null, approverFirstName: above ? 'Grace' : 'Wairimu', ...(above ? { bar: o.limit, thenTo: ['Omar in finance'] } : {}) };
    }),
  };
  const timeSheets = { forChat: jest.fn(async () => ({ clients: ['Atlas'], approverFirstName: null })), board: jest.fn(async () => ({ weeks: [] })) };
  const prisma: any = {
    person: { findFirst: jest.fn(async () => ({ id: 'p1', externalId: 'u-1', active: true, linkedUserId: 'u-me', department: 'Operations' })), findMany: jest.fn(async () => []) },
    organizationMembership: { findUnique: jest.fn(async () => ({ role })) },
    ground: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
    assistantProposal: { findFirst: jest.fn(async () => null), create: jest.fn(async ({ data }: any) => ({ id: 'pr1', ...data })), update: jest.fn(async () => ({})) },
    commitment: { create: jest.fn(async () => ({})), findUnique: jest.fn(async () => null), findMany: jest.fn(async () => o.commitments ?? []) },
    todo: { findMany: jest.fn(async () => o.toDos ?? []) },
    subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    detectionQuietPeriod: { findMany: jest.fn(async () => []) },
    organizationMemory: { findMany: jest.fn(async () => []) },
    organizationSuite: { findUnique: jest.fn(async () => null) },
  };
  const service = new AssistantService(
    prisma, { respond: jest.fn(async () => { throw new Error('model off for these tests'); }) } as any,
    { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) } as any,
    { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any,
    { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
    { pendingFor: async () => [], decide: async () => { throw new Error('none'); } } as any,
    { start: async () => { throw new Error('none'); } } as any, { forPerson: async () => { throw new Error('none'); } } as any,
    { read: async () => ({ read: false, because: 'none' }) } as any,
    { sendRoundDigest: async () => { throw new Error('none'); } } as any,
    {} as any, undefined, undefined, o.leaveOff && false ? undefined : (leave as any), (timeSheets as any), (spending as any),
  );
  return { service, prisma, leave, spending };
}
const said = async (s: ReturnType<typeof svc>, q: string) => {
  const r: any = await s.service.respond('org-a', 'p1', q);
  return { lane: r.lane, text: r.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n') };
};

beforeAll(() => jest.useFakeTimers({ now: new Date('2026-10-01T09:00:00Z'), doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask', 'clearTimeout', 'clearInterval', 'clearImmediate', 'performance'] }));
afterAll(() => jest.useRealTimers());

const WORLD = {
  leaveRequests: [
    { id: 'l1', startsOn: '2026-10-08', endsOn: '2026-10-09', days: 2, status: 'waiting', where: 'Your leave from Thursday 8 October to Friday 9 October is waiting for Wairimu.' },
    { id: 'l2', startsOn: '2026-10-12', endsOn: '2026-10-13', days: 2, status: 'approved', where: 'Your leave from Monday 12 October to Tuesday 13 October is approved by Wairimu.' },
  ],
  spendRequests: [{ id: 's1', status: 'waiting', where: 'Your request to spend KES 12,000 for fuel is approved by Wairimu and is now waiting for Omar in finance.' }],
  waitingLeave: [{ id: 'w1', name: 'Amina Otieno', startsOn: '2026-10-08', endsOn: '2026-10-09', mayDecide: true }],
  waitingSpend: [{ id: 'w2', firstName: 'Omar', amount: 12000, what: 'fuel', mayDecide: true }],
  off: [
    { id: 'o1', name: 'Baraka Mutua', startsOn: '2026-10-08', endsOn: '2026-10-09' },
    { id: 'o2', name: 'Far Away', startsOn: '2026-11-08', endsOn: '2026-11-09' },
  ],
  limit: 50000,
  commitments: [{ text: 'send the price list to Carrefour', dueAt: new Date('2026-09-28T00:00:00Z'), dueSaid: 'Monday', statedAt: new Date('2026-09-20'), state: 'OPEN', sourceGroundId: null }],
  toDos: [
    { text: 'book the venue', dueAt: new Date('2026-10-05T00:00:00Z'), dueSaid: null, createdAt: new Date('2026-09-20') },
    { text: 'tidy desk', dueAt: null, dueSaid: null, createdAt: new Date('2026-09-20') },
  ],
};

const WAITING_ONE = 'One request is waiting for you to approve or decline.\nOmar\'s request to spend KES 12,000 for fuel is waiting for you.\nSay "approve" or "decline" and I will say back what you are deciding before anything happens.';
const WAITING_TWO = '2 requests are waiting for you to approve or decline.\nAmina\'s leave from Thursday 8 October to Friday 9 October is waiting for you.\nOmar\'s request to spend KES 12,000 for fuel is waiting for you.\nSay "approve" or "decline" and I will say back what you are deciding before anything happens.';
const WHERE_SPEND = 'Your request to spend KES 12,000 for fuel is approved by Wairimu and is now waiting for Omar in finance.';
const APPROVES = 'Your requests to spend go to Wairimu to approve. Anything over KES 50,000 goes to Grace to approve, and then to Omar in finance.';
const NOBODY_ELSE = 'I can only tell you about other people’s leave if you are an admin or a lead.';

describe('the questions that used to get "I cannot answer that one yet", as each reader reads them', () => {
  it.each(['MEMBER', 'LEAD', 'ADMIN'] as const)('how many days of leave are left (%s)', async (role) => {
    expect(await said(svc({ role, ...WORLD }), 'How many days of leave do I have left?')).toEqual({ lane: 'your_requests', text: 'You have 17 days of leave left this year, out of 20.' });
  });

  it('with kinds of leave set, each kind is counted by its own name', async () => {
    const kinds = [{ key: 'annual', name: 'Annual leave', perYear: 20, daysLeft: 14 }, { key: 'sick', name: 'Sick leave', perYear: 10, daysLeft: 10 }];
    expect((await said(svc({ ...WORLD, kinds }), 'how many days off do I have left')).text).toBe('This year you have 14 days of annual leave and 10 days of sick leave left.');
  });

  it('with no number of days set, says so rather than inventing one', async () => {
    expect((await said(svc({ ...WORLD, daysLeft: null, perYear: null }), 'What is my leave balance?')).text).toBe('Your organisation has not set how many days of leave each person has in a year, so I cannot say how many you have left.');
  });

  it('a guest is given the suite’s own refusal, and a switched-off suite is said to be off', async () => {
    expect((await said(svc({ role: 'GUEST', ...WORLD }), 'How many days of leave do I have left?')).text).toBe('Only people in this organisation can ask for leave here.');
    expect((await said(svc({ leaveOff: true }), 'How many days of leave do I have left?')).text).toBe('Leave requests are not switched on in your organisation, so there are no leave days to count. An admin can switch them on under Suites.');
  });

  it.each(['MEMBER', 'LEAD', 'ADMIN'] as const)('where my request to spend is (%s)', async (role) => {
    expect(await said(svc({ role, ...WORLD }), 'Where is my request to spend?')).toEqual({ lane: 'your_requests', text: WHERE_SPEND });
  });

  it('where my requests are, with no kind said, puts what still waits before what was decided', async () => {
    expect((await said(svc(WORLD), 'Where is my request?')).text).toBe([
      'Your leave from Thursday 8 October to Friday 9 October is waiting for Wairimu.',
      WHERE_SPEND,
      'Your leave from Monday 12 October to Tuesday 13 October is approved by Wairimu.',
    ].join('\n'));
  });

  it('when nothing was ever asked, says so, and a switched-off suite is said to be off', async () => {
    expect((await said(svc({}), 'Where is my request to spend?')).text).toBe('You have not asked for any leave or to spend anything, so there is no request of yours to look at. Tell me what you need and I will ask the person who decides.');
    expect((await said(svc({ spendOff: true }), 'Where is my request to spend?')).text).toBe('Spending requests are not switched on in your organisation, so there are none to look at. An admin can switch them on under Suites.');
  });

  it('what is waiting for me to approve is only what waits for this reader', async () => {
    expect(await said(svc({ role: 'MEMBER', ...WORLD, waitingLeave: [] }), 'What is waiting for me to approve?')).toEqual({ lane: 'your_requests', text: WAITING_ONE });
    expect((await said(svc({ role: 'LEAD', ...WORLD }), 'What is waiting for me to approve?')).text).toBe(WAITING_TWO);
    expect((await said(svc({ role: 'ADMIN', ...WORLD }), 'What is waiting for me to approve?')).text).toBe(WAITING_TWO);
    expect((await said(svc({}), 'What is waiting for me to approve?')).text).toBe('Nothing is waiting for you to approve or decline.');
  });

  it('who approves expenses is said from the approval rule, for the person asking', async () => {
    expect(await said(svc(WORLD), 'Who approves expenses?')).toEqual({ lane: 'who_approves', text: APPROVES });
    expect((await said(svc({ ...WORLD, limit: null }), 'Who approves spending?')).text).toBe('Your requests to spend go to Wairimu to approve.');
    expect((await said(svc(WORLD), 'Who approves my leave?')).text).toBe('Your leave requests go to Wairimu to approve.');
    expect((await said(svc(WORLD), 'Who approves my hours?')).text).toBe('Your hours go to an admin to approve, because nobody is set as the person who approves them for you.');
    expect((await said(svc({ role: 'ADMIN', ...WORLD }), 'Who approves my hours?')).text).toBe('Your hours go to an admin to approve, because nobody is set as the person who approves them for you, and you are an admin yourself.');
    expect((await said(svc({ spendOff: true }), 'Who approves expenses?')).text).toBe('Spending requests are not switched on in your organisation, so there are none to look at. An admin can switch them on under Suites.');
  });

  it('what is due lists the dated things soonest first, then what waits, then what has no date', async () => {
    const expected = [
      'You said you would do “send the price list to Carrefour” by 28 September, and that date has passed.',
      'Your to-do “book the venue” is on your list by 5 October.',
      'One request is waiting for you to approve or decline.',
      'One more thing on your list has no date. Ask me what is on your list to see it.',
    ].join('\n');
    expect(await said(svc({ role: 'MEMBER', ...WORLD, waitingLeave: [] }), 'What is due?')).toEqual({ lane: 'what_is_due', text: expected });
    expect((await said(svc({}), 'What is due?')).text).toBe('Nothing is due. You have no open commitments or to-dos with a date, and nothing is waiting for you to decide.');
  });

  it('who is off next week reads the leave board for an admin and a lead, and never looks up a person called "off next week"', async () => {
    for (const role of ['ADMIN', 'LEAD'] as const) {
      expect(await said(svc({ role, ...WORLD }), 'Who is off next week?')).toEqual({ lane: 'who_is_away', text: 'One person is off next week, from approved leave.\nBaraka Mutua is off from Thursday 8 October to Friday 9 October.' });
    }
    expect((await said(svc({ role: 'ADMIN', ...WORLD }), 'Who is away this week?')).text).toBe('Nobody is off this week, as far as approved leave goes.');
    expect((await said(svc({ role: 'LEAD', ...WORLD, off: [] }), 'Who is off next week?')).text).toBe('Nobody in your team is off next week, as far as approved leave goes.');
  });

  /* Changed by decision 93, row 25. The member half pinned "only their own leave"; a member with no team still reads that, a guest always does. */
  it('who is off next week tells a guest, and a member with no team, only their own leave (decision 75, item 28)', async () => {
    const mine = { leaveRequests: [{ id: 'l3', startsOn: '2026-10-08', endsOn: '2026-10-09', days: 2, status: 'approved', where: 'x' }] };
    expect((await said(svc({ role: 'MEMBER', ...WORLD, ...mine }), 'Who is off next week?')).text).toBe(`One person is off next week, from approved leave.\nYou are off from Thursday 8 October to Friday 9 October.\n${NOBODY_ELSE}`);
    for (const role of ['MEMBER', 'GUEST'] as const) {
      const out = await said(svc({ role, ...WORLD, teammates: role === 'GUEST' ? [{ name: 'Baraka', startsOn: '2026-10-08', endsOn: '2026-10-09' }] : null }), 'Who is off next week?');
      expect(out.text).toBe(`You are not on approved leave next week. ${NOBODY_ELSE}`);
      expect(out.text).not.toMatch(/Baraka|Far Away/);
    }
  });

  it('who is off next week tells a member who in their team is off, by first name and dates only (decision 93, row 25)', async () => {
    const teammates = [
      { name: 'Baraka', startsOn: '2026-10-08', endsOn: '2026-10-09' },
      { name: 'Wairimu', startsOn: '2026-10-12', endsOn: '2026-10-12' },
      { name: 'Far Away', startsOn: '2026-11-08', endsOn: '2026-11-09' },
    ];
    const out = await said(svc({ role: 'MEMBER', ...WORLD, teammates }), 'Who is off next week?');
    expect(out).toEqual({
      lane: 'who_is_away',
      text: 'One person is off next week, from approved leave.\nBaraka is off from Thursday 8 October to Friday 9 October.',
    });
    const both = await said(svc({ role: 'MEMBER', ...WORLD, teammates, leaveRequests: [{ id: 'l3', startsOn: '2026-10-08', endsOn: '2026-10-09', days: 2, status: 'approved', where: 'x' }] }), 'Who is off in the next two weeks?');
    expect(both.text).toBe([
      '3 people are off in the next two weeks, from approved leave.',
      'You are off from Thursday 8 October to Friday 9 October.',
      'Baraka is off from Thursday 8 October to Friday 9 October.',
      'Wairimu is off on Monday 12 October.',
    ].join('\n'));
    expect(both.text).not.toMatch(/Far Away|admin or a lead/);
    expect((await said(svc({ role: 'MEMBER', ...WORLD, teammates: [] }), 'Who is off next week?')).text).toBe('Nobody in your team is off next week, as far as approved leave goes.');
  });

  it('is private to the reader: the question and the answer are not written anywhere but the reader’s own history', async () => {
    const s = svc({ role: 'MEMBER', ...WORLD });
    await said(s, 'Who approves expenses?');
    expect(s.prisma.assistantProposal.create).not.toHaveBeenCalled();
  });
});
