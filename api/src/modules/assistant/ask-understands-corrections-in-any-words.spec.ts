import { AssistantService } from './assistant.service';
import { WhatIsTrueService } from './what-is-true.service';
import { whatTheModelSaid } from './ask-understands-with-the-model';
import { theVerdictMadeSafe, type WhatTheRecordHolds } from './a-correction-is-checked-like-a-claim';

/**
 * CORRECTIONS IN ANY WORDS (fix plan, pattern 2; quarter test, 30 November). Brian wrote in Ask "I have raised two fee notes this month."
 * and Peter "It says 4 of my check-ins were specific out of 6, but it should be 4 out of 14"; both read "I cannot answer that one yet".
 * The whole pattern: a correction that does not use the words a rule expects is shrugged at, and a backed one changes nothing.
 */
const ORG = 'org-mu';
const SHRUG = /^I cannot answer that one yet/;

function anAsk(said: { kind: string; lane?: string }, verdict: any) {
  const updates: any[] = [];
  const prisma: any = {
    person: { findFirst: jest.fn(async () => ({ externalId: null, linkedUserId: 'u-brian', email: 'brian@muchemi.test' })) },
    user: { findUnique: jest.fn(async () => ({ firstName: 'Brian' })), findFirst: jest.fn(async () => ({ id: 'u-brian' })) },
    organizationMembership: { findFirst: jest.fn(async () => ({ userId: 'u-brian' })) },
    groundParticipant: { findMany: jest.fn(async () => [{ id: 'p-brian', groundId: 'g-lit', ground: { id: 'g-lit', label: 'Litigation team daily', organizationId: ORG, kindOfWork: 'a law firm matter', workStages: null } }]) },
    groundCommitment: {
      findMany: jest.fn(async ({ where }: any) => (where?.id ? [{ id: 'c-fn' }] : [{ id: 'c-fn', groundId: 'g-lit', participantId: 'p-brian', text: 'I will raise the fee notes for the Kasarani filings', whenSaid: 'this month', status: 'UNKNOWN', createdAt: new Date('2026-11-02T08:00:00Z') }])),
      update: jest.fn(async (a: any) => { updates.push(['commitment', a]); return a; }),
    },
    personObjective: { findMany: jest.fn(async () => []), update: jest.fn(async (a: any) => { updates.push(['todo', a]); return a; }) },
    recordEntry: { findMany: jest.fn(async () => []), update: jest.fn(async (a: any) => { updates.push(['line', a]); return a; }), updateMany: jest.fn(async () => ({ count: 0 })) },
    groundObjective: { findMany: jest.fn(async () => []) },
    conversationTurn: { findMany: jest.fn(async () => []) },
    checkIn: { findMany: jest.fn(async () => []) },
    assistantProposal: { findFirst: jest.fn(async () => null), create: jest.fn(async ({ data }: any) => ({ id: 'pr', ...data })) },
    assistantTurn: { count: jest.fn(async () => 0), createMany: jest.fn(async () => ({ count: 2 })) },
    knowledgeCard: { findMany: jest.fn(async () => []) },
    subject: { findMany: jest.fn(async () => []) },
    organization: { findUnique: jest.fn(async () => ({ name: 'Muchemi & Co', release1SalesBoardOn: false })) },
  };
  const engine: any = {
    extract: jest.fn(async (_system: string, _messages: any[], tool: any) => {
      if (tool?.name === 'what_they_mean') return { kind: said.kind, lane: said.lane ?? 'none', about: 'fee notes' };
      if (tool?.name === 'the_correction_checked') return verdict;
      return null;
    }),
    respond: jest.fn(async () => { throw new Error('model off'); }),
  };
  const service = new AssistantService(
    prisma, engine, { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) } as any,
    { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }), whoNeedsYouThisWeek: async () => ({ buckets: [] }) } as any,
    {} as any, { pendingFor: async () => [] } as any, {} as any,
    new WhatIsTrueService(prisma), {} as any, {} as any, {} as any,
  );
  const ask = async (q: string) => ((await service.respond(ORG, 'person-brian', q)) as any).blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n');
  return { ask, updates };
}

describe('a correction in any words is checked like a claim', () => {
  it('Brian’s "I have raised two fee notes this month." is asked for its proof, not shrugged at, and nothing changes yet', async () => {
    const reply = 'You said you raised two fee notes this month, but nothing on your record shows them yet. Could you add the two fee notes, or the email you sent them with? Once they are in, I will put it right.';
    const { ask, updates } = anAsk({ kind: 'correction' }, { verdict: 'needs_proof', reply, promiseId: 'c-fn', promiseIs: 'DONE' });
    const said = await ask('I have raised two fee notes this month.');
    expect(said).not.toMatch(SHRUG);
    expect(said).toBe(reply);
    expect(updates).toEqual([]);
  });

  it('a backed correction changes the promise itself, so every page reads it as done', async () => {
    const { ask, updates } = anAsk({ kind: 'correction' }, { verdict: 'backed', reply: 'You are right. Your fee notes for the Kasarani filings are on your record now, so that promise is marked done.', promiseId: 'c-fn', promiseIs: 'DONE' });
    await ask('That is wrong, I raised the Kasarani fee notes on Monday and the document is on the check-in.');
    expect(updates).toEqual([['commitment', expect.objectContaining({ where: { id: 'c-fn' }, data: expect.objectContaining({ status: 'DONE', settledBy: 'SAID' }) })]]);
  });

  it('the model can never pick a lane that writes, approves or sends: it picks no lane at all (1 November 2026)', () => {
    for (const lane of ['ask_to_spend', 'ask_for_leave', 'decide_a_request', 'add_a_to_do', 'tick_off_a_to_do', 'lead_note', 'log_hours', 'start_a_check_in', 'what_is_due', 'what_you_can_see']) {
      const read = whatTheModelSaid({ kind: 'question', lane }) as any;
      expect(read).toEqual({ kind: 'question', about: null });
      expect('lane' in read).toBe(false);
    }
  });

  it('only an id the check was handed can change, and only on "backed"', () => {
    const record: WhatTheRecordHolds = { firstName: 'Peter', promises: [{ id: 'c1', table: 'commitment', text: 'call Upper Hill', status: 'UNKNOWN', checkIn: 'Sales team, Q4', madeOn: 'Monday 12 October' }], lines: [], numbers: [], documents: [] };
    expect(theVerdictMadeSafe({ verdict: 'backed', reply: 'Done.', promiseId: 'c-other', promiseIs: 'DONE' }, record)?.promise).toBeNull();
    expect(theVerdictMadeSafe({ verdict: 'needs_proof', reply: 'Could you add it?', promiseId: 'c1', promiseIs: 'DONE' }, record)?.promise).toBeNull();
    expect(theVerdictMadeSafe({ verdict: 'backed', reply: 'Done.', promiseId: 'c1', promiseIs: 'DONE' }, record)?.promise).toEqual({ id: 'c1', nowIs: 'DONE' });
  });
});
