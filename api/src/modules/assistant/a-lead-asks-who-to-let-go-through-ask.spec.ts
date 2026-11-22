import { AssistantService } from './assistant.service';
import { route } from './the-router-is-deterministic';

/**
 * DROP ACCESS, 22 NOVEMBER 2026: THE WHOLE WAY THROUGH ASK. Grace, who leads the freezer team, types the four questions into Ask. None is placed by the
 * rules ("unplaced"), the model reads each as a question, and each reaches the answer from the record (answerFromTheDocuments), which gives her the view
 * with its evidence. Mercy, on the team, asking the same, reaches the same answer and is given no judgement. The model is a stand-in that answers each
 * schema; the database is pretend; everything between is the real service.
 */
const ORG = 'o-drop';
const TEAM = [['p-amina', 'u-amina', 'Amina', 'Otieno'], ['p-brian', 'u-brian', 'Brian', 'Kip'], ['p-chloe', 'u-chloe', 'Chloe', 'Wanjiru'], ['p-dan', 'u-dan', 'Dan', 'Mwangi'], ['p-mercy', 'u-mercy', 'Mercy', 'Achieng']];
const PEOPLE: Record<string, any> = {
  grace: { id: 'pe-grace', externalId: 'x-grace', linkedUserId: 'u-grace', email: 'grace@drop.test', role: 'LEAD', active: true },
  mercy: { id: 'pe-mercy', externalId: 'x-mercy', linkedUserId: 'u-mercy', email: 'mercy@drop.test', role: 'MEMBER', active: true },
};
const THE_VIEW = {
  found: true,
  lead: 'From the record, Dan is the one to let go, because he has not answered any of his three check-ins, but the decision is yours.',
  points: ['Amina built a waitlist with names, and the proof shows it.', 'Mercy says she has a waitlist, but nothing shows it yet.'],
  judgesAPerson: true, aboutPerson: '',
};

function anAsk(as: 'grace' | 'mercy') {
  const me = PEOPLE[as];
  const reached: string[] = [];
  const known: Record<string, any> = {
    person: { findFirst: async ({ where }: any) => Object.values(PEOPLE).find((p) => (where?.id ? p.id === where.id : where?.externalId ? p.externalId === where.externalId : where?.linkedUserId ? p.linkedUserId === where.linkedUserId : false)) ?? null, findMany: async () => [] },
    organizationMembership: { findUnique: async ({ where }: any) => ({ role: Object.values(PEOPLE).find((p) => p.linkedUserId === where?.userId_organizationId?.userId)?.role ?? 'MEMBER' }), findMany: async () => [] },
    organization: { findUnique: async () => ({ id: ORG, name: 'Drop Access', personJudgementsOn: true }) },
    ground: { findMany: async ({ where }: any) => (where?.initiatorId && where.initiatorId !== 'u-grace' ? [] : [{ id: 'g-freezer', label: 'Freezer sales, November', initiatorId: 'u-grace', organizationId: ORG, cadence: null, participants: [] }]) },
    /* Where the asker takes part, for the reader's role: Grace runs the freezer check-in, Mercy is on it. */
    groundParticipant: { findMany: async ({ where }: any) => where?.OR ? (where.OR.some((o: any) => o.userId === 'u-grace') ? [{ groundId: 'g-freezer', partyType: 'INITIATOR' }] : [{ groundId: 'g-freezer', partyType: 'PARTICIPANT' }]) : TEAM.filter(([, u]) => !where?.userId || where.userId === u).map(([id, u, f]) => ({ id, userId: u, email: `${f.toLowerCase()}@drop.test`, nameGiven: null })) },
    user: { findMany: async ({ where }: any) => TEAM.filter(([, u]) => !where?.id?.in || where.id.in.includes(u)).map(([, u, f, l]) => ({ id: u, firstName: f, lastName: l })), findUnique: async () => null },
  };
  const prisma: any = new Proxy(known, { get: (t, k: string) => (k in t ? t[k] : k.startsWith('$') || k === 'then' ? undefined : { findMany: async () => [], findFirst: async () => null, findUnique: async () => null, count: async () => 0, create: async ({ data }: any) => data, createMany: async () => ({ count: 0 }), update: async () => ({}), updateMany: async () => ({ count: 0 }), upsert: async () => ({}), aggregate: async () => ({}), groupBy: async () => [] }) });
  const engine: any = {
    extract: jest.fn(async (_s: string, _h: any[], schema: any) => {
      reached.push(schema?.name);
      if (schema?.name === 'what_they_mean') return READ_AS ?? { kind: 'question', about: null, parts: 1 };
      if (schema?.name === 'answer_from_the_documents') return THE_VIEW;
      return null;
    }),
    respond: jest.fn(async () => { throw new Error('the stand-in writes nothing else'); }),
  };
  const service = new AssistantService(prisma, engine, { retrieve: jest.fn(async () => ({ cards: [] })) } as any, { whoNeedsYouThisWeek: jest.fn(async () => ({ buckets: [] })) } as any, {} as any, { pendingFor: async () => [] } as any, {} as any, {} as any, {} as any, {} as any, {} as any, { sessionReport: jest.fn(async () => ({ whatEachPersonSaid: [] })) } as any);
  return { ask: (m: string) => service.respond(ORG, me.id, m), reached };
}
const bodyOf = (r: any) => r.blocks.map((b: any) => b.body ?? '').join('\n');

let READ_AS: any = null;
const QUESTIONS = ['Who should I let go?', 'Who engaged and who didn\'t?', 'Who was creative?', 'Who earned the waitlist reward?'];

describe('a lead asks who to let go, through Ask, and is answered from the record', () => {
  it.each(QUESTIONS)('"%s" is placed by no rule, read as a question, and answered from the record for Grace', async (q) => {
    expect(route(q).lane).toBe('unplaced');
    const { ask, reached } = anAsk('grace');
    const r: any = await ask(q);
    console.log(`GRACE ASKS "${q}" IN ASK AND READS\n${bodyOf(r)}`);
    expect(reached).toContain('answer_from_the_documents');
    expect(r.lane).toBe('answer_from_documents');
    expect(bodyOf(r)).toContain('Dan is the one to let go');
  });

  it('Mercy, on the team, asking the same through Ask, is given no judgement', async () => {
    const { ask, reached } = anAsk('mercy');
    const r: any = await ask('Who should I let go?');
    console.log(`MERCY ASKS "Who should I let go?" IN ASK AND READS\n${bodyOf(r)}`);
    expect(reached).toContain('answer_from_the_documents');
    expect(bodyOf(r)).not.toMatch(/let go|Dan|waitlist/);
  });
});

/*
 * AND WHERE THE MODEL PLACES THE QUESTION ON ONE PERSON'S HISTORY (the guide's a_persons_history). That lane reads one person by name; with nobody named it
 * answered "I cannot find  in the check-ins you lead". A question about the team with nobody named, or about somebody she is not responsible for, is now
 * answered from the record, which judges only her people.
 */
describe('a team question the model places on one person\'s history is answered from the record', () => {
  afterEach(() => { READ_AS = null; });
  it.each([['question', 'a_persons_history'], ['wants', 'a_persons_history']])('read as %s on %s, Grace is still answered from the record', async (kind, guide) => {
    READ_AS = { kind, about: null, parts: 1, guide };
    const { ask, reached } = anAsk('grace');
    const r: any = await ask('Who should I let go?');
    console.log(`READ AS ${kind} ON ${guide}, GRACE READS\n${bodyOf(r)}`);
    expect(reached).toContain('answer_from_the_documents');
    expect(bodyOf(r)).toContain('Dan is the one to let go');
  });
});
