import { answerFromTheDocuments, theRecordTheyMayRead, ANSWER_FROM_THE_DOCUMENTS_PROMPT } from './a-question-is-answered-from-the-documents';

/**
 * RELEASE TEST, 22 NOVEMBER 2026, EVENING (N5). Wairimu runs "Sales team, Q4". At 13:53 she changed the team's goal to "Each person on the sales team builds a
 * waitlist of 15 shops by 31 December", session 3 had opened at 13:40 that day, and at about 14:10 she asked Ask "Who should I let go from the sales team?". The
 * answer read "all members have missed check-ins, which supports letting go any member of the team". Amani and Chidi had answered every session that had closed;
 * Juma and Neema had each missed one, session 2. The record Ask gave the model said "session 3 not answered" of everybody, gave no day for the goal, and no day for
 * today, and the rule it ran told it to recommend from that. The rows are the run's own (gw_sweep_final, as they stood at 14:10). The model is a stand-in: what is
 * proved is what it is given and what it is told.
 */
const ORG = 'o-msingi';
const WAIRIMU = 'u-wairimu';
const NOW = new Date('2026-11-22T11:10:00Z'); // 14:10 in Nairobi
const TEAM = [
  { id: 'p-wairimu', userId: WAIRIMU, first: 'Wairimu', last: 'Njoroge' },
  { id: 'p-amani', userId: 'u-amani', first: 'Amani', last: 'Wekesa' },
  { id: 'p-chidi', userId: 'u-chidi', first: 'Chidi', last: 'Okafor' },
  { id: 'p-juma', userId: 'u-juma', first: 'Juma', last: 'Otieno' },
  { id: 'p-neema', userId: 'u-neema', first: 'Neema', last: 'Mushi' },
];
const at = (s: string) => new Date(s);
const ROUNDS = [
  { participantId: 'p-wairimu', sessionNumber: 1, status: 'COMPLETED', availableFrom: at('2026-11-08T10:40:44Z'), createdAt: at('2026-11-08T10:40:44Z'), completedAt: at('2026-11-08T11:47:24Z') },
  { participantId: 'p-wairimu', sessionNumber: 2, status: 'COMPLETED', availableFrom: at('2026-11-15T10:40:44Z'), createdAt: at('2026-11-15T10:40:44Z'), completedAt: at('2026-11-15T11:47:24Z') },
  { participantId: 'p-wairimu', sessionNumber: 3, status: 'NOT_STARTED', availableFrom: at('2026-11-22T10:40:44Z'), createdAt: at('2026-11-22T10:40:44Z'), completedAt: null },
  ...['p-amani', 'p-chidi'].flatMap((p) => [
    { participantId: p, sessionNumber: 1, status: 'COMPLETED', availableFrom: at('2026-11-08T10:40:44Z'), createdAt: at('2026-11-08T10:40:44Z'), completedAt: at('2026-11-08T11:47:24Z') },
    { participantId: p, sessionNumber: 2, status: 'COMPLETED', availableFrom: at('2026-11-15T10:40:44Z'), createdAt: at('2026-11-15T10:40:44Z'), completedAt: at('2026-11-15T11:47:24Z') },
    { participantId: p, sessionNumber: 3, status: 'NOT_STARTED', availableFrom: at('2026-11-22T10:40:44Z'), createdAt: at('2026-11-22T10:40:44Z'), completedAt: null },
  ]),
  ...['p-juma', 'p-neema'].flatMap((p) => [
    { participantId: p, sessionNumber: 1, status: 'COMPLETED', availableFrom: at('2026-11-08T10:40:44Z'), createdAt: at('2026-11-08T10:40:44Z'), completedAt: at('2026-11-08T11:47:24Z') },
    { participantId: p, sessionNumber: 2, status: 'NOT_STARTED', availableFrom: at('2026-11-15T10:40:44Z'), createdAt: at('2026-11-15T10:40:44Z'), completedAt: null },
  ]),
];
const GOAL = { id: 'o-waitlist', name: 'Each person on the sales team builds a waitlist of 15 shops by 31 December', target: 15, count: 0, ownerParticipantId: null, setByParticipantId: 'p-wairimu', createdAt: at('2026-11-22T10:53:17Z') };

function theOrganisation() {
  const tables: Record<string, any> = {
    organization: { findUnique: async () => ({ personJudgementsOn: true }) },
    organizationMembership: { findMany: async () => [] },
    ground: { findMany: async ({ where }: any) => (where?.initiatorId === WAIRIMU || where?.OR?.some((o: any) => o.initiatorId === WAIRIMU) ? [{ id: 'g-sales', label: 'Sales team, Q4', initiatorId: WAIRIMU, cadence: null, participants: [] }] : []) },
    groundParticipant: { findMany: async ({ where }: any) => TEAM.filter((t) => !where?.userId || t.userId === where.userId).map((t) => ({ id: t.id, groundId: 'g-sales', userId: t.userId, email: `${t.first.toLowerCase()}@msingi.test`, nameGiven: null })) },
    user: { findMany: async ({ where }: any) => TEAM.filter((t) => !where?.id?.in || where.id.in.includes(t.userId)).map((t) => ({ id: t.userId, firstName: t.first, lastName: t.last })) },
    checkIn: { findMany: async ({ where }: any) => ROUNDS.filter((r) => !where?.participantId?.in || where.participantId.in.includes(r.participantId)) },
    groundObjective: { findMany: async () => [GOAL] },
    person: { findFirst: async () => null, findMany: async () => [] },
  };
  return new Proxy(tables, { get: (t, k: string) => t[k] ?? { findMany: async () => [], findFirst: async () => null, findUnique: async () => null, count: async () => 0 } });
}

describe('a new team is not judged on a session still open or a goal set this morning', () => {
  it('the record Wairimu is given says what day it is, that session 3 is still open, which sessions were missed, and the day the goal was set', async () => {
    const [record] = await theRecordTheyMayRead(theOrganisation(), { organizationId: ORG, userId: WAIRIMU }, NOW);
    console.log(`THE RECORD GIVEN FOR WAIRIMU\n${record.content}`);
    expect(record.content).toContain('TODAY IS Sunday 22 November.');
    expect(record.content).toMatch(/PERSON: Amani Wekesa\n- Their check-ins: session 1 answered on [^,]+, session 2 answered on [^,]+, session 3 still open since Sunday 22 November and not answered yet\./);
    expect(record.content).toMatch(/PERSON: Juma Otieno\n- Their check-ins: session 1 answered on [^,]+, session 2 not answered\./);
    expect(record.content).not.toContain('session 3 not answered');
    expect(record.content).toContain('- The team’s goal is “Each person on the sales team builds a waitlist of 15 shops by 31 December”. It was set on Sunday 22 November.');
  });

  it('the rule the model runs says plainly when the record is too thin to judge, what it shows, and what would make it judgeable, and by when', () => {
    expect(ANSWER_FROM_THE_DOCUMENTS_PROMPT).toContain('A session the record says is still open is not missed. One miss is one instance, not a pattern.');
    expect(ANSWER_FROM_THE_DOCUMENTS_PROMPT).toContain('A person is judged only on sessions that have closed, and against a goal only for the time they have had since the day it was set.');
    expect(ANSWER_FROM_THE_DOCUMENTS_PROMPT).toContain('When the record is too thin to judge anybody yet, as with a goal set days ago, a team with few closed sessions, or a miss with nothing else behind it, say that plainly first. Then say what the record does show, person by person, with each instance and its day, and what would make it possible to judge, and by when');
    expect(ANSWER_FROM_THE_DOCUMENTS_PROMPT).toContain('Do not recommend letting anybody go on a record that thin.');
    /* The lane stays open: a lead may still hear a plain recommendation, with the plain word, where the record carries it. */
    expect(ANSWER_FROM_THE_DOCUMENTS_PROMPT).toContain('If the record supports letting somebody go, say "let go", "fire" or "exit" as the person asked, never a softer word.');
  });

  it('asked "Who should I let go from the sales team?", the model is given that record and that rule, and her answer reaches her', async () => {
    const calls: { system: string; user: string }[] = [];
    const THIN = {
      found: true,
      lead: 'The record is too thin to judge anybody on the sales team yet: the goal was set today, and session 3 only opened today.',
      points: [
        'Amani Wekesa and Chidi Okafor answered sessions 1 and 2, on 8 and 15 November.',
        'Juma Otieno and Neema Mushi answered session 1 on 8 November and missed session 2, which is one miss each.',
        'Once session 3 and session 4 have closed, you can judge each person on the waitlist goal and on whether they keep checking in.',
      ],
      judgesAPerson: true, aboutPeople: ['Amani Wekesa', 'Chidi Okafor', 'Juma Otieno', 'Neema Mushi'],
    };
    const engine = { extract: jest.fn(async (system: string, h: any[]) => { calls.push({ system, user: h[0].content }); return THIN; }) };
    const said = await answerFromTheDocuments({ prisma: theOrganisation(), engine }, { organizationId: ORG, userId: WAIRIMU, question: 'Who should I let go from the sales team?' });
    console.log(`WAIRIMU ASKS "Who should I let go from the sales team?" AND READS\n${said}`);
    expect(engine.extract).toHaveBeenCalledTimes(1);
    expect(calls[0].system).toBe(ANSWER_FROM_THE_DOCUMENTS_PROMPT);
    expect(calls[0].user).toContain('session 3 still open since Sunday 22 November and not answered yet');
    expect(calls[0].user).toContain('It was set on Sunday 22 November.');
    expect(calls[0].user).not.toContain('session 3 not answered');
    expect(said).toContain('The record is too thin to judge anybody on the sales team yet');
  });
});
