import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { LeaveBoardService } from './the-leave-board.service';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';
import { QUESTION_REFUSED, LEAVE_QUESTION_KIND } from './a-question-about-a-request';
import { aRequestsHistory } from './a-request-is-recorded';
import { AssistantService } from '../assistant/assistant.service';
import { WhatNeedsYouService } from '../grounds/what-needs-you.service';

/**
 * A QUESTION ABOUT A LEAVE REQUEST, AND A REASON FOR A DECLINE (decision 85, item 1; build step 7),
 * AS EACH PERSON IS SERVED IT.
 *
 * Baridi Appliances, Monday 5 October 2026. Aisha, in Sales, asks for Monday 12 to Friday 16 October.
 * Wairimu leads Sales, is her manager, and decides it. Grace is an admin. Kamau leads Operations.
 * Miriam is in Sales. Samuel, also in Sales, asked for Monday 19 October.
 *   - Wairimu asks Aisha "Who will cover the Project X milestone?". The request keeps waiting.
 *   - Aisha is told under her own leave, on Today, on WhatsApp, and in Ask Groundwork the next time
 *     she writes there. She answers "Brian will cover it, and I will brief him on Friday."
 *   - Wairimu declines Samuel's request with the reason "Sales is two short that week."
 */

const ORG = 'org-baridi';
const TODAY = new Date('2026-10-05T09:00:00Z');
const roles: Record<string, string> = { 'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-kamau': 'LEAD', 'u-aisha': 'MEMBER', 'u-miriam': 'MEMBER', 'u-samuel': 'MEMBER' };
const names: Record<string, [string, string]> = {
  'u-grace': ['Grace', 'Achieng'], 'u-wairimu': ['Wairimu', 'Kamau'], 'u-kamau': ['Kamau', 'Njenga'], 'u-aisha': ['Aisha', 'Otieno'],
  'u-miriam': ['Miriam', 'Wanjiku'], 'u-samuel': ['Samuel', 'Njoroge'],
};
const person = (u: string, department: string | null, manager: string | null) =>
  ({ linkedUserId: u, externalId: `p-${u.slice(2)}`, department, managerExternalId: manager, active: true, email: null, phone: `+2547000${u.length}${u.charCodeAt(2)}`, givenName: names[u][0] });
const directory = [
  person('u-grace', 'Finance', null), person('u-wairimu', 'Sales', null), person('u-kamau', 'Operations', null),
  person('u-aisha', 'Sales', 'p-wairimu'), person('u-miriam', 'Sales', 'p-wairimu'), person('u-samuel', 'Sales', 'p-wairimu'),
];
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

function setup() {
  const rows: any[] = [
    { id: 'r-aisha', organizationId: ORG, userId: 'u-aisha', startsOn: d('2026-10-12'), endsOn: d('2026-10-16'), kind: 'annual', standInUserId: null, status: 'waiting', decidedById: null, decidedAt: null },
    { id: 'r-samuel', organizationId: ORG, userId: 'u-samuel', startsOn: d('2026-10-19'), endsOn: d('2026-10-19'), kind: 'annual', standInUserId: null, status: 'waiting', decidedById: null, decidedAt: null },
  ];
  const questions: any[] = [];
  const events: any[] = [];
  const proposals: any[] = [];
  let n = 0;
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async ({ where }: any) =>
      where.organizationId_suite.suite === 'leave' ? { isOn: true, answers: { days: 21, approver: 'Their manager' } } : null) },
    organizationMembership: {
      findUnique: jest.fn(async ({ where }: any) => (roles[where.userId_organizationId.userId] ? { role: roles[where.userId_organizationId.userId] } : null)),
      findMany: jest.fn(async () => []),
    },
    person: {
      findFirst: jest.fn(async ({ where }: any) => directory.find((p) =>
        (where.linkedUserId ? p.linkedUserId === where.linkedUserId : true) && (where.externalId ? p.externalId === where.externalId : true)) ?? null),
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
      findMany: jest.fn(async ({ where }: any) => questions.filter((q) => q.ref && where.ref.in.includes(q.ref))),
      update: jest.fn(async ({ where, data }: any) => Object.assign(questions.find((q) => q.id === where.id), { ...data, answeredAt: new Date('2026-10-06T08:00:00Z') })),
    },
    suiteEvent: {
      create: jest.fn(async ({ data }: any) => { events.push({ at: TODAY, ...data }); return data; }),
      findMany: jest.fn(async ({ where }: any) => events.filter((e) => e.ref === where.ref)),
    },
    assistantProposal: {
      create: jest.fn(async ({ data }: any) => { const p = { id: `pr-${++n}`, state: 'PARKED', ...data }; proposals.push(p); return p; }),
      updateMany: jest.fn(async ({ where, data }: any) => { for (const p of proposals) if (p.kind === where.kind && p.state === where.state && p.payload?.requestId === where.payload.equals) Object.assign(p, data); return {}; }),
    },
  };
  const sent: { to: string; text: string; context: any }[] = [];
  const whatsapp: any = { sendFor: jest.fn(async (_org: string, to: string, text: string, context: any) => { sent.push({ to, text, context }); return { sent: true }; }) };
  const told = new ARequestToldOnWhatsApp(prisma, whatsapp);
  const svc = new LeaveBoardService(prisma, told);
  const as = (userId: string) => ({ userId, organizationId: ORG });
  const phoneOf = (u: string) => directory.find((p) => p.linkedUserId === u)!.phone;
  return { svc, as, rows, questions, events, proposals, sent, phoneOf, prisma };
}

const QUESTION = 'Who will cover the Project X milestone?';
const ANSWER = 'Brian will cover it, and I will brief him on Friday.';

describe('Wairimu, who decides Aisha’s request, asks her a question', () => {
  it('the request keeps waiting, and Wairimu reads her own question under it', async () => {
    const { svc, as, rows } = setup();
    const board = await svc.askAQuestion(as('u-wairimu'), 'r-aisha', QUESTION);
    expect(rows[0].status).toBe('waiting');
    const w = board.waiting.find((x) => x.id === 'r-aisha')!;
    expect(w.mayDecide).toBe(true);
    expect(w.questions).toEqual(['You asked Aisha on 5 October, “Who will cover the Project X milestone?”', 'Aisha has not answered yet.']);
    expect(w.said.slice(-2)).toEqual(w.questions);
  });

  it('after Aisha answers, Wairimu reads the answer, with Aisha’s name', async () => {
    const { svc, as } = setup();
    await svc.askAQuestion(as('u-wairimu'), 'r-aisha', QUESTION);
    await svc.answerAQuestion(as('u-aisha'), 'r-aisha', ANSWER);
    const w = (await svc.board(as('u-wairimu'), TODAY)).waiting.find((x) => x.id === 'r-aisha')!;
    expect(w.questions).toEqual([
      'You asked Aisha on 5 October, “Who will cover the Project X milestone?”',
      'Aisha answered on 6 October, “Brian will cover it, and I will brief him on Friday.”',
    ]);
  });

  it('is told on WhatsApp when Aisha answers, with her answer, as a request still waiting for her', async () => {
    const { svc, as, sent, phoneOf } = setup();
    await svc.askAQuestion(as('u-wairimu'), 'r-aisha', QUESTION);
    sent.length = 0;
    await svc.answerAQuestion(as('u-aisha'), 'r-aisha', ANSWER);
    expect(sent).toEqual([{
      to: phoneOf('u-wairimu'),
      text: 'Hi Wairimu, Aisha has answered your question about Aisha\'s leave from Monday 12 October to Friday 16 October. Aisha said, “Brian will cover it, and I will brief him on Friday.” Reply here to approve or decline it, or open Groundwork to read it first.',
      context: { kind: 'request-waiting', params: ['Wairimu', 'Aisha', 'leave from Monday 12 October to Friday 16 October'] },
    }]);
  });
});

describe('Aisha, who asked for the leave', () => {
  it('reads the question under her own leave, and where to answer it', async () => {
    const { svc, as } = setup();
    await svc.askAQuestion(as('u-wairimu'), 'r-aisha', QUESTION);
    const mine = await svc.mine(as('u-aisha'), TODAY);
    expect(mine.requests[0]).toMatchObject({
      where: 'Your leave from Monday 12 October to Friday 16 October is waiting for Wairimu.',
      questions: ['Wairimu asked you on 5 October, “Who will cover the Project X milestone?”', 'You have not answered yet. You can answer it here or in Ask Groundwork.'],
      questionWaiting: { question: QUESTION, askedBy: 'Wairimu' },
      declinedBecause: null,
    });
  });

  it('is told on WhatsApp with the question itself, as a reply to her own request', async () => {
    const { svc, as, sent, phoneOf } = setup();
    await svc.askAQuestion(as('u-wairimu'), 'r-aisha', QUESTION);
    expect(sent).toEqual([{
      to: phoneOf('u-aisha'),
      text: 'Hi Aisha, Wairimu has a question about your request for leave from Monday 12 October to Friday 16 October. Wairimu asked, “Who will cover the Project X milestone?” You can reply here with your answer, or answer it in Groundwork. Your request is still waiting for Wairimu to decide.',
      context: { kind: 'request-decided', params: ['Aisha', 'leave from Monday 12 October to Friday 16 October', 'asked about', 'Wairimu'] },
    }]);
  });

  it('reads it on Today, and nobody else does', async () => {
    const { svc, as, prisma } = setup();
    await svc.askAQuestion(as('u-wairimu'), 'r-aisha', QUESTION);
    const grounds: any = { list: async () => [], listAwaitingApproval: async () => [] };
    const today = new WhatNeedsYouService(prisma, grounds, svc);
    const aisha = await today.forReader('u-aisha', 'aisha@baridi.example', ORG, 'MEMBER');
    expect(JSON.stringify(aisha)).toContain('Wairimu asked you a question about your leave from Monday 12 October to Friday 16 October.');
    expect(JSON.stringify(aisha)).toContain('Wairimu asked, “Who will cover the Project X milestone?” Your request is still waiting.');
    const miriam = await today.forReader('u-miriam', 'miriam@baridi.example', ORG, 'MEMBER');
    expect(JSON.stringify(miriam)).not.toContain('Project X');
    /* "Answer it" opens her own requests page, which a member can open; the leave board refuses a member. */
    expect(aisha.needs.find((n: any) => n.key === 'leave-question-r-aisha')?.action).toEqual({ label: 'Answer it', to: '/suite/mine' });
  });

  it('her own requests say the days left in a full sentence, the one Ask Groundwork says', async () => {
    const { svc, as } = setup();
    const mine = await svc.mine(as('u-aisha'));
    expect(mine.daysLeftSaid).toMatch(/^You have \d+ days? of leave left this year, out of \d+\.$/);
  });

  it('answers it; the request keeps waiting, and her answer reads back to her', async () => {
    const { svc, as, rows } = setup();
    await svc.askAQuestion(as('u-wairimu'), 'r-aisha', QUESTION);
    const mine = await svc.answerAQuestion(as('u-aisha'), 'r-aisha', ANSWER);
    expect(rows[0].status).toBe('waiting');
    expect(mine.requests[0].questions).toEqual([
      'Wairimu asked you on 5 October, “Who will cover the Project X milestone?”',
      'You answered on 6 October, “Brian will cover it, and I will brief him on Friday.”',
    ]);
    expect(mine.requests[0].questionWaiting).toBeNull();
  });

  it('the question waiting in Ask Groundwork is let go once she has answered', async () => {
    const { svc, as, proposals } = setup();
    await svc.askAQuestion(as('u-wairimu'), 'r-aisha', QUESTION);
    expect(proposals).toEqual([expect.objectContaining({ kind: LEAVE_QUESTION_KIND, personExternalId: 'p-aisha', state: 'PARKED', summary: 'Wairimu asked you a question about your leave from Monday 12 October to Friday 16 October.' })]);
    await svc.answerAQuestion(as('u-aisha'), 'r-aisha', ANSWER);
    expect(proposals[0].state).toBe('DROPPED');
  });

  it('cannot ask a question about her own request, and cannot answer when nothing is asked', async () => {
    const { svc, as } = setup();
    await expect(svc.askAQuestion(as('u-aisha'), 'r-aisha', 'Can I?')).rejects.toThrow(new ForbiddenException(QUESTION_REFUSED.notYours));
    await expect(svc.answerAQuestion(as('u-aisha'), 'r-aisha', ANSWER)).rejects.toThrow(new BadRequestException(QUESTION_REFUSED.nothingToAnswer));
  });
});

describe('Grace, an admin who does not decide Aisha’s request', () => {
  it('reads the question and the answer on the board, named, but may not ask one', async () => {
    const { svc, as } = setup();
    await svc.askAQuestion(as('u-wairimu'), 'r-aisha', QUESTION);
    await svc.answerAQuestion(as('u-aisha'), 'r-aisha', ANSWER);
    const w = (await svc.board(as('u-grace'), TODAY)).waiting.find((x) => x.id === 'r-aisha')!;
    expect(w.questions).toEqual([
      'Wairimu asked Aisha on 5 October, “Who will cover the Project X milestone?”',
      'Aisha answered on 6 October, “Brian will cover it, and I will brief him on Friday.”',
    ]);
    await expect(svc.askAQuestion(as('u-grace'), 'r-aisha', 'Anything?')).rejects.toThrow(new ForbiddenException(QUESTION_REFUSED.notYours));
  });

  it('reads in the record that a question was asked and answered, never the words', async () => {
    const { svc, as, prisma } = setup();
    await svc.askAQuestion(as('u-wairimu'), 'r-aisha', QUESTION);
    await svc.answerAQuestion(as('u-aisha'), 'r-aisha', ANSWER);
    const { said } = await aRequestsHistory(prisma, ORG, 'leave', 'r-aisha', 'u-grace');
    expect(said).toEqual(expect.arrayContaining([
      'Wairimu asked Aisha a question about it on 5 October.',
      'Aisha answered Wairimu\'s question on 5 October.',
    ]));
    expect(said.join(' ')).not.toContain('Project X');
  });
});

describe('Kamau, a lead of another team, and Miriam, a colleague', () => {
  it('Kamau may not ask, and is not served the question', async () => {
    const { svc, as } = setup();
    await svc.askAQuestion(as('u-wairimu'), 'r-aisha', QUESTION);
    await expect(svc.askAQuestion(as('u-kamau'), 'r-aisha', 'Why?')).rejects.toThrow(new ForbiddenException(QUESTION_REFUSED.notYours));
    expect((await svc.board(as('u-kamau'), TODAY)).waiting.find((x) => x.id === 'r-aisha')).toBeUndefined();
  });

  it('Miriam may not answer Aisha’s question, and reads nothing of it', async () => {
    const { svc, as } = setup();
    await svc.askAQuestion(as('u-wairimu'), 'r-aisha', QUESTION);
    await expect(svc.answerAQuestion(as('u-miriam'), 'r-aisha', 'Me!')).rejects.toThrow(new ForbiddenException(QUESTION_REFUSED.onlyThePerson));
    await expect(svc.board(as('u-miriam'), TODAY)).rejects.toThrow(ForbiddenException);
    expect(JSON.stringify(await svc.mine(as('u-miriam'), TODAY))).not.toContain('Project X');
  });
});

describe('a decline with a reason', () => {
  it('Samuel reads who declined it and what they said, in the app and on WhatsApp', async () => {
    const { svc, as, sent, phoneOf } = setup();
    await svc.decide(as('u-wairimu'), 'r-samuel', 'declined', 'Sales is two short that week');
    const mine = await svc.mine(as('u-samuel'), TODAY);
    expect(mine.requests[0]).toMatchObject({
      status: 'declined',
      where: 'Wairimu declined your leave on Monday 19 October.',
      declinedBecause: 'Wairimu said, “Sales is two short that week.”',
    });
    expect(sent).toEqual([{
      to: phoneOf('u-samuel'),
      text: 'Hi Samuel, your request for leave on Monday 19 October was declined by Wairimu. Wairimu said, “Sales is two short that week.” Open Groundwork to read it.',
      /* Changed 25 October (round 1): with a reason, the template that carries it, so it is said outside the 24 hours too. */
      context: { kind: 'request-decided-with-reason', params: ['Samuel', 'leave on Monday 19 October', 'declined', 'Wairimu', 'Wairimu said, “Sales is two short that week.”'] },
    }]);
  });

  it('a decline with no reason reads as before', async () => {
    const { svc, as, sent } = setup();
    await svc.decide(as('u-wairimu'), 'r-samuel', 'declined');
    expect((await svc.mine(as('u-samuel'), TODAY)).requests[0].declinedBecause).toBeNull();
    expect(sent[0].text).toBe('Hi Samuel, your request for leave on Monday 19 October was declined by Wairimu. Open Groundwork to read it.');
  });

  it('the record says a reason was given, never the reason', async () => {
    const { svc, as, prisma } = setup();
    await svc.decide(as('u-wairimu'), 'r-samuel', 'declined', 'Sales is two short that week');
    const { said } = await aRequestsHistory(prisma, ORG, 'leave', 'r-samuel', 'u-samuel');
    expect(said).toContain('Wairimu declined it on 5 October and gave a reason.');
    expect(said.join(' ')).not.toContain('two short');
  });
});

/* ------------------------------------------- Ask Groundwork ------------------------------------------- */

function anAssistant(opts: { parked: any; waiting?: boolean; me?: string }) {
  const proposals: any[] = [];
  const answerAQuestion = jest.fn(async () => ({}));
  const decide = jest.fn(async () => ({}));
  const leave: any = {
    mine: async () => ({ daysLeft: 16 }),
    board: async () => ({ waiting: [{ id: 'r-samuel', name: 'Samuel Njoroge', startsOn: '2026-10-19', endsOn: '2026-10-19', mayDecide: true }] }),
    decide,
    nowWaitingFor: async () => null,
    questionWaitingFor: jest.fn(async () => (opts.waiting === false ? null : { askedBy: 'Wairimu', leave: 'leave from Monday 12 October to Friday 16 October', question: QUESTION })),
    answerAQuestion,
  };
  let parked = opts.parked;
  const prisma: any = {
    person: { findFirst: jest.fn(async () => (opts.me === 'u-wairimu' ? { id: 'p1', externalId: 'p-wairimu', active: true, linkedUserId: 'u-wairimu', department: 'Sales', managerExternalId: null } : { id: 'p1', externalId: 'p-aisha', active: true, linkedUserId: 'u-aisha', department: 'Sales', managerExternalId: 'p-wairimu' })), findMany: jest.fn(async () => []) },
    organizationMembership: { findUnique: jest.fn(async () => ({ role: 'MEMBER' })) },
    organizationMemory: { findMany: jest.fn(async () => []) },
    organizationSuite: { findUnique: jest.fn(async () => ({ isOn: true, answers: {} })) },
    leaveRequest: { findMany: jest.fn(async () => []) },
    ground: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
    assistantProposal: {
      findFirst: jest.fn(async () => (parked?.state === 'PARKED' ? parked : null)),
      create: jest.fn(async ({ data }: any) => { const p = { id: `pr-${proposals.length + 1}`, state: 'PARKED', ...data }; proposals.push(p); parked = p; return p; }),
      update: jest.fn(async ({ where, data }: any) => { if (parked?.id === where.id) Object.assign(parked, data); return data; }),
    },
    commitment: { create: jest.fn(async () => ({})), findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    detectionQuietPeriod: { findMany: jest.fn(async () => []) },
  };
  const service = new AssistantService(
    prisma, { respond: jest.fn(async () => { throw new Error('model off'); }) } as any, { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) } as any,
    { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any,
    { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
    { pendingFor: async () => [], decide: async () => { throw new Error('none'); } } as any,
    { start: async () => { throw new Error('none'); } } as any,
    { forPerson: async () => { throw new Error('none'); } } as any,
    { read: async () => ({ read: false, because: 'none' }) } as any,
    { sendRoundDigest: async () => { throw new Error('none'); } } as any,
    {} as any,
    undefined, undefined,
    leave,
  );
  const said = async (q: string) => {
    const r: any = await service.respond(ORG, 'p1', q);
    return r.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n');
  };
  return { said, proposals, answerAQuestion, decide };
}

describe('Aisha answers in Ask Groundwork', () => {
  const question = () => ({ id: 'pq', state: 'PARKED', kind: LEAVE_QUESTION_KIND, summary: 'Wairimu asked you a question about your leave from Monday 12 October to Friday 16 October.', payload: { requestId: 'r-aisha', questionId: 'q-1' } });

  it('what she writes is said back as her answer, and sent only on her yes', async () => {
    const a = anAssistant({ parked: question() });
    expect(await a.said(ANSWER)).toBe('Wairimu asked you about your leave from Monday 12 October to Friday 16 October, “Who will cover the Project X milestone?” I will send Wairimu your answer as you wrote it, “Brian will cover it, and I will brief him on Friday.” Shall I send it?');
    expect(a.answerAQuestion).not.toHaveBeenCalled();
    expect(await a.said('yes')).toBe('I have sent your answer to Wairimu. Your leave request is still waiting for Wairimu to decide.');
    expect(a.answerAQuestion).toHaveBeenCalledWith({ userId: 'u-aisha', organizationId: ORG }, 'r-aisha', ANSWER);
  });

  it('a no sends nothing, and the question keeps waiting for her', async () => {
    const a = anAssistant({ parked: question() });
    await a.said(ANSWER);
    expect(await a.said('no')).toBe('I have not sent it. Wairimu’s question is still waiting for your answer, so write your answer here when you are ready, or answer it under your leave.');
    expect(a.answerAQuestion).not.toHaveBeenCalled();
    expect(a.proposals[a.proposals.length - 1]).toMatchObject({ kind: LEAVE_QUESTION_KIND, state: 'PARKED' });
  });
});

describe('Wairimu declines in Ask Groundwork, or by a WhatsApp reply, with a reason', () => {
  it('the reason is said back before anything happens, and passed to the leave suite on her yes', async () => {
    const a = anAssistant({ parked: null, me: 'u-wairimu' });
    expect(await a.said('decline Samuel\'s leave because Sales is two short that week')).toBe(
      'You are declining Samuel\'s leave on Monday 19 October, and I will tell Samuel your reason, “Sales is two short that week.” Is that right?',
    );
    expect(a.decide).not.toHaveBeenCalled();
    expect(await a.said('yes')).toBe('Samuel\'s leave on Monday 19 October is declined now. I have let Samuel know. They can read your reason in Groundwork.');
    expect(a.decide).toHaveBeenCalledWith({ userId: 'u-wairimu', organizationId: ORG }, 'r-samuel', 'declined', 'Sales is two short that week');
  });

  it('a decline with no reason reads as before', async () => {
    const a = anAssistant({ parked: null, me: 'u-wairimu' });
    expect(await a.said('decline')).toBe('You are declining Samuel\'s leave on Monday 19 October. Is that right?');
  });
});
