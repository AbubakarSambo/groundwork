import { WhatsAppService } from './whatsapp.service';
import { aRequestIsWaiting, aRequestWasDecided } from './what-goes-to-a-phone';
import { TEMPLATES, fill, OUTSIDE_THE_WINDOW, NOT_TODAY } from './a-message-outside-the-window';
import { anInboundHarness } from './a-whatsapp-inbound-harness';
import { ARequestToldOnWhatsApp } from '../suites/a-request-told-on-whatsapp.service';
import { LeaveBoardService } from '../suites/the-leave-board.service';
import { AssistantService } from '../assistant/assistant.service';
import { aLeaveRequest, aSpendRequest, anHoursRequest, aDecisionIn } from '../suites/a-request-in-words';

/**
 * APPROVALS OVER WHATSAPP (decision 82, item 1). Read as each reader reads it.
 *
 * Amina Yusuf asks for leave from Monday 5 to Friday 9 October and confirms it. Her line manager,
 * Wairimu Kamau, a lead, is told on WhatsApp. Wairimu replies "approve"; Groundwork says back what she
 * is deciding and acts only on her yes, through the leave board's own `decide`. Amina is then told.
 * Before this, nobody was told anything, and approving was only in the app.
 */

const AMINA_LEAVE = aLeaveRequest('l-1', 'u-amina', 'Amina', '2026-10-05', '2026-10-09');

describe('what each reader reads', () => {
  it('the approver, Wairimu, when Amina\'s leave is waiting', () => {
    expect(aRequestIsWaiting('Wairimu', 'Amina', AMINA_LEAVE.what).text).toBe(
      'Hi Wairimu, Amina has asked for leave from Monday 5 October to Friday 9 October, and it is waiting for you. Reply here to approve or decline it, or open Groundwork to read it first.',
    );
  });
  it('the approver, for hours and for spending', () => {
    const hours = anHoursRequest('u-amina', '2026-10-05', 'Amina', { Atlas: 360 }, 360, ['2026-10-05']);
    expect(aRequestIsWaiting('Wairimu', 'Amina', hours.what).text).toBe(
      'Hi Wairimu, Amina has asked for approval of 6 hours on Atlas for Monday 5 October, and it is waiting for you. Reply here to approve or decline it, or open Groundwork to read it first.',
    );
    const spend = aSpendRequest('s-1', 'u-amina', 'Amina', 12000, 'KES', 'fuel');
    expect(aRequestIsWaiting('Wairimu', 'Amina', spend.what).text).toBe(
      'Hi Wairimu, Amina has asked for KES 12,000 for fuel, and it is waiting for you. Reply here to approve or decline it, or open Groundwork to read it first.',
    );
  });
  it('the person, Amina, once Wairimu has decided', () => {
    expect(aRequestWasDecided('Amina', AMINA_LEAVE.what, 'approved', 'Wairimu').text).toBe(
      'Hi Amina, your request for leave from Monday 5 October to Friday 9 October was approved by Wairimu. Open Groundwork to read it.',
    );
    expect(aRequestWasDecided('Amina', AMINA_LEAVE.what, 'declined', 'Wairimu').text).toBe(
      'Hi Amina, your request for leave from Monday 5 October to Friday 9 October was declined by Wairimu. Open Groundwork to read it.',
    );
  });
  it('outside the 24 hours the same words go as the two templates in docs/whatsapp-templates.md', () => {
    const w = aRequestIsWaiting('Wairimu', 'Amina', AMINA_LEAVE.what);
    expect(TEMPLATES[w.kind].name).toBe('groundwork_request_waiting');
    expect(fill(TEMPLATES[w.kind].body, w.params)).toBe(w.text);
    const d = aRequestWasDecided('Amina', AMINA_LEAVE.what, 'approved', 'Wairimu');
    expect(TEMPLATES[d.kind].name).toBe('groundwork_request_decided');
    expect(d.params).toEqual(['Amina', 'leave from Monday 5 October to Friday 9 October', 'approved', 'Wairimu']);
  });
  it('an approver\'s reply is read as a decision only when it starts with one', () => {
    expect(aDecisionIn('approve')).toBe('approved');
    expect(aDecisionIn('Yes, approve it')).toBe('approved');
    expect(aDecisionIn("decline Omar's spending")).toBe('declined');
    expect(aDecisionIn('We need the manager to approve the budget first')).toBeNull();
  });
});

/* ---------- who is told, through the one sender ---------- */

function aTeller(opts: { admins?: string[] } = {}) {
  const sent: { org: string; to: string; text: string; context: any }[] = [];
  const prisma: any = {
    person: {
      findFirst: jest.fn(async ({ where }: any) => (where.linkedUserId === 'u-wairimu' ? { phone: '+254711000111', givenName: 'Wairimu' } : where.linkedUserId === 'u-amina' ? { phone: '+254722000222', givenName: 'Amina' } : null)),
      findMany: jest.fn(async () => []),
    },
    user: {
      findUnique: jest.fn(async ({ where }: any) => ({ 'u-wairimu': { firstName: 'Wairimu', phoneNumber: null, deletedAt: null }, 'u-amina': { firstName: 'Amina', phoneNumber: null, deletedAt: null }, 'u-admin': { firstName: 'Bola', phoneNumber: '+2348012345678', deletedAt: null } } as any)[where.id] ?? null),
      findMany: jest.fn(async () => []),
    },
    organizationMembership: { findMany: jest.fn(async () => (opts.admins ?? []).map((userId) => ({ userId }))) },
  };
  const whatsapp: any = { sendFor: jest.fn(async (org: string, to: string, text: string, context: any) => { sent.push({ org, to, text, context }); return { sent: true }; }) };
  return { told: new ARequestToldOnWhatsApp(prisma, whatsapp), sent };
}

describe('who is told', () => {
  it('the line manager who approves, on their own number, as a first message Groundwork starts', async () => {
    const { told, sent } = aTeller();
    await told.waiting('org-1', await told.approversOf('org-1', { kind: 'manager', userId: 'u-wairimu' }, 'u-amina'), AMINA_LEAVE);
    expect(sent).toEqual([{ org: 'org-1', to: '+254711000111', text: aRequestIsWaiting('Wairimu', 'Amina', AMINA_LEAVE.what).text, context: { kind: 'request-waiting', params: ['Wairimu', 'Amina', 'leave from Monday 5 October to Friday 9 October'] } }]);
  });
  it('every admin when an admin approves, and never the person who asked', async () => {
    const { told, sent } = aTeller({ admins: ['u-admin', 'u-amina'] });
    await told.waiting('org-1', await told.approversOf('org-1', { kind: 'admin' }, 'u-amina'), AMINA_LEAVE);
    expect(sent.map((s) => s.to)).toEqual(['+2348012345678']);
    expect(sent[0].text).toMatch(/^Hi Bola, Amina has asked for leave/);
  });
  it('the person, with the name of who decided', async () => {
    const { told, sent } = aTeller();
    expect(await told.decided('org-1', AMINA_LEAVE, 'approved', 'u-wairimu')).toBe(true);
    expect(sent[0]).toMatchObject({ to: '+254722000222', text: 'Hi Amina, your request for leave from Monday 5 October to Friday 9 October was approved by Wairimu. Open Groundwork to read it.', context: { kind: 'request-decided' } });
  });
});

/* ---------- the sender's rules: the 24 hours, the template, and how often ---------- */

function aSender(person: any, sentToday: { kind: string }[] = [], approved: string[] = []) {
  const rows: any[] = [];
  const prisma: any = {
    platformSetting: { findUnique: jest.fn(async () => ({ value: true })) },
    whatsAppConnection: { findUnique: jest.fn(async () => null) },
    person: { findFirst: jest.fn(async () => person), findMany: jest.fn(async () => []) },
    user: { findMany: jest.fn(async () => []) },
    whatsAppInboundMessage: { findFirst: jest.fn(async () => null) },
    whatsAppSend: { create: jest.fn(async (q: any) => { rows.push(q.data); return {}; }), findMany: jest.fn(async () => sentToday) },
    notification: { create: jest.fn(async () => ({})) },
  };
  const config: any = { get: (k: string) => ({ 'whatsapp.enabled': true, 'whatsapp.accessToken': 'test-token', 'whatsapp.phoneNumberId': '111111', 'whatsapp.approvedTemplates': approved } as any)[k] };
  return { wa: new WhatsAppService(config, prisma), rows };
}

describe('the approval messages keep the sender\'s rules', () => {
  const realFetch = (global as any).fetch;
  let fetchSpy: jest.Mock;
  beforeEach(() => { fetchSpy = jest.fn(async () => ({ ok: true, status: 200 })); (global as any).fetch = fetchSpy; });
  afterEach(() => { (global as any).fetch = realFetch; });
  const DAY = 86_400_000;
  const inside = { whatsappStoppedAt: null, whatsappLastInboundAt: new Date() };
  const outside = { whatsappStoppedAt: null, whatsappLastInboundAt: new Date(Date.now() - 3 * DAY) };
  const w = aRequestIsWaiting('Wairimu', 'Amina', AMINA_LEAVE.what);
  const d = aRequestWasDecided('Amina', AMINA_LEAVE.what, 'approved', 'Wairimu');

  it('inside the 24 hours, the waiting message goes as a plain message', async () => {
    const { wa } = aSender(inside);
    expect((await wa.sendFor('org-1', '+254711000111', w.text, { kind: w.kind, params: w.params })).sent).toBe(true);
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toMatchObject({ type: 'text', text: { body: w.text } });
  });
  it('outside them, while groundwork_request_waiting is not approved, it is recorded as not sent', async () => {
    const { wa, rows } = aSender(outside);
    expect(await wa.sendFor('org-1', '+254711000111', w.text, { kind: w.kind, params: w.params })).toEqual({ sent: false, error: OUTSIDE_THE_WINDOW });
    expect(rows[0]).toMatchObject({ kind: 'request-waiting', sentAt: null, error: OUTSIDE_THE_WINDOW });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('outside them, once approved, it goes as the template with its three blanks', async () => {
    const { wa } = aSender(outside, [], ['groundwork_request_waiting']);
    expect((await wa.sendFor('org-1', '+254711000111', w.text, { kind: w.kind, params: w.params })).sent).toBe(true);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.template.name).toBe('groundwork_request_waiting');
    expect(body.template.components[0].parameters.map((p: any) => p.text)).toEqual(['Wairimu', 'Amina', 'leave from Monday 5 October to Friday 9 October']);
  });
  it('the approver is told straight away, whatever else they have had today (decision 92)', async () => {
    const { wa } = aSender(inside, [{ kind: 'lead-summary' }, { kind: 'checkin-open' }, { kind: 'overdue' }]);
    expect((await wa.sendFor('org-1', '+254711000111', w.text, { kind: w.kind, params: w.params })).sent).toBe(true);
  });
  it('an approval does not use up the one message of the day, so a check-in notice still goes after it', async () => {
    const { wa } = aSender(inside, [{ kind: 'request-waiting' }, { kind: 'request-waiting' }]);
    expect((await wa.sendFor('org-1', '+254711000111', 'Hi Wairimu, your check-in is open.', { kind: 'checkin-open' })).sent).toBe(true);
  });
  it('a first message other than an approval is still held after the summary (decision 83)', async () => {
    const { wa } = aSender(inside, [{ kind: 'lead-summary' }]);
    const sent = await wa.sendFor('org-1', '+254711000111', 'Hi Wairimu, your check-in is overdue.', { kind: 'overdue' });
    expect(sent).toEqual({ sent: false, error: NOT_TODAY });
  });
  it('"Not now" still holds an approval, because that is the person\'s own word', async () => {
    const { wa } = aSender(inside, [{ kind: 'not-now' }]);
    expect((await wa.sendFor('org-1', '+254711000111', w.text, { kind: w.kind, params: w.params })).sent).toBe(false);
  });
  it('the person\'s message answers their own request, so it is not held back by how often', async () => {
    const { wa } = aSender(inside, [{ kind: 'overdue' }, { kind: 'checkin-open' }]);
    expect((await wa.sendFor('org-1', '+254722000222', d.text, { kind: d.kind, params: d.params })).sent).toBe(true);
  });
  it('outside the 24 hours the decision goes only as groundwork_request_decided', async () => {
    const { wa } = aSender(outside);
    expect(await wa.sendFor('org-1', '+254722000222', d.text, { kind: d.kind, params: d.params })).toEqual({ sent: false, error: OUTSIDE_THE_WINDOW });
  });
});

/* ---------- Wairimu decides by replying, and only on her yes ---------- */

function anApprover(opts: { parked?: any; waiting?: any[]; spend?: any[] } = {}) {
  const proposals: any[] = [];
  const decide = jest.fn(async () => ({ waiting: [], off: [] }));
  const leave: any = {
    board: jest.fn(async () => ({ waiting: opts.waiting ?? [{ id: 'l-1', name: 'Amina Yusuf', startsOn: '2026-10-05', endsOn: '2026-10-09', mayDecide: true }], off: [] })),
    decide,
  };
  const spending: any = { board: jest.fn(async () => ({ currency: 'KES', waiting: opts.spend ?? [] })), decide: jest.fn() };
  const prisma: any = {
    person: { findFirst: jest.fn(async () => ({ id: 'p-wairimu', externalId: 'wairimu', linkedUserId: 'u-wairimu', email: 'wairimu@example.com', active: true })), findMany: jest.fn(async () => []) },
    organizationMembership: { findUnique: jest.fn(async () => ({ role: 'LEAD' })) },
    organizationSuite: { findUnique: jest.fn(async () => null) },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
    assistantProposal: {
      findFirst: jest.fn(async () => opts.parked ?? null),
      create: jest.fn(async ({ data }: any) => { const p = { id: 'pr1', state: 'PARKED', ...data }; proposals.push(p); return p; }),
      update: jest.fn(async ({ where, data }: any) => { proposals.push({ id: where.id, ...data }); return data; }),
    },
  };
  const service = new AssistantService(
    prisma, { respond: jest.fn(async () => { throw new Error('model off'); }) } as any, { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) } as any,
    {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    undefined, undefined, leave, undefined, spending,
  );
  const said = async (q: string) => {
    const r: any = await service.respond('org-1', 'p-wairimu', q);
    return { lane: r.lane, text: r.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n') };
  };
  return { said, decide, proposals };
}

describe('Wairimu approves by replying', () => {
  it('"approve" is said back, and nothing is decided yet', async () => {
    const a = anApprover();
    expect(await a.said('approve')).toEqual({ lane: 'decide_a_request', text: "You are approving Amina's leave from Monday 5 October to Friday 9 October. Is that right?" });
    expect(a.decide).not.toHaveBeenCalled();
    expect(a.proposals[0]).toMatchObject({ kind: 'request_decision', payload: { outcome: 'approved', request: { kind: 'leave', ref: 'l-1' } } });
  });

  it('her yes decides it through the leave board, as her', async () => {
    const parked = { id: 'pk', kind: 'request_decision', state: 'PARKED', summary: 'x', payload: { request: aLeaveRequest('l-1', null, 'Amina', '2026-10-05', '2026-10-09'), outcome: 'approved' } };
    const a = anApprover({ parked });
    expect(await a.said('yes')).toEqual({ lane: 'decide_a_request', text: "Amina's leave from Monday 5 October to Friday 9 October is approved now. I have let Amina know." });
    expect(a.decide).toHaveBeenCalledWith({ userId: 'u-wairimu', organizationId: 'org-1' }, 'l-1', 'approved');
  });

  it('her no changes nothing', async () => {
    const parked = { id: 'pk', kind: 'request_decision', state: 'PARKED', summary: 'x', payload: { request: aLeaveRequest('l-1', null, 'Amina', '2026-10-05', '2026-10-09'), outcome: 'declined' } };
    const a = anApprover({ parked });
    expect((await a.said('no')).text).toBe("I have not changed anything. Amina's leave from Monday 5 October to Friday 9 October is still waiting for you.");
    expect(a.decide).not.toHaveBeenCalled();
  });

  it('with two waiting she is asked which, and naming one says it back', async () => {
    const spend = [{ id: 's-1', firstName: 'Omar', amount: 12000, what: 'fuel', mayDecide: true }];
    const a = anApprover({ spend });
    expect((await a.said('approve')).text).toBe(
      "Two requests are waiting for you. One is Amina's leave from Monday 5 October to Friday 9 October, and the other is Omar's request to spend KES 12,000 for fuel. Which one do you mean? You can write, for example, \"approve Amina's leave\".",
    );
    expect((await anApprover({ spend }).said("decline Omar's spending")).text).toBe("You are declining Omar's request to spend KES 12,000 for fuel. Is that right?");
  });

  it('with nothing waiting she is told so', async () => {
    expect((await anApprover({ waiting: [] }).said('approve')).text).toBe('Nothing is waiting for you to approve or decline right now.');
    /* Polish round 1: a decision with a date and a reason in it is never read as the approver's own leave. */
    expect((await anApprover({ waiting: [] }).said('Decline Peter\'s leave because Friday 23 October is the day the 60 units arrive.')).text).toBe('Nothing is waiting for you to approve or decline right now.');
  });
});

/* ---------- on WhatsApp, during one of her own check-ins ---------- */

describe('an approver\'s reply during a check-in is not taken into it', () => {
  it('goes to Ask Groundwork, and the conversation stays there for her yes', async () => {
    const h = anInboundHarness({ open: [{ id: 'ci-1', label: 'the sales team' }], decisionWaiting: true });
    h.assistant.respond.mockResolvedValue({ blocks: [{ type: 'text', body: "You are approving Amina's leave from Monday 5 October to Friday 9 October. Is that right?" }] });
    await h.service.handle('org-1', h.message('approve'), 'ours');
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
    expect(h.said).toEqual(["You are approving Amina's leave from Monday 5 October to Friday 9 October. Is that right?\n\nWrite \"back\" to return to your check-in."]);
    await h.service.handle('org-1', h.message('yes'), 'ours');
    expect(h.assistant.respond).toHaveBeenLastCalledWith('org-1', 'person-1', 'yes');
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
  });
  it('with nothing waiting for her, "approve" is her answer in the check-in, as before', async () => {
    const h = anInboundHarness({ open: [{ id: 'ci-1', label: 'the sales team' }] });
    await h.service.handle('org-1', h.message('approve'), 'ours');
    expect(h.conversation.sendMessage).toHaveBeenCalledWith('ci-1', 'u-1', 'approve', { door: 'whatsapp' });
  });
});

/* ---------- the board's own decide tells Amina ---------- */

describe('deciding on the leave board, in the app or by reply, tells Amina', () => {
  it('through the same teller', async () => {
    const row = { id: 'l-1', organizationId: 'org-1', userId: 'u-amina', startsOn: new Date('2026-10-05'), endsOn: new Date('2026-10-09'), kind: 'annual', standInUserId: null, status: 'waiting', decidedById: null, decidedAt: null };
    const prisma: any = {
      organizationSuite: { findUnique: jest.fn(async () => ({ isOn: true, answers: {} })) },
      organizationMembership: { findUnique: jest.fn(async ({ where }: any) => ({ role: where.userId_organizationId.userId === 'u-wairimu' ? 'LEAD' : 'MEMBER' })) },
      leaveRequest: { findUnique: jest.fn(async () => row), update: jest.fn(async () => ({})), findMany: jest.fn(async () => []) },
      person: {
        findFirst: jest.fn(async ({ where }: any) => (where.externalId === 'wairimu' ? { linkedUserId: 'u-wairimu', email: null } : where.linkedUserId === 'u-amina' ? { externalId: 'amina', department: 'Sales', managerExternalId: 'wairimu' } : null)),
        findMany: jest.fn(async ({ where }: any) => (where.linkedUserId?.in?.includes('u-amina') ? [{ linkedUserId: 'u-amina', externalId: 'amina', department: 'Sales', managerExternalId: 'wairimu' }] : [])),
      },
      user: { findMany: jest.fn(async () => []) },
    };
    const told: any = { firstNameOf: jest.fn(async () => 'Amina'), decided: jest.fn(async () => true) };
    await new LeaveBoardService(prisma, told).decide({ userId: 'u-wairimu', organizationId: 'org-1' }, 'l-1', 'approved');
    expect(told.decided).toHaveBeenCalledWith('org-1', expect.objectContaining({ kind: 'leave', what: 'leave from Monday 5 October to Friday 9 October' }), 'approved', 'u-wairimu');
  });
});
