import { NotFoundException } from '@nestjs/common';
import { AssistantService } from './assistant.service';

/**
 * WEEKS 21 AND 22, THROUGH ASK GROUNDWORK. Read as what the person is told, for a participant, a lead
 * and an admin. Today is Thursday 1 October 2026. Hours are for billing only (decision 10), so none of
 * it is remembered in the person's history, and nothing is written before a yes.
 */
function svc(opts: { off?: boolean; parked?: any; left?: number | null; limit?: number | null; approverFirstName?: string | null; approver?: 'manager' | 'person' | 'admin' } = {}) {
  const proposals: any[] = [];
  const record = jest.fn(async () => ({ recorded: 1 }));
  const ask = jest.fn(async () => ({ id: 's1' }));
  const forChat = jest.fn(async () => { if (opts.off) throw new NotFoundException('off'); return { clients: ['Atlas', 'Lakeside'], approverFirstName: opts.approverFirstName === undefined ? 'Wairimu' : opts.approverFirstName }; });
  const checkForChat = jest.fn(async () => {
    if (opts.off) throw new NotFoundException('off');
    return { currency: 'KES', team: 'Operations', left: opts.left === undefined ? 38000 : opts.left, fits: true, approver: opts.approver ?? 'manager', limit: opts.limit ?? null, approverFirstName: opts.approverFirstName === undefined ? 'Wairimu' : opts.approverFirstName };
  });
  const prisma: any = {
    person: { findFirst: jest.fn(async () => ({ id: 'p1', externalId: 'u-1', active: true, linkedUserId: 'u-me', department: 'Operations' })), findMany: jest.fn(async () => []) },
    organizationMembership: { findUnique: jest.fn(async () => ({ role: 'MEMBER' })) },
    ground: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
    assistantProposal: {
      findFirst: jest.fn(async () => opts.parked ?? null),
      create: jest.fn(async ({ data }: any) => { const p = { id: 'pr1', state: 'PARKED', ...data }; proposals.push(p); return p; }),
      update: jest.fn(async ({ where, data }: any) => { proposals.push({ id: where.id, ...data }); return data; }),
    },
    commitment: { create: jest.fn(async () => ({})), findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    detectionQuietPeriod: { findMany: jest.fn(async () => []) },
    organizationMemory: { findMany: jest.fn(async () => []) },
    organizationSuite: { findUnique: jest.fn(async () => null) },
  };
  const none = { start: async () => { throw new Error('none'); } } as any;
  const service = new AssistantService(
    prisma, { respond: jest.fn(async () => { throw new Error('model off for these tests'); }) } as any,
    { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) } as any,
    { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any,
    { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
    { pendingFor: async () => [], decide: async () => { throw new Error('none'); } } as any,
    none, { forPerson: async () => { throw new Error('none'); } } as any,
    { read: async () => ({ read: false, because: 'none' }) } as any,
    { sendRoundDigest: async () => { throw new Error('none'); } } as any,
    {} as any, undefined, undefined, undefined, { forChat, record } as any, { checkForChat, ask } as any,
  );
  return { service, prisma, proposals, record, ask };
}
const said = async (s: ReturnType<typeof svc>, q: string) => {
  const r: any = await s.service.respond('org-a', 'p1', q);
  return { lane: r.lane, text: r.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n') };
};

beforeAll(() => jest.useFakeTimers({ now: new Date('2026-10-01T09:00:00Z'), doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask', 'clearTimeout', 'clearInterval', 'clearImmediate', 'performance'] }));
afterAll(() => jest.useRealTimers());

describe('hours said to Ask Groundwork', () => {
  it.each(['MEMBER', 'LEAD', 'ADMIN'])('are said back with the real date, and nothing is written before a yes (%s)', async (role) => {
    const s = svc();
    s.prisma.organizationMembership.findUnique.mockResolvedValue({ role });
    const out = await said(s, 'I did 6 hours on Atlas today');
    expect(out).toEqual({ lane: 'log_hours', text: 'Shall I log 6 hours on Atlas for Thursday 1 October and send it to Wairimu to approve?' });
    expect(s.record).not.toHaveBeenCalled();
    expect(s.proposals[0]).toMatchObject({ kind: 'hours_entry', payload: { onDay: '2026-10-01', entries: [{ client: 'Atlas', hours: 6 }] } });
  });

  it('with no line manager the say-back names an admin', async () => {
    const out = await said(svc({ approverFirstName: null }), 'I did 6 hours on Atlas today');
    expect(out.text).toBe('Shall I log 6 hours on Atlas for Thursday 1 October and send it to an admin to approve?');
  });

  it('a yes writes it once through the time sheets, a no writes nothing', async () => {
    const parked = { id: 'pk', kind: 'hours_entry', state: 'PARKED', summary: 'x', payload: { onDay: '2026-10-01', entries: [{ client: 'Atlas', hours: 6 }] } };
    const yes = svc({ parked });
    const sent = await said(yes, 'yes');
    expect(yes.record).toHaveBeenCalledTimes(1);
    /* With the say-back's reference, kept in the record of who did what (decision 85, build step 5). */
    expect(yes.record).toHaveBeenCalledWith('org-a', 'u-me', [{ client: 'Atlas', onDay: '2026-10-01', hours: 6 }], { proposalId: expect.any(String) });
    expect(sent.text).toBe('I have logged 6 hours on Atlas for Thursday 1 October and sent it to Wairimu to approve. It is not approved until they decide, and you will see it under your hours.');
    const no = svc({ parked });
    expect((await said(no, 'no')).text).toBe('I have not sent it. Nothing was kept.');
    expect(no.record).not.toHaveBeenCalled();
  });

  it('is never remembered in the person’s history, because hours are for billing only', async () => {
    const s = svc();
    await said(s, 'I did 6 hours on Atlas today');
    expect(s.prisma.assistantTurn.createMany).not.toHaveBeenCalled();
  });

  /*
   * STAGING CHECK S13 (4 November): Rita asked to spend in chat and added the receipt there. It stayed in the conversation, and the
   * approver could not read it. A file she added in the last fifteen minutes goes on the request through the form's own write.
   */
  it('a receipt added in Ask goes on the request, where the approver reads it', async () => {
    const parked = { id: 'pk', kind: 'spend_request', state: 'PARKED', summary: 'x', payload: { amount: 12000, what: 'fuel for the Kisumu trip', currency: 'KES' } };
    const yes = svc({ parked });
    const row: any = { id: 's1', organizationId: 'org-a', userId: 'u-me', status: 'waiting', attachedName: null };
    yes.prisma.spendRequest = { findFirst: jest.fn(async () => row), findUnique: jest.fn(async () => row), update: jest.fn(async ({ data }: any) => Object.assign(row, data)) };
    yes.prisma.groundParticipant = { findMany: jest.fn(async () => [{ id: 'gp-1' }]) };
    yes.prisma.groundDocument = { findMany: jest.fn(async () => [{ fileName: 'fuel-receipt.pdf', content: 'Total Kisumu. Diesel KES 12,000.' }]) };
    const sent = await said(yes, 'yes');
    expect(sent.text).toBe('I have sent your request to spend KES 12,000 on fuel for the Kisumu trip to Wairimu. It is not approved until they decide, and nothing is spent until then. I attached “fuel-receipt.pdf” to your request, so Wairimu can read it with the request.');
    expect(row).toMatchObject({ attachedName: 'fuel-receipt.pdf', attachedKind: 'receipt', attachedText: 'Total Kisumu. Diesel KES 12,000.' });
  });

  it('with the suite off, says so plainly and keeps nothing', async () => {
    const s = svc({ off: true });
    const out = await said(s, 'I did 6 hours on Atlas today');
    expect(out.text).toBe('Time sheets are not switched on in your organisation, so I have not sent or kept these hours. An admin can switch them on under Suites.');
    expect(s.proposals).toEqual([]);
    expect(s.record).not.toHaveBeenCalled();
  });

  it('asks again, and keeps nothing, when the project, the day or the hours are unreadable', async () => {
    const s = svc();
    expect((await said(s, 'I did 6 hours on Zebra today')).text).toBe('I do not have Zebra on the list of clients and projects. Which one did you mean? The ones I have are Atlas and Lakeside.');
    expect((await said(s, 'I did 6 hours on Atlas')).text).toMatch(/^Which day was that\?/);
    expect((await said(s, 'I did 40 hours on Atlas today')).text).toMatch(/^I could not tell how many hours/);
    expect(s.proposals).toEqual([]);
  });
});

describe('spending said to Ask Groundwork', () => {
  it.each(['MEMBER', 'LEAD', 'ADMIN'])('is checked against the budget and said back before a yes (%s)', async (role) => {
    const s = svc({ left: 38000 });
    s.prisma.organizationMembership.findUnique.mockResolvedValue({ role });
    const out = await said(s, 'I spent 12,000 on fuel for the Kisumu trip');
    expect(out).toEqual({ lane: 'ask_to_spend', text: 'You asked to spend KES 12,000 on fuel for the Kisumu trip. Operations has KES 38,000 left for October, so that fits. Shall I send it to Wairimu to approve?' });
    expect(s.ask).not.toHaveBeenCalled();
    expect(s.proposals[0]).toMatchObject({ kind: 'spend_request', payload: { amount: 12000, what: 'fuel for the Kisumu trip', currency: 'KES' } });
  });

  it('says it is over the budget before the yes', async () => {
    const out = await said(svc({ left: 8000 }), 'I spent 12,000 on fuel for the Kisumu trip');
    expect(out.text).toBe('You asked to spend KES 12,000 on fuel for the Kisumu trip. That is over the Operations budget left for October, which is KES 8,000. Shall I still send it to Wairimu to approve?');
  });

  it('says it is against the rule before the yes', async () => {
    const out = await said(svc({ left: 90000, limit: 10000, approver: 'person', approverFirstName: 'Grace' }), 'I spent 12,000 on fuel for the Kisumu trip');
    expect(out.text).toBe('You asked to spend KES 12,000 on fuel for the Kisumu trip. Operations has KES 90,000 left for October, so that fits. This is over KES 10,000, so Grace must approve it. Shall I still send it to Grace to approve?');
  });

  it('a yes sends it once through the spending suite, a no sends nothing', async () => {
    const parked = { id: 'pk', kind: 'spend_request', state: 'PARKED', summary: 'x', payload: { amount: 12000, what: 'fuel for the Kisumu trip', currency: 'KES' } };
    const yes = svc({ parked });
    const sent = await said(yes, 'yes');
    expect(yes.ask).toHaveBeenCalledTimes(1);
    /* With the say-back's reference, kept in the record of who did what (decision 85, build step 5). */
    expect(yes.ask).toHaveBeenCalledWith('org-a', 'u-me', { amount: 12000, what: 'fuel for the Kisumu trip', proposalId: expect.any(String) });
    expect(sent.text).toBe('I have sent your request to spend KES 12,000 on fuel for the Kisumu trip to Wairimu. It is not approved until they decide, and nothing is spent until then.');
    const no = svc({ parked });
    expect((await said(no, 'no')).text).toBe('I have not sent it. Nothing was kept.');
    expect(no.ask).not.toHaveBeenCalled();
  });

  it('with the suite off, says so plainly and keeps nothing', async () => {
    const s = svc({ off: true });
    const out = await said(s, 'I spent 12,000 on fuel for the Kisumu trip');
    expect(out.text).toBe('Spending requests are not switched on in your organisation, so I have not sent or kept this. An admin can switch them on under Suites.');
    expect(s.proposals).toEqual([]);
  });

  it('asks again, and keeps nothing, when the amount cannot be read', async () => {
    const s = svc();
    expect((await said(s, 'I spent 12,000 or 15,000 on fuel')).text).toMatch(/^I found more than one amount/);
    expect(s.proposals).toEqual([]);
  });
});
