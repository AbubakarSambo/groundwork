import { answerFromTheDocuments, theRecordTheyMayRead, ANSWER_FROM_THE_DOCUMENTS_PROMPT } from './a-question-is-answered-from-the-documents';

/**
 * DROP ACCESS, 22 NOVEMBER 2026, BY HAFSAH'S RULE OF 21 NOVEMBER (O-15): Ask may judge performance, with the evidence, only about the people the asker is
 * responsible for. Grace leads the freezer team of five. She asks "who should I let go?", "who engaged and who didn't?", "who was creative?" and "who earned the
 * waitlist reward?", and Ask used to answer "I do not give a view on one person's performance". Now she is answered from the one record: each person's check-ins
 * with their days, what they said and what the proof shows, quiet as a pattern, and a plain recommendation that is hers to make. Mercy, on the team, asking the
 * same, is given no judgement, whatever the model writes. The model is a stand-in here: what is proved is what it is given and what reaches each reader.
 */
const ORG = 'o-drop';
const GRACE = 'u-grace';
const TEAM = [
  { id: 'p-amina', userId: 'u-amina', first: 'Amina', last: 'Otieno' },
  { id: 'p-brian', userId: 'u-brian', first: 'Brian', last: 'Kip' },
  { id: 'p-chloe', userId: 'u-chloe', first: 'Chloe', last: 'Wanjiru' },
  { id: 'p-dan', userId: 'u-dan', first: 'Dan', last: 'Mwangi' },
  { id: 'p-mercy', userId: 'u-mercy', first: 'Mercy', last: 'Achieng' },
];
const day = (d: number) => new Date(Date.UTC(2026, 10, d, 15));
/* Amina builds a waitlist with names; Brian is creative, with pre-orders; Chloe is vague; Dan does nothing; Mercy claims a waitlist with no proof. */
const ROUNDS = [
  ...[2, 9, 16].map((d, i) => ({ participantId: 'p-amina', sessionNumber: i + 1, status: 'COMPLETED', completedAt: day(d) })),
  ...[2, 9, 16].map((d, i) => ({ participantId: 'p-brian', sessionNumber: i + 1, status: 'COMPLETED', completedAt: day(d) })),
  { participantId: 'p-chloe', sessionNumber: 1, status: 'COMPLETED', completedAt: day(2) }, { participantId: 'p-chloe', sessionNumber: 2, status: 'NOT_STARTED', completedAt: null }, { participantId: 'p-chloe', sessionNumber: 3, status: 'COMPLETED', completedAt: day(16) },
  { participantId: 'p-dan', sessionNumber: 1, status: 'NOT_STARTED', completedAt: null }, { participantId: 'p-dan', sessionNumber: 2, status: 'NOT_STARTED', completedAt: null }, { participantId: 'p-dan', sessionNumber: 3, status: 'NOT_STARTED', completedAt: null },
  ...[2, 9, 16].map((d, i) => ({ participantId: 'p-mercy', sessionNumber: i + 1, status: 'COMPLETED', completedAt: day(d) })),
];

function theOrganisation() {
  const tables: Record<string, any> = {
    organization: { findUnique: async () => ({ personJudgementsOn: true }) },
    organizationMembership: { findMany: async () => [] },
    ground: { findMany: async ({ where }: any) => (where?.initiatorId === GRACE || where?.OR?.some((o: any) => o.initiatorId === GRACE || o.participants?.some?.userId === 'u-mercy') ? [{ id: 'g-freezer', label: 'Freezer sales, November', initiatorId: GRACE, cadence: null, participants: [] }] : []) },
    groundParticipant: { findMany: async ({ where }: any) => TEAM.filter((t) => !where?.userId || t.userId === where.userId).map((t) => ({ id: t.id, userId: t.userId, email: `${t.first.toLowerCase()}@drop.test`, nameGiven: null })) },
    user: { findMany: async ({ where }: any) => TEAM.filter((t) => !where?.id?.in || where.id.in.includes(t.userId)).map((t) => ({ id: t.userId, firstName: t.first, lastName: t.last })) },
    checkIn: { findMany: async ({ where }: any) => ROUNDS.filter((r) => !where?.participantId?.in || where.participantId.in.includes(r.participantId)) },
    person: { findFirst: async () => null, findMany: async () => [] },
  };
  return new Proxy(tables, { get: (t, k: string) => t[k] ?? { findMany: async () => [], findFirst: async () => null, findUnique: async () => null, count: async () => 0 } });
}

/* What a good answer to Grace looks like, as the model would write it from that record. A stand-in: the real wording is the model's. */
const TO_GRACE = {
  found: true,
  lead: 'From the record, Dan is the one to let go, because he has not answered any of his three check-ins, on 2, 9 and 16 November, but the decision is yours.',
  points: [
    'Amina answered every check-in, on 2, 9 and 16 November, and built a waitlist with names, which the proof shows.',
    'Brian answered every check-in and was the creative one: he took pre-orders, and the proof shows them.',
    'Chloe missed her check-in of 9 November and was vague on 2 and 16 November, with nothing specific to show.',
    'Mercy says she has a waitlist, but nothing shows it yet, so it is her word and it does not earn the reward.',
  ],
  judgesAPerson: true, aboutPeople: [],
};

describe('a lead hears who to let go, from the record, about the people she leads', () => {
  it('the record Grace is given names each person\'s check-ins with their days, and the ones not answered', async () => {
    const [record] = await theRecordTheyMayRead(theOrganisation(), { organizationId: ORG, userId: GRACE });
    console.log(`THE RECORD GIVEN FOR GRACE\n${record.content}`);
    expect(record.content).toContain('PERSON: Dan Mwangi\n- Their check-ins: session 1 not answered, session 2 not answered, session 3 not answered.');
    expect(record.content).toMatch(/PERSON: Chloe Wanjiru\n- Their check-ins: session 1 answered on [^,]+2 November[^,]*, session 2 not answered, session 3 answered on [^.]+16 November/);
  });

  it('the rule the model runs gives a plain recommendation that is the lead\'s, trusts only proof, and names quiet as a pattern', () => {
    expect(ANSWER_FROM_THE_DOCUMENTS_PROMPT).toContain('If the record supports letting somebody go, say "let go", "fire" or "exit" as the person asked, never a softer word. Say that the decision is theirs to make.');
    expect(ANSWER_FROM_THE_DOCUMENTS_PROMPT).toContain('a claim with nothing to show it is their word, so say plainly that it has no proof, and never count it as done');
    expect(ANSWER_FROM_THE_DOCUMENTS_PROMPT).toContain('Saying nothing, missing check-ins, or answering without anything specific is a pattern too: name each time it happened, with the day.');
    expect(ANSWER_FROM_THE_DOCUMENTS_PROMPT).not.toMatch(/say that you do not give a view on one person's performance/);
  });

  it.each(['Who should I let go?', 'Who engaged and who didn\'t?', 'Who was creative?', 'Who earned the waitlist reward?'])('Grace asks "%s" and is answered with the view and its evidence', async (question) => {
    const given: string[] = [];
    const engine = { extract: jest.fn(async (_s: string, h: any[]) => { given.push(h[0].content); return TO_GRACE; }) };
    const said = await answerFromTheDocuments({ prisma: theOrganisation(), engine }, { organizationId: ORG, userId: GRACE, question });
    console.log(`GRACE ASKS "${question}" AND READS\n${said}`);
    expect(said).toContain('Dan is the one to let go');
    expect(said).toContain('but the decision is yours.');
    expect(engine.extract).toHaveBeenCalledTimes(1);
    expect(given[0]).toContain('These people report to you, are in a check-in you run, or are the team you named: ');
    for (const t of TEAM) expect(given[0]).toContain(`${t.first} ${t.last}`);
  });

  it('Mercy, on the team, asking the same, is given no judgement of anybody, whatever the model writes', async () => {
    const stubborn = { extract: jest.fn(async () => TO_GRACE) };
    const said = await answerFromTheDocuments({ prisma: theOrganisation(), engine: stubborn }, { organizationId: ORG, userId: 'u-mercy', question: 'Who should I let go?' });
    console.log(`MERCY ASKS "Who should I let go?" AND READS\n${said}`);
    expect(said).not.toMatch(/let go|Dan|creative|waitlist/);
    expect(said).toBe('I do not give a view on how people are doing, because they do not report to you and are not in a check-in you run. I can tell you what each person said, what is proven and what is still open.');
    expect((stubborn.extract.mock.calls as any[])[1][1][0].content).toContain('These people are not ones you are responsible for. Give no view of how any of them is doing');
  });
});
