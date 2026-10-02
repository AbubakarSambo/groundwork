import { LeaveBoardService } from './the-leave-board.service';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';
import { AssistantService } from '../assistant/assistant.service';

/**
 * AN ANSWER SENT FROM WHATSAPP DURING A CHECK-IN (decision 85, build step 7), AS EACH PERSON READS IT.
 *
 * Baridi Appliances, Monday 5 October 2026. Wairimu leads Sales and decides Aisha's leave from Monday
 * 12 to Friday 16 October. She asked "Who will cover the Project X milestone?". Aisha, in a check-in on
 * WhatsApp, said yes to "Is this your answer to Wairimu's question about your leave?". The router then
 * calls the two methods tested here, through the real leave suite. Grace is an admin; Miriam is in
 * Sales and has nothing to do with the request.
 */
const ORG = 'org-baridi';
const TODAY = new Date('2026-10-05T09:00:00Z');
const roles: Record<string, string> = { 'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-aisha': 'MEMBER', 'u-miriam': 'MEMBER' };
const names: Record<string, [string, string]> = {
  'u-grace': ['Grace', 'Achieng'], 'u-wairimu': ['Wairimu', 'Kamau'], 'u-aisha': ['Aisha', 'Otieno'], 'u-miriam': ['Miriam', 'Wanjiku'],
};
const person = (u: string, department: string | null, manager: string | null) =>
  ({ id: `pid-${u.slice(2)}`, linkedUserId: u, externalId: `p-${u.slice(2)}`, department, managerExternalId: manager, active: true, email: null, phone: `+25470000${u.length}`, givenName: names[u][0] });
const directory = [person('u-grace', 'Finance', null), person('u-wairimu', 'Sales', null), person('u-aisha', 'Sales', 'p-wairimu'), person('u-miriam', 'Sales', 'p-wairimu')];
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const QUESTION = 'Who will cover the Project X milestone?';
const ANSWER = 'Brian will cover it, and I will brief him on Friday.';

function setup() {
  const rows: any[] = [
    { id: 'r-aisha', organizationId: ORG, userId: 'u-aisha', startsOn: d('2026-10-12'), endsOn: d('2026-10-16'), kind: 'annual', standInUserId: null, status: 'waiting', decidedById: null, decidedAt: null },
  ];
  const questions: any[] = [];
  const events: any[] = [];
  const proposals: any[] = [];
  let n = 0;
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async ({ where }: any) => (where.organizationId_suite.suite === 'leave' ? { isOn: true, answers: { days: 21 } } : null)) },
    organizationMembership: {
      findUnique: jest.fn(async ({ where }: any) => (roles[where.userId_organizationId.userId] ? { role: roles[where.userId_organizationId.userId] } : null)),
      findMany: jest.fn(async () => []),
    },
    person: {
      findFirst: jest.fn(async ({ where }: any) => directory.find((p) =>
        (where.id ? p.id === where.id : true) && (where.linkedUserId ? p.linkedUserId === where.linkedUserId : true) && (where.externalId ? p.externalId === where.externalId : true)) ?? null),
      findMany: jest.fn(async ({ where }: any) => directory.filter((p) => (where.linkedUserId?.in ?? []).includes(p.linkedUserId))),
    },
    user: {
      findMany: jest.fn(async ({ where }: any) => (where.id?.in ?? []).filter((id: string) => names[id]).map((id: string) => ({ id, firstName: names[id][0], lastName: names[id][1], email: null }))),
      findUnique: jest.fn(async ({ where }: any) => (names[where.id] ? { firstName: names[where.id][0], phoneNumber: null, deletedAt: null, awaitingOrgApproval: false } : null)),
    },
    leaveRequest: {
      findMany: jest.fn(async ({ where }: any) => rows.filter((r) => (!where.userId || r.userId === where.userId) && (!where.status || (where.status.in ?? [where.status]).includes(r.status)))),
      findUnique: jest.fn(async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null),
      update: jest.fn(async ({ where, data }: any) => Object.assign(rows.find((r) => r.id === where.id), data)),
    },
    suiteQuestion: {
      create: jest.fn(async ({ data }: any) => { const q = { id: `q-${++n}`, answer: null, answeredAt: null, askedAt: TODAY, ...data }; questions.push(q); return { id: q.id }; }),
      findMany: jest.fn(async ({ where }: any) => questions.filter((q) =>
        (where.ref?.in ? where.ref.in.includes(q.ref) : true) && (where.toUserId ? q.toUserId === where.toUserId : true) && (where.answer === null ? q.answer == null : true))),
      update: jest.fn(async ({ where, data }: any) => Object.assign(questions.find((q) => q.id === where.id), { ...data, answeredAt: new Date('2026-10-06T08:00:00Z') })),
    },
    suiteEvent: { create: jest.fn(async ({ data }: any) => { events.push({ at: TODAY, ...data }); return data; }), findMany: jest.fn(async ({ where }: any) => events.filter((e) => e.ref === where.ref)) },
    assistantProposal: {
      create: jest.fn(async ({ data }: any) => { const p = { id: `pr-${++n}`, state: 'PARKED', ...data }; proposals.push(p); return p; }),
      updateMany: jest.fn(async ({ where, data }: any) => { for (const p of proposals) if (p.kind === where.kind && p.state === where.state && p.payload?.requestId === where.payload.equals) Object.assign(p, data); return {}; }),
    },
  };
  const sent: { to: string; text: string }[] = [];
  const whatsapp: any = { sendFor: jest.fn(async (_o: string, to: string, text: string) => { sent.push({ to, text }); return { sent: true }; }) };
  const leave = new LeaveBoardService(prisma, new ARequestToldOnWhatsApp(prisma, whatsapp));
  const assistant = new AssistantService(
    prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    undefined, undefined, leave,
  );
  const as = (userId: string) => ({ userId, organizationId: ORG });
  return { leave, assistant, as, sent, proposals, rows };
}

describe('the question Aisha is asked about on WhatsApp', () => {
  it('is Wairimu’s, about Aisha’s leave, and only while it waits', async () => {
    const { leave, assistant, as } = setup();
    expect(await assistant.aQuestionWaitsForYourAnswer(ORG, 'pid-aisha')).toBeNull();
    await leave.askAQuestion(as('u-wairimu'), 'r-aisha', QUESTION);
    expect(await assistant.aQuestionWaitsForYourAnswer(ORG, 'pid-aisha')).toEqual({ id: 'q-1', suite: 'leave', ref: 'r-aisha', askedBy: 'Wairimu', about: 'your leave' });
  });

  it('is nobody else’s: Miriam, Wairimu and Grace have none waiting', async () => {
    const { leave, assistant, as } = setup();
    await leave.askAQuestion(as('u-wairimu'), 'r-aisha', QUESTION);
    for (const p of ['pid-miriam', 'pid-wairimu', 'pid-grace']) expect(await assistant.aQuestionWaitsForYourAnswer(ORG, p)).toBeNull();
  });
});

describe('after Aisha’s yes', () => {
  it('Aisha reads that it was sent, and her answer under her own leave', async () => {
    const { leave, assistant, as } = setup();
    await leave.askAQuestion(as('u-wairimu'), 'r-aisha', QUESTION);
    const q = (await assistant.aQuestionWaitsForYourAnswer(ORG, 'pid-aisha'))!;
    expect(await assistant.answerAQuestionOnWhatsApp(ORG, 'pid-aisha', q.id, ANSWER))
      .toBe('I have sent your answer to Wairimu. Your leave request is still waiting for Wairimu to decide.');
    const mine = await leave.mine(as('u-aisha'), TODAY);
    expect(mine.requests[0].questions).toEqual([
      'Wairimu asked you on 5 October, “Who will cover the Project X milestone?”',
      'You answered on 6 October, “Brian will cover it, and I will brief him on Friday.”',
    ]);
    expect(mine.requests[0].questionWaiting).toBeNull();
  });

  it('Wairimu reads the answer on her board, and is told it on WhatsApp', async () => {
    const { leave, assistant, as, sent } = setup();
    await leave.askAQuestion(as('u-wairimu'), 'r-aisha', QUESTION);
    sent.length = 0;
    await assistant.answerAQuestionOnWhatsApp(ORG, 'pid-aisha', 'q-1', ANSWER);
    const w = (await leave.board(as('u-wairimu'), TODAY)).waiting.find((x) => x.id === 'r-aisha')!;
    expect(w.questions).toEqual([
      'You asked Aisha on 5 October, “Who will cover the Project X milestone?”',
      'Aisha answered on 6 October, “Brian will cover it, and I will brief him on Friday.”',
    ]);
    expect(sent.map((s) => s.text)).toEqual([
      'Hi Wairimu, Aisha has answered your question about Aisha\'s leave from Monday 12 October to Friday 16 October. Aisha said, “Brian will cover it, and I will brief him on Friday.” Reply here to approve or decline it, or open Groundwork to read it first.',
    ]);
  });

  it('Grace, an admin, reads it with both names', async () => {
    const { leave, assistant, as } = setup();
    await leave.askAQuestion(as('u-wairimu'), 'r-aisha', QUESTION);
    await assistant.answerAQuestionOnWhatsApp(ORG, 'pid-aisha', 'q-1', ANSWER);
    const w = (await leave.board(as('u-grace'), TODAY)).waiting.find((x) => x.id === 'r-aisha')!;
    expect(w.questions).toEqual([
      'Wairimu asked Aisha on 5 October, “Who will cover the Project X milestone?”',
      'Aisha answered on 6 October, “Brian will cover it, and I will brief him on Friday.”',
    ]);
  });

  it('the question waiting in Ask Groundwork is let go, and the request keeps waiting', async () => {
    const { leave, assistant, as, proposals, rows } = setup();
    await leave.askAQuestion(as('u-wairimu'), 'r-aisha', QUESTION);
    await assistant.answerAQuestionOnWhatsApp(ORG, 'pid-aisha', 'q-1', ANSWER);
    expect(proposals.every((p) => p.state === 'DROPPED')).toBe(true);
    expect(rows[0].status).toBe('waiting');
  });

  it('a second yes, or a question answered already, sends nothing', async () => {
    const { leave, assistant, as } = setup();
    await leave.askAQuestion(as('u-wairimu'), 'r-aisha', QUESTION);
    await assistant.answerAQuestionOnWhatsApp(ORG, 'pid-aisha', 'q-1', ANSWER);
    expect(await assistant.answerAQuestionOnWhatsApp(ORG, 'pid-aisha', 'q-1', 'Again'))
      .toBe('There is no question about your leave waiting for your answer now, so I have not sent anything.');
  });

  it('Miriam cannot answer Aisha’s question', async () => {
    const { leave, assistant, as } = setup();
    await leave.askAQuestion(as('u-wairimu'), 'r-aisha', QUESTION);
    expect(await assistant.answerAQuestionOnWhatsApp(ORG, 'pid-miriam', 'q-1', 'It is fine'))
      .toBe('There is no question about your leave waiting for your answer now, so I have not sent anything.');
    expect((await leave.mine(as('u-aisha'), TODAY)).requests[0].questionWaiting).not.toBeNull();
  });
});

describe('the message that tells Aisha of the question', () => {
  it('now says she can reply on WhatsApp', async () => {
    const { leave, as, sent } = setup();
    await leave.askAQuestion(as('u-wairimu'), 'r-aisha', QUESTION);
    expect(sent[0].text).toBe('Hi Aisha, Wairimu has a question about your request for leave from Monday 12 October to Friday 16 October. Wairimu asked, “Who will cover the Project X milestone?” You can reply here with your answer, or answer it in Groundwork. Your request is still waiting for Wairimu to decide.');
  });
});
