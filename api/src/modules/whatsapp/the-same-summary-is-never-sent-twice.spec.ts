import { sendTheLeadsDailySummaries } from './the-leads-daily-summary';

/**
 * THE SAME SUMMARY IS NEVER SENT TWICE (decision 109 item 7; existing-users check, section 15), EIGHT MORNINGS RUNNING.
 *
 * In a copy of a real database the same three leads were sent the same words every one of eight days. Two things let it through. The last summary was looked
 * for by the kind "lead-summary", but outside the 24 hours it is written down as "lead-summary:template", so it was never found and the "answered since" test
 * always had nothing to compare. And a leave request that waited for the lead made every morning "useful", whatever it said. Now the last summary is found by either
 * kind, and one whose words are the same as the last that went is not sent, whatever else is true.
 */
function days() {
  const store = new Map<string, any>();
  const sends: any[] = [];
  const sent: string[] = [];
  let answers: any[] = [];
  let refuse = false;
  const prisma: any = {
    ground: { findMany: jest.fn(async () => [{ id: 'g1', label: 'J97 Implementation', organizationId: 'org-1', overWhatsApp: null, initiatorId: 'u-w' }]) },
    organization: { findMany: jest.fn(async () => [{ id: 'org-1' }]) },
    checkIn: { findMany: jest.fn(async () => answers) },
    user: { findUnique: jest.fn(async () => ({ firstName: 'Wairimu', phoneNumber: null, deletedAt: null })), findMany: jest.fn(async () => []) },
    person: { findFirst: jest.fn(async () => ({ phone: '+254711000111' })), findMany: jest.fn(async () => []) },
    leaveRequest: { findMany: jest.fn(async () => []) },
    /* Outside the 24 hours it is written down with ":template" on its kind, as the sender really does. */
    whatsAppSend: { findFirst: jest.fn(async ({ where }: any) => sends.filter((s) => (where.kind?.startsWith ? s.kind.startsWith(where.kind.startsWith) : s.kind === where.kind)).slice(-1)[0] ?? null) },
    platformSetting: {
      findUnique: jest.fn(async ({ where }: any) => (store.has(where.key) ? { value: store.get(where.key) } : null)),
      create: jest.fn(async ({ data }: any) => { if (store.has(data.key)) throw new Error('clash'); store.set(data.key, data.value); return data; }),
      update: jest.fn(async ({ where, data }: any) => { store.set(where.key, data.value); return data; }),
    },
  };
  const whatsapp: any = {
    isEnabled: jest.fn(async () => true),
    sendFor: jest.fn(async (_o: string, _t: string, text: string, ctx: any) => { if (refuse) return { sent: false, error: 'Not today' }; sent.push(text); sends.push({ kind: `${ctx.kind}:template`, sentAt: new Date() }); return { sent: true }; }),
  };
  /* A leave request that has waited for her all week, and is still waiting. */
  const boards: any = { leave: { board: jest.fn(async () => ({ waiting: [{ id: 'l-1', name: 'Amina Yusuf', startsOn: '2026-10-05', endsOn: '2026-10-09', mayDecide: true }] })) } };
  const morning = (n: number) => sendTheLeadsDailySummaries({ prisma, whatsapp, boards, frontendUrl: 'https://myground.work' }, new Date(Date.UTC(2026, 9, 5 + n, 6, 0, 0)));
  const nobodyIn = [{ status: 'NOT_STARTED', sessionNumber: 1, participant: { userId: 'u-x', managingOnly: false, nameGiven: null, user: { firstName: 'Omar', awaitingOrgApproval: false } } }];
  const bisi = { status: 'NOT_STARTED', sessionNumber: 1, participant: { userId: 'u-b', managingOnly: false, nameGiven: null, user: { firstName: 'Bisi', awaitingOrgApproval: false } } };
  const omarIn = [bisi, { status: 'COMPLETED', completedAt: new Date(Date.UTC(2026, 9, 9, 12)), sessionNumber: 1, participant: { userId: 'u-x', managingOnly: false, nameGiven: null, user: { firstName: 'Omar', awaitingOrgApproval: false } } }];
  const kofi = { status: 'NOT_STARTED', sessionNumber: 1, participant: { userId: 'u-k', managingOnly: false, nameGiven: null, user: { firstName: 'Kofi', awaitingOrgApproval: false } } };
  const bothIn = [{ ...bisi, status: 'COMPLETED', completedAt: new Date(Date.UTC(2026, 9, 12, 12)) }, omarIn[1], kofi];
  return { morning, sent, setAnswers: (a: any[]) => { answers = a; }, refuse: (v: boolean) => { refuse = v; }, nobodyIn, omarIn, bothIn };
}

describe('eight mornings with nothing new', () => {
  it('she is sent it once, and not again on the seven mornings after', async () => {
    const d = days();
    d.setAnswers(d.omarIn);
    for (let n = 0; n < 8; n++) await d.morning(n);
    expect(d.sent).toHaveLength(1);
    expect(d.sent[0]).toContain('1 of 2 people has checked in');
    /* Approvals are told by their own message (B-120): a leave request that has waited all week is not in this one. */
    expect(d.sent[0]).not.toContain("Amina's leave");
  });

  it('nothing is sent while nobody has checked in, whatever waits for her to approve', async () => {
    const d = days();
    d.setAnswers(d.nobodyIn);
    for (let n = 0; n < 8; n++) await d.morning(n);
    expect(d.sent).toEqual([]);
  });

  it('and she is sent the next one the morning something changes, once, and then not again', async () => {
    const d = days();
    d.setAnswers(d.omarIn);
    for (let n = 0; n < 4; n++) await d.morning(n);
    d.setAnswers(d.bothIn);
    for (let n = 4; n < 8; n++) await d.morning(n);
    expect(d.sent).toHaveLength(2);
    expect(d.sent[0]).toContain('1 of 2 people has checked in');
    expect(d.sent[1]).toContain('2 of 3 people have checked in');
    expect(d.sent[0]).not.toBe(d.sent[1]);
  });

  it('a summary the sender refused is tried again the next morning, and not remembered as said', async () => {
    const d = days();
    d.setAnswers(d.omarIn);
    d.refuse(true);
    await d.morning(0);
    expect(d.sent).toEqual([]);
    d.refuse(false);
    await d.morning(1);
    await d.morning(2);
    expect(d.sent).toHaveLength(1);
  });
});
