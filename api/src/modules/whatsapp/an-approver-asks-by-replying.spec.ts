import { aLeaveRequest } from '../suites/a-request-in-words';
import { AssistantService } from '../assistant/assistant.service';

/**
 * AN APPROVER ASKS A QUESTION ABOUT A REQUEST BY REPLYING (4 October 2026). It could only be asked in the
 * app. Now Wairimu writes it on WhatsApp or in Ask Groundwork, reads it said back word for word, and it
 * goes to Amina only on her yes, through the same code the app's box uses.
 */
function anApprover(opts: { parked?: any; waiting?: any[]; spend?: any[] } = {}) {
  const proposals: any[] = [];
  const decide = jest.fn(async () => ({ waiting: [], off: [] }));
  const ask = jest.fn(async () => ({}));
  const askSpend = jest.fn(async () => ({}));
  const leave: any = {
    board: jest.fn(async () => ({ waiting: opts.waiting ?? [{ id: 'l-1', name: 'Amina Yusuf', startsOn: '2026-10-05', endsOn: '2026-10-09', mayDecide: true }], off: [] })),
    decide,
    askAQuestion: ask,
  };
  const spending: any = { board: jest.fn(async () => ({ currency: 'KES', waiting: opts.spend ?? [] })), decide: jest.fn(), askAQuestion: askSpend };
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
  return { said, decide, ask, askSpend, proposals };
}


describe('Wairimu asks Amina a question by replying', () => {
  const QUESTION = 'question for Amina about her leave: who will cover the milestone?';
  it('is said back word for word, and nothing is sent yet', async () => {
    const a = anApprover();
    expect(await a.said(QUESTION)).toEqual({
      lane: 'decide_a_request',
      text: "You are asking Amina, “who will cover the milestone?” It is about Amina's leave from Monday 5 October to Friday 9 October. I will send it as you wrote it, and the request stays waiting for you. Shall I send it?",
    });
    expect(a.ask).not.toHaveBeenCalled();
    expect(a.proposals[0]).toMatchObject({ kind: 'request_question', payload: { question: 'who will cover the milestone?', request: { ref: 'l-1' } } });
  });
  it('her yes sends it through the leave board, as her, and says the request still waits', async () => {
    const parked = { id: 'pk', kind: 'request_question', state: 'PARKED', summary: 'x', payload: { request: aLeaveRequest('l-1', null, 'Amina', '2026-10-05', '2026-10-09'), question: 'Who will cover the milestone?' } };
    const a = anApprover({ parked });
    expect((await a.said('yes')).text).toBe('I have sent your question to Amina. The request is still waiting for you to decide.');
    expect(a.ask).toHaveBeenCalledWith({ userId: 'u-wairimu', organizationId: 'org-1' }, 'l-1', 'Who will cover the milestone?');
  });
  it('her no sends nothing', async () => {
    const parked = { id: 'pk', kind: 'request_question', state: 'PARKED', summary: 'x', payload: { request: aLeaveRequest('l-1', null, 'Amina', '2026-10-05', '2026-10-09'), question: 'Who will cover the milestone?' } };
    const a = anApprover({ parked });
    expect((await a.said('no')).text).toBe('I have not sent it. Amina has not been asked anything, and the request is still waiting for you.');
    expect(a.ask).not.toHaveBeenCalled();
  });
  it('the spending request goes through the spending code', async () => {
    const parked = { id: 'pk', kind: 'request_question', state: 'PARKED', summary: 'x', payload: { request: { kind: 'spend', ref: 's-1', personUserId: null, firstName: 'Omar', what: 'x', thing: "Omar's request to spend KES 12,000 for fuel" }, question: 'Is there a cheaper supplier?' } };
    const a = anApprover({ parked });
    expect((await a.said('yes')).text).toContain('I have sent your question to Omar.');
    expect(a.askSpend).toHaveBeenCalledWith({ userId: 'u-wairimu', organizationId: 'org-1' }, 's-1', 'Is there a cheaper supplier?');
  });
  it('with two waiting and no name she is asked which; naming one says it back', async () => {
    const spend = [{ id: 's-1', firstName: 'Omar', amount: 12000, what: 'fuel', mayDecide: true }];
    expect((await anApprover({ spend }).said('question: who covers?')).text).toContain('Which one is your question about?');
    expect((await anApprover({ spend }).said('ask Omar about spending: is there a cheaper supplier?')).text).toContain('It is about Omar\'s request to spend KES 12,000 for fuel.');
  });
  it('a name nobody is waiting on is not read as this, and a question with nothing waiting says so', async () => {
    expect((await anApprover().said('question for Brian about his leave: why?')).lane).not.toBe('decide_a_request');
    expect((await anApprover({ waiting: [] }).said('question for Amina about her leave: why?')).text).toBe('Nothing is waiting for you to decide right now, so there is no request to ask a question about.');
  });
});
