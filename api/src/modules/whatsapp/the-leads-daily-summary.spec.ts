import { WhatsAppService } from './whatsapp.service';
import { sendTheLeadsDailySummaries, theLeadsDailySummary, theSummaryParagraph, aCheckInInASentence } from './the-leads-daily-summary';
import { TEMPLATES, NOT_TODAY, OUTSIDE_THE_WINDOW } from './a-message-outside-the-window';

/**
 * THE LEAD'S DAILY SUMMARY ON WHATSAPP (decision 82, item 9; template lead_daily_summary). Read as
 * Wairimu reads it on her phone at seven in the morning in Lagos.
 *
 * Wairimu leads "Sales team, Q3": Miriam, Bisi, Femi, Kofi and Amina have checked in, Omar has not.
 * Juma is waiting for an admin to let him in, and Grace only manages; neither is counted (decision 77).
 * Wairimu also leads "Performance plan, Femi", which she keeps in the app: nothing from it is said.
 * Amina's leave from Monday 5 to Friday 9 October waits for Wairimu to decide.
 */

const NOW = new Date('2026-10-05T06:00:00Z');
const answered = (first: string, completedAt?: Date) => ({ completedAt, status: 'COMPLETED', sessionNumber: 3, participant: { managingOnly: false, nameGiven: null, user: { firstName: first, awaitingOrgApproval: false } } });

function aMorning(opts: { onLeave?: boolean; onlyThePlan?: boolean; waiting?: boolean; lastSummary?: Date; answeredAt?: Date; nobodyIn?: boolean; twins?: boolean; roundAhead?: boolean } = {}) {
  const sent: { org: string; to: string; text: string; context: any }[] = [];
  const grounds = [
    ...(opts.onlyThePlan ? [] : [{ id: 'g-sales', label: 'Sales team, Q3', createdAt: new Date('2026-09-02T09:00:00Z'), organizationId: 'org-1', overWhatsApp: null, initiatorId: 'u-wairimu' }]),
    ...(opts.twins ? [{ id: 'g-sales-2', label: 'Sales team, Q3', createdAt: new Date('2026-09-20T09:00:00Z'), organizationId: 'org-1', overWhatsApp: null, initiatorId: 'u-wairimu' }] : []),
    { id: 'g-pip', label: 'Performance plan, Femi', organizationId: 'org-1', overWhatsApp: false, initiatorId: 'u-wairimu' },
  ];
  const sessions: Record<string, any[]> = {
    'g-sales-2': [{ status: 'COMPLETED', sessionNumber: 1, completedAt: opts.answeredAt, participant: { managingOnly: false, nameGiven: null, user: { firstName: 'Zawadi', awaitingOrgApproval: false } } }, { status: 'NOT_STARTED', sessionNumber: 1, participant: { managingOnly: false, nameGiven: null, user: { firstName: 'Chidi', awaitingOrgApproval: false } } }],
    'g-sales': [
      ...(opts.nobodyIn ? [] : ['Miriam', 'Bisi', 'Femi', 'Kofi', 'Amina'].map((n) => answered(n, opts.answeredAt))),
      { status: 'NOT_STARTED', sessionNumber: 3, participant: { managingOnly: false, nameGiven: null, user: { firstName: 'Omar', awaitingOrgApproval: false } } },
      { status: 'NOT_STARTED', sessionNumber: 3, participant: { managingOnly: false, nameGiven: null, user: { firstName: 'Juma', awaitingOrgApproval: true } } },
      { status: 'NOT_STARTED', sessionNumber: 3, participant: { managingOnly: true, nameGiven: null, user: { firstName: 'Grace', awaitingOrgApproval: false } } },
      { ...answered('Omar'), sessionNumber: 2 },
    ],
    'g-pip': [{ status: 'IN_PROGRESS', sessionNumber: 1, participant: { managingOnly: false, nameGiven: null, user: { firstName: 'Femi', awaitingOrgApproval: false } } }],
  };
  /* The next round is written ahead for three of the six, while the second is still being answered. */
  if (opts.roundAhead) {
    const p = (first: string, status: string, n: number) => ({ status, sessionNumber: n, completedAt: status === 'COMPLETED' ? opts.answeredAt : undefined, participant: { managingOnly: false, nameGiven: null, user: { firstName: first, awaitingOrgApproval: false } } });
    sessions['g-sales'] = [...['Miriam', 'Bisi', 'Femi'].map((n) => p(n, 'COMPLETED', 2)), ...['Kofi', 'Amina', 'Omar'].map((n) => p(n, 'NOT_STARTED', 2)), ...['Miriam', 'Bisi', 'Femi'].map((n) => p(n, 'NOT_STARTED', 3))];
  }
  const prisma: any = {
    ground: { findMany: jest.fn(async () => grounds) },
    organization: { findMany: jest.fn(async () => [{ id: 'org-1' }]) },
    checkIn: { findMany: jest.fn(async ({ where }: any) => sessions[where.groundId] ?? []) },
    user: { findUnique: jest.fn(async () => ({ firstName: 'Wairimu', phoneNumber: null, deletedAt: null })), findMany: jest.fn(async () => []) },
    person: { findFirst: jest.fn(async () => ({ phone: '+254711000111' })), findMany: jest.fn(async () => []) },
    whatsAppSend: { findFirst: jest.fn(async () => (opts.lastSummary ? { sentAt: opts.lastSummary } : null)) },
    leaveRequest: { findMany: jest.fn(async () => (opts.onLeave ? [{ startsOn: new Date('2026-10-05'), endsOn: new Date('2026-10-06') }] : [])) },
  };
  const whatsapp: any = { isEnabled: jest.fn(async () => true), sendFor: jest.fn(async (org: string, to: string, text: string, context: any) => { sent.push({ org, to, text, context }); return { sent: true }; }) };
  const boards: any = {
    leave: { board: jest.fn(async () => ({ waiting: opts.waiting === false ? [] : [{ id: 'l-1', name: 'Amina Yusuf', startsOn: '2026-10-05', endsOn: '2026-10-09', mayDecide: true }] })) },
  };
  return { prisma, run: () => sendTheLeadsDailySummaries({ prisma, whatsapp, boards, frontendUrl: 'https://myground.work' }, NOW), sent };
}

describe("what Wairimu reads on her phone", () => {
  it('one paragraph: who answered and who has not, with the board\'s link, and nothing about approvals (they have their own message)', async () => {
    const m = aMorning();
    expect(await m.run()).toEqual({ tried: 1 });
    expect(m.sent).toHaveLength(1);
    expect(m.sent[0].text).toBe(
      "Good morning Wairimu. Here is today's summary of your check-ins. In \"Sales team, Q3\", 5 of 6 people have checked in for the third check-in, and Omar has not yet. You can open your board for the full picture here https://myground.work/grounds/g-sales/board If you would rather not hear from us here again today, reply \"not now\".",
    );
    expect(m.sent[0].context).toEqual({ kind: 'lead-summary', params: ['Wairimu', expect.any(String), 'https://myground.work/grounds/g-sales/board'] });
    expect(m.sent[0].context.params[1]).not.toMatch(/[\r\n\t]/);
  });

  it('never counts Juma, who is not let in yet, or Grace, who only manages, and never names them', async () => {
    const m = aMorning();
    await m.run();
    expect(m.sent[0].text).not.toMatch(/Juma|Grace|of 8|of 7/);
  });

  it('says nothing from the performance plan she keeps in the app', async () => {
    const m = aMorning();
    await m.run();
    expect(m.sent[0].text).not.toMatch(/Performance plan|Femi has/);
    const onlyThePlan = aMorning({ onlyThePlan: true });
    expect(await onlyThePlan.run()).toEqual({ tried: 0 });
    expect(onlyThePlan.sent).toEqual([]);
  });

  it('with nothing waiting, it is only the check-ins', async () => {
    const m = aMorning({ waiting: false });
    await m.run();
    expect(m.sent[0].context.params[1]).toBe('In "Sales team, Q3", 5 of 6 people have checked in for the third check-in, and Omar has not yet.');
  });

  it('two of her check-ins with the same name are told apart by when each started', async () => {
    const m = aMorning({ twins: true, waiting: false });
    await m.run();
    expect(m.sent[0].context.params[1]).toContain('In "Sales team, Q3, started 2 September"');
    expect(m.sent[0].context.params[1]).toContain('In "Sales team, Q3, started 20 September"');
  });

  it('counts the round the board counts, and says which, when the next round is already written for some', async () => {
    const m = aMorning({ roundAhead: true, waiting: false, answeredAt: new Date('2026-10-05T05:00:00Z') });
    await m.run();
    expect(m.sent[0].context.params[1]).toBe('In "Sales team, Q3", 3 of 6 people have checked in for the second check-in, and Kofi, Amina and Omar have not yet.');
  });

  it('nothing on a day she is on leave', async () => {
    const m = aMorning({ onLeave: true });
    await m.run();
    expect(m.sent).toEqual([]);
  });
});

/** IF NOTHING USEFUL HAPPENED, SEND NOTHING (decision 109). Wairimu reads, or does not get: */
describe('a morning when nothing useful happened', () => {
  const yesterday = new Date('2026-10-04T06:00:00Z');
  it('nothing goes when nobody has checked in and nothing waits for her', async () => {
    const m = aMorning({ nobodyIn: true, waiting: false });
    expect(await m.run()).toEqual({ tried: 0 });
    expect(m.sent).toEqual([]);
  });
  it('nothing goes when nobody has checked in since the last summary and nothing waits', async () => {
    const m = aMorning({ waiting: false, lastSummary: yesterday, answeredAt: new Date('2026-10-03T10:00:00Z') });
    expect(await m.run()).toEqual({ tried: 0 });
  });
  it('it goes when somebody has checked in since the last one', async () => {
    const m = aMorning({ waiting: false, lastSummary: yesterday, answeredAt: new Date('2026-10-04T15:00:00Z') });
    expect(await m.run()).toEqual({ tried: 1 });
    expect(m.sent[0].context.params[1]).toBe('In "Sales team, Q3", 5 of 6 people have checked in for the third check-in, and Omar has not yet.');
  });
  it('an answer with no time recorded does not count as something new', async () => {
    const m = aMorning({ waiting: false, lastSummary: yesterday });
    expect(await m.run()).toEqual({ tried: 0 });
  });
  it('the last summary is found by every form of her number, so a number written another way does not hide it', async () => {
    const asked: any[] = [];
    const m = aMorning({ waiting: false, lastSummary: yesterday, answeredAt: new Date('2026-10-04T15:00:00Z') });
    const orig = m.prisma.whatsAppSend.findFirst;
    m.prisma.whatsAppSend.findFirst = jest.fn(async (a: any) => { asked.push(a.where.phone.in); return orig(a); });
    await m.run();
    expect(asked[0]).toEqual(expect.arrayContaining(['+254711000111', '254711000111']));
  });
  it('and it does not go for something that waits for her to approve, which is told by its own message (B-120)', async () => {
    const m = aMorning({ nobodyIn: true, lastSummary: yesterday });
    expect(await m.run()).toEqual({ tried: 0 });
    expect(m.sent).toHaveLength(0);
  });
});

describe('each sentence', () => {
  it('all in, nobody in, and more not in than are named', () => {
    expect(aCheckInInASentence({ label: 'Sales team, Q3', ofHowMany: 6, answered: 6, notYet: [] })).toBe('In "Sales team, Q3", all 6 people have checked in.');
    expect(aCheckInInASentence({ label: 'Sales team, Q3', ofHowMany: 6, answered: 0, notYet: ['Omar'] })).toBe('In "Sales team, Q3", nobody has checked in yet, out of 6 people.');
    expect(aCheckInInASentence({ label: 'Sales team, Q3', ofHowMany: 9, answered: 3, notYet: ['Omar', 'Bisi', 'Femi', 'Kofi', 'Amina'] })).toBe('In "Sales team, Q3", 3 of 9 people have checked in, and Omar, Bisi and 4 others have not yet.');
    expect(aCheckInInASentence({ label: 'Sales team, Q3', ofHowMany: 6, answered: 4, notYet: ['Omar'] })).toBe('In "Sales team, Q3", 4 of 6 people have checked in, and Omar and one other person have not yet.');
  });
  it('the whole message goes as Hafsah\'s registered template, word for word', () => {
    const m = theLeadsDailySummary('Wairimu', theSummaryParagraph([{ label: 'Sales team, Q3', ofHowMany: 6, answered: 6, notYet: [] }], [])!, 'https://myground.work/grounds');
    expect(TEMPLATES[m.kind].name).toBe('lead_daily_summary');
    expect(m.text).toBe("Good morning Wairimu. Here is today's summary of your check-ins. In \"Sales team, Q3\", all 6 people have checked in. You can open your board for the full picture here https://myground.work/grounds If you would rather not hear from us here again today, reply \"not now\".");
  });
});

describe("the sender's rules hold for the summary", () => {
  const realFetch = (global as any).fetch;
  let fetchSpy: jest.Mock;
  beforeEach(() => { fetchSpy = jest.fn(async () => ({ ok: true, status: 200 })); (global as any).fetch = fetchSpy; });
  afterEach(() => { (global as any).fetch = realFetch; });

  function aSender(person: any, sentToday: { kind: string }[] = []) {
    const prisma: any = {
      platformSetting: { findUnique: jest.fn(async () => ({ value: true })) },
      whatsAppConnection: { findUnique: jest.fn(async () => null) },
      person: { findFirst: jest.fn(async () => person), findMany: jest.fn(async () => []) },
      user: { findMany: jest.fn(async () => []) },
      whatsAppInboundMessage: { findFirst: jest.fn(async () => null) },
      whatsAppSend: { create: jest.fn(async () => ({})), findMany: jest.fn(async () => sentToday) },
      notification: { create: jest.fn(async () => ({})) },
    };
    const config: any = { get: (k: string) => ({ 'whatsapp.enabled': true, 'whatsapp.accessToken': 'test-token', 'whatsapp.phoneNumberId': '111111', 'whatsapp.approvedTemplates': [] } as any)[k] };
    return new WhatsAppService(config, prisma);
  }
  const m = theLeadsDailySummary('Wairimu', 'In "Sales team, Q3", all 6 people have checked in.', 'https://myground.work/grounds');

  /* Changed 18 October (standing decision, Drop Access run 1 item 16): the summary is her one routine message and it wins. Another message of the
     morning (an opening here) no longer holds it back; only a summary already sent today does. */
  it('it is her one message of the day, and an approval told straight away does not use it up', async () => {
    const used = aSender({ whatsappStoppedAt: null, whatsappLastInboundAt: new Date() }, [{ kind: 'lead-summary' }]);
    expect(await used.sendFor('org-1', '+254711000111', m.text, { kind: m.kind, params: m.params })).toEqual({ sent: false, error: NOT_TODAY });
    const opened = aSender({ whatsappStoppedAt: null, whatsappLastInboundAt: new Date() }, [{ kind: 'checkin-open' }]);
    expect((await opened.sendFor('org-1', '+254711000111', m.text, { kind: m.kind, params: m.params })).sent).toBe(true);
    const after = aSender({ whatsappStoppedAt: null, whatsappLastInboundAt: new Date() }, [{ kind: 'request-waiting' }]);
    expect((await after.sendFor('org-1', '+254711000111', m.text, { kind: m.kind, params: m.params })).sent).toBe(true);
  });
  it('outside the 24 hours, while lead_daily_summary is not approved, it is recorded as not sent', async () => {
    const wa = aSender({ whatsappStoppedAt: null, whatsappLastInboundAt: new Date(Date.now() - 3 * 86_400_000) });
    expect(await wa.sendFor('org-1', '+254711000111', m.text, { kind: m.kind, params: m.params })).toEqual({ sent: false, error: OUTSIDE_THE_WINDOW });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
