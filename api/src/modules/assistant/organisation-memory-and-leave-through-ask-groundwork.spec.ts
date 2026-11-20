import { AssistantService } from './assistant.service';

/**
 * WEEK 20, THROUGH ASK GROUNDWORK. Read as what the person is told.
 *
 * What the organisation kept is answered to the people who may read it (an admin, a lead, anybody who
 * runs a check-in) and to nobody else; the yes and the no to keeping something reach the setup
 * conversation's own code with the id of what was offered; and leave dates go to the leave suite.
 * Today is Thursday 1 October 2026.
 */
const RULE = "Every quote over 1 million needs Amina's sign-off";

function svc(opts: { role?: string; runsACheckIn?: boolean; kept?: any[]; parked?: any; suiteOn?: boolean } = {}) {
  const proposals: any[] = [];
  const applyContextProposal = jest.fn(async () => ({ changed: 'organisation memory', say: 'I have kept it.' }));
  const declineContextOffer = jest.fn(async () => ({ changed: 'nothing', say: 'x' }));
  const ask = jest.fn(async () => ({ id: 'l1' }));
  const leave: any = { mine: async () => ({ daysLeft: 16 }), ask };
  const prisma: any = {
    person: {
      findFirst: jest.fn(async ({ where }: any) => where?.externalId === 'mgr'
        ? { givenName: 'Wairimu', displayName: 'Wairimu Kamau', linkedUserId: 'u-mgr' }
        : { id: 'p1', externalId: 'u-1', active: true, linkedUserId: 'u-me', department: 'Sales', managerExternalId: 'mgr' }),
      findMany: jest.fn(async () => []),
    },
    organizationMembership: { findUnique: jest.fn(async () => ({ role: opts.role ?? 'MEMBER' })) },
    organizationMemory: { findMany: jest.fn(async () => opts.kept ?? []) },
    organizationSuite: { findUnique: jest.fn(async () => (opts.suiteOn === false ? null : { isOn: true, answers: { approver: 'Their manager' } })) },
    leaveRequest: { findMany: jest.fn(async () => []) },
    ground: { findFirst: jest.fn(async () => (opts.runsACheckIn ? { id: 'g1' } : null)), findMany: jest.fn(async () => []) },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
    assistantProposal: {
      findFirst: jest.fn(async () => opts.parked ?? null),
      create: jest.fn(async ({ data }: any) => { const p = { id: 'pr1', state: 'PARKED', ...data }; proposals.push(p); return p; }),
      update: jest.fn(async ({ where, data }: any) => { proposals.push({ id: where.id, ...data }); return data; }),
    },
    commitment: { create: jest.fn(async () => ({})), findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    detectionQuietPeriod: { findMany: jest.fn(async () => []) },
  };
  const knowledge: any = { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) };
  const engine: any = { respond: jest.fn(async () => { throw new Error('model off for these tests'); }) };
  const service = new AssistantService(
    prisma, engine, knowledge,
    { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any,
    { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
    { pendingFor: async () => [], decide: async () => { throw new Error('none'); } } as any,
    { start: async () => { throw new Error('none'); } } as any,
    { forPerson: async () => { throw new Error('none'); } } as any,
    { read: async () => ({ read: false, because: 'none' }) } as any,
    { sendRoundDigest: async () => { throw new Error('none'); } } as any,
    { applyContextProposal, declineContextOffer } as any,
    undefined, undefined,
    leave,
  );
  return { service, prisma, proposals, applyContextProposal, declineContextOffer, ask };
}

const kept = [{ id: 'm1', kind: 'rule', text: RULE, sourceLine: 'Picked up from your check-in on 22 September', keptAt: new Date() }];
const said = async (s: ReturnType<typeof svc>, q: string) => {
  const r: any = await s.service.respond('org-a', 'p1', q);
  return { lane: r.lane, text: r.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n') };
};

describe('Ask Groundwork answers from what the organisation kept, for the people who may read it', () => {
  it('a lead who asks how quotes are signed off is told what the organisation has kept, with no name of who said it', async () => {
    const out = await said(svc({ role: 'LEAD', kept }), 'how do we sign off a quote over a million');
    expect(out.lane).toBe('how_we_work');
    expect(out.text).toContain(`Your organisation has kept this from a setup conversation.\n"${RULE}".`);
    expect(out.text).not.toContain('22 September');
  });

  it('somebody who only takes part in check-ins is told the organisation has written nothing down about it', async () => {
    const out = await said(svc({ role: 'MEMBER', runsACheckIn: false, kept }), 'how do we sign off a quote over a million');
    expect(out.text).toBe('Your organisation has not written anything down about that here. If it should have, whoever set Groundwork up can add it.');
    expect(out.text).not.toContain('Amina');
  });

  it('somebody who runs a check-in, although a member, is told', async () => {
    const out = await said(svc({ role: 'MEMBER', runsACheckIn: true, kept }), 'how do we sign off a quote over a million');
    expect(out.text).toContain(RULE);
  });
});

describe('the yes and the no to keeping something for the organisation', () => {
  const parked = (extra: any = {}) => ({
    id: 'pk1', kind: 'context', state: 'PARKED', summary: 'x',
    payload: { groundId: 'g1', said: `${RULE}.`, history: [], openQuestion: null, offerId: 'offer-1', ...extra },
  });

  it('a yes sends the id of what was offered to the same code the setup conversation uses', async () => {
    const s = svc({ parked: parked() });
    const out = await said(s, 'yes');
    expect(s.applyContextProposal).toHaveBeenCalledWith('g1', 'u-me', expect.objectContaining({ offerId: 'offer-1' }));
    expect(out.text).toBe('I have kept it.');
  });

  it('a no deletes the offer and says nothing was kept', async () => {
    const s = svc({ parked: parked() });
    const out = await said(s, 'no');
    expect(s.declineContextOffer).toHaveBeenCalledWith('g1', 'u-me', 'offer-1');
    expect(s.applyContextProposal).not.toHaveBeenCalled();
    expect(out.text).toBe('I have not kept that for the organisation. It stays only on this check-in.');
  });
});

describe('leave dates said to Ask Groundwork', () => {
  beforeAll(() => jest.useFakeTimers({ now: new Date('2026-10-01T09:00:00Z'), doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask', 'clearTimeout', 'clearInterval', 'clearImmediate', 'performance'] }));
  afterAll(() => jest.useRealTimers());

  it('are said back, with the days left and the person who approves, and nothing is sent yet', async () => {
    const s = svc({ role: 'MEMBER' });
    // the manager must be a lead or an admin here for the suite to name them
    s.prisma.organizationMembership.findUnique.mockResolvedValue({ role: 'LEAD' });
    const out = await said(s, 'I need next Thursday and Friday off');
    expect(out.lane).toBe('ask_for_leave');
    expect(out.text).toBe('You asked for leave from Thursday 8 October to Friday 9 October, which is 2 working days. You have 16 days of leave left this year, and nobody else in Sales is off then. Shall I send it to Wairimu to approve?');
    expect(s.ask).not.toHaveBeenCalled();
    expect(s.proposals[0]).toMatchObject({ kind: 'leave_request', payload: { startsOn: '2026-10-08', endsOn: '2026-10-09' } });
  });

  it('a yes sends it through the leave suite; a no sends nothing', async () => {
    const parked = { id: 'pk2', kind: 'leave_request', state: 'PARKED', summary: 'x', payload: { startsOn: '2026-10-08', endsOn: '2026-10-09' } };
    const yes = svc({ parked });
    yes.prisma.organizationMembership.findUnique.mockResolvedValue({ role: 'LEAD' });
    const sent = await said(yes, 'yes');
    /* With the say-back's reference, kept in the record of who did what (decision 85, build step 5). */
    expect(yes.ask).toHaveBeenCalledWith('org-a', 'u-me', { startsOn: '2026-10-08', endsOn: '2026-10-09', proposalId: expect.any(String) });
    expect(sent.text).toBe('I have sent your leave request from Thursday 8 October to Friday 9 October to Wairimu. It is not approved until they decide, and you will see it under your leave.');

    const no = svc({ parked });
    expect(await said(no, 'no')).toMatchObject({ text: 'I have not sent it. Nothing was kept.' });
    expect(no.ask).not.toHaveBeenCalled();
  });

  it('with the suite off, says so and parks nothing, so nothing is kept', async () => {
    const s = svc({ suiteOn: false });
    const out = await said(s, 'I need next Thursday and Friday off');
    expect(out.text).toBe('Leave requests are not switched on in your organisation, so I have not sent or kept these dates. An admin can switch them on under Suites.');
    expect(s.proposals).toEqual([]);
    expect(s.ask).not.toHaveBeenCalled();
    expect(s.prisma.assistantTurn.createMany).not.toHaveBeenCalled();
  });
});

/*
 * FOUND LIVE, 1 October 2026 (item 6, journey/memory-requests-and-being-away-live.ts). Chidi read
 * "I cannot answer that one yet" twice: once for "I need Monday and Wednesday off next week", whose
 * days cannot be read without guessing, and once for "I want leave on 20 October", sent while an
 * earlier leave say-back was still waiting for his yes.
 */
describe('leave is never answered with a shrug', () => {
  beforeAll(() => jest.useFakeTimers({ now: new Date('2026-10-01T09:00:00Z'), doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask', 'clearTimeout', 'clearInterval', 'clearImmediate', 'performance'] }));
  afterAll(() => jest.useRealTimers());

  it('days that cannot be read are asked for again, and nothing is parked or sent', async () => {
    const s = svc();
    const out = await said(s, 'I need Monday and Wednesday off next week.');
    expect(out).toEqual({
      lane: 'ask_for_leave',
      /* Updated 19 November 2026: the example is now a whole sentence the rules read as leave; the days alone were not read. */
      text: 'I could not tell exactly which days you mean, so I have not sent anything. Tell me the first day and the last day in one sentence, for example "I want leave from next Monday to next Wednesday", and I will ask again.',
    });
    expect(s.proposals).toEqual([]);
    expect(s.ask).not.toHaveBeenCalled();
  });

  it('a new request, sent while an earlier say-back still waits, drops the earlier one and is said back itself', async () => {
    const parked = { id: 'pk3', kind: 'leave_request', state: 'PARKED', summary: 'x', payload: { startsOn: '2026-10-02', endsOn: '2026-10-02' } };
    const s = svc({ parked });
    s.prisma.organizationMembership.findUnique.mockResolvedValue({ role: 'LEAD' });
    const out = await said(s, 'I want leave on 20 October.');
    expect(s.proposals[0]).toMatchObject({ id: 'pk3', state: 'DROPPED' });
    expect(out.lane).toBe('ask_for_leave');
    expect(out.text).toBe('You asked for leave on Tuesday 20 October, which is 1 working day. You have 16 days of leave left this year, and nobody else in Sales is off then. Shall I send it to Wairimu to approve?');
    expect(s.proposals[1]).toMatchObject({ kind: 'leave_request', payload: { startsOn: '2026-10-20', endsOn: '2026-10-20' } });
    expect(s.ask).not.toHaveBeenCalled();
  });
});
