import { theRecordTheyMayRead, answerFromTheDocuments } from './a-question-is-answered-from-the-documents';
import { NOT_SHOWN_IN_THIS_ORGANISATION } from '../organisation/person-judgements';

/**
 * Polish round 1, 26 October 2026: Ask reads the record, a lead their team's and anybody else only their own.
 * 1 November 2026: what each person said is read from their conversations' assessments, through the one reader (theFactsOnRecord),
 * so a record line lost to a failed write no longer empties Ask. The same walls hold, and two more are pinned: a lead-only item never
 * reaches the person it is about, and what judges a person reaches a lead only while the person-judgements switch is on.
 */
const NOW = new Date('2026-10-19T09:00:00+03:00');
const people = [
  { id: 'p-kevin', groundId: 'g', userId: 'u-kevin', email: 'kevin@x.test', nameGiven: null },
  { id: 'p-joseph', groundId: 'g', userId: 'u-joseph', email: 'joseph@x.test', nameGiven: null },
  { id: 'p-grace', groundId: 'g', userId: 'u-grace', email: 'grace@x.test', nameGiven: null },
];
const users = [{ id: 'u-kevin', firstName: 'Kevin', lastName: 'Omondi' }, { id: 'u-joseph', firstName: 'Joseph', lastName: 'Kariuki' }, { id: 'u-grace', firstName: 'Grace', lastName: 'Wambui' }];
const item = (words: string, extra: Record<string, unknown> = {}, whoMaySee = 'the people in this check-in') => ({ id: words.slice(0, 8), words, from: [1], whoMaySee, saidWordForWord: true, ...extra });
const anAssessment = (participantId: string, who: string, endedAt: string, parts: Record<string, unknown>) => ({
  kind: 'assessment', version: 1,
  about: { checkInId: `c-${participantId}`, groundId: 'g', participantId, who, isTheLead: false, sessionNumber: 1, endedAt },
  summary: '', setup: null, comparedWithLastTime: {}, ...parts,
});
const checkIns = [
  { participantId: 'p-kevin', completedAt: new Date('2026-10-12T11:00:00Z'), sessionReport: anAssessment('p-kevin', 'Kevin Omondi', '2026-10-12T11:00:00Z', {
    claims: [item('Kilele Hotel paid for 40 units.', { proof: 'proved', proofIs: 'the M-Pesa message' })],
    observations: [item('I think it went fine.', { observed: 'vague answer', what: 'He did not say which units.' }, 'the lead only')],
  }) },
  { participantId: 'p-joseph', completedAt: new Date('2026-10-13T11:00:00Z'), sessionReport: anAssessment('p-joseph', 'Joseph Kariuki', '2026-10-13T11:00:00Z', {
    claims: [item('Mama Pima is a done deal, 15 units.', { proof: 'said' })],
  }) },
  /* Grace's setup: her words are message 1, said in setup; her first check-in's are message 2. */
  { participantId: 'p-grace', completedAt: new Date('2026-10-05T08:00:00Z'), sessionReport: anAssessment('p-grace', 'Grace Wambui', '2026-10-05T08:00:00Z', {
    messages: [{ n: 1, turnId: null, where: 'setup', at: null }, { n: 2, turnId: 't2', where: 'check-in', at: null }],
    setup: {
      objective: [item('Sell 120 water filters to offices by 15 December.')], success: [], team: [], timing: [], risks: [],
      rules: [item('A sale counts only when it is paid.')],
      privateNotes: [item('Kevin oversells, check his proof.', {}, 'the lead only')],
    },
    workUpdates: [{ ...item('I met the Bidco buyer myself.'), from: [2] }],
  }) },
];
function aPrisma(judgementsOn = true): any {
  return {
    organization: { findUnique: jest.fn(async () => ({ personJudgementsOn: judgementsOn })) },
    ground: { findMany: jest.fn(async ({ where }: any) => [{ id: 'g', label: 'Sales team, Q4', initiatorId: 'u-grace', cadence: 'WEEKLY', cadenceDays: [1, 4], cadenceAnchorDay: 1, workingDays: [1, 2, 3, 4, 5] }].filter((g) => where.OR.some((o: any) => o.initiatorId === g.initiatorId || (o.participants && people.some((p) => p.userId === o.participants.some.userId))))) },
    groundParticipant: { findMany: jest.fn(async ({ where }: any) => people.filter((p) => !where.userId || p.userId === where.userId).map((p) => ({ ...p }))) },
    user: { findMany: jest.fn(async ({ where }: any) => users.filter((u) => where.id.in.includes(u.id))) },
    checkIn: { findMany: jest.fn(async ({ where }: any) => checkIns.filter((c) => !where.participantId?.in || where.participantId.in.includes(c.participantId))) },
    workItem: { findMany: jest.fn(async ({ where }: any) => [
      { id: 'w1', kind: 'deal', name: 'Kilele Hotel', stage: null, fields: { Units: '40' }, ownerParticipantId: 'p-kevin' },
      { id: 'w2', kind: 'deal', name: 'Mama Pima', stage: null, fields: { Units: '15' }, ownerParticipantId: 'p-joseph' },
    ].filter((i) => !where.ownerParticipantId || where.ownerParticipantId.in.includes(i.ownerParticipantId))) },
    itemEvidence: { findMany: jest.fn(async () => [{ workItemId: 'w1', readAs: 'A payment' }]) },
  };
}

describe('Ask reads the record as each reader may', () => {
  it('Grace, who leads it, reads each person, what is proven and what is their word', async () => {
    const [doc] = await theRecordTheyMayRead(aPrisma(), { organizationId: 'o', userId: 'u-grace' }, NOW);
    expect(doc.fileName).toBe('the record of Sales team, Q4');
    expect(doc.content).toContain('PERSON: Kevin Omondi');
    expect(doc.content).toContain('Monday 12 October, Kevin Omondi said, claims, proven: Kilele Hotel paid for 40 units. (proof the M-Pesa message)');
    expect(doc.content).toContain('Tuesday 13 October, Joseph Kariuki said, claims, their word: Mama Pima is a done deal, 15 units.');
    expect(doc.content).toContain("- Kilele Hotel, Kevin Omondi's. Units 40. Proof on file: a payment.");
    expect(doc.content).toContain("- Mama Pima, Joseph Kariuki's. Units 15. No proof on file.");
  });
  it('Kevin reads only his own, never Joseph\'s, and his own lines say "you said"', async () => {
    const [doc] = await theRecordTheyMayRead(aPrisma(), { organizationId: 'o', userId: 'u-kevin' }, NOW);
    expect(doc.content).toContain('PERSON: Kevin Omondi (you)');
    expect(doc.content).toContain('Monday 12 October, you said, claims, proven: Kilele Hotel paid for 40 units.');
    expect(doc.content).not.toMatch(/Joseph|Mama Pima/);
  });
  /* Assessment test, 2 November: Ruth was told "you said you had spent most of last week building a dashboard", which Sarah said. */
  it('Grace never reads a member\'s words as her own: every line names who said it, and only her own say "you said"', async () => {
    const [doc] = await theRecordTheyMayRead(aPrisma(), { organizationId: 'o', userId: 'u-grace' }, NOW);
    const lines = doc.content.split('\n').filter((l) => l.startsWith('- ') && / said/.test(l));
    expect(lines.filter((l) => / you said/.test(l))).toEqual(lines.filter((l) => /I met the Bidco buyer|120 water filters|paid\.$|check his proof/.test(l)));
    expect(doc.content).not.toMatch(/you said[^\n]*(Kilele|Mama Pima)/);
  });
  it('Grace reads what she said in setup first, her private note included, and no member ever reads it', async () => {
    const [grace] = await theRecordTheyMayRead(aPrisma(), { organizationId: 'o', userId: 'u-grace' }, NOW);
    const setup = grace.content.slice(grace.content.indexOf('WHAT WAS SAID IN SETUP:'), grace.content.indexOf('PERSON:'));
    expect(setup).toContain('Monday 5 October, you said in setup, setup, objective, their word: Sell 120 water filters to offices by 15 December.');
    expect(setup).toContain('you said in setup, setup, rules, their word: A sale counts only when it is paid.');
    expect(setup).toContain('Kevin oversells, check his proof.');
    expect(setup).not.toContain('I met the Bidco buyer myself.');
    for (const member of ['u-kevin', 'u-joseph']) {
      const [doc] = await theRecordTheyMayRead(aPrisma(), { organizationId: 'o', userId: member }, NOW);
      expect(doc.content).not.toMatch(/SET ?UP|water filters|counts only when|oversells/i);
    }
  });
  /* Assessment test, 2 November: Ask said "the team checks in every Monday" of a check-in set to Monday and Thursday. */
  it('says how often people check in from the check-in itself, with its days', async () => {
    const [doc] = await theRecordTheyMayRead(aPrisma(), { organizationId: 'o', userId: 'u-kevin' }, NOW);
    expect(doc.content.split('\n')[0]).toBe('HOW OFTEN PEOPLE CHECK IN: twice a week, on Monday and Thursday.');
  });
  it('Kevin never reads what was noted about him for the lead', async () => {
    const [doc] = await theRecordTheyMayRead(aPrisma(), { organizationId: 'o', userId: 'u-kevin' }, NOW);
    expect(doc.content).toContain('Kilele Hotel paid for 40 units.');
    expect(doc.content).not.toContain('I think it went fine.');
  });
  it('Grace reads what judges a person only while the switch is on', async () => {
    const [on] = await theRecordTheyMayRead(aPrisma(true), { organizationId: 'o', userId: 'u-grace' }, NOW);
    expect(on.content).toContain('I think it went fine.');
    const [off] = await theRecordTheyMayRead(aPrisma(false), { organizationId: 'o', userId: 'u-grace' }, NOW);
    expect(off.content).not.toContain('I think it went fine.');
    /* What happened is still read: the switch holds back judgements, never the facts. */
    expect(off.content).toContain('Kilele Hotel paid for 40 units.');
  });
  it('a question that judges a named person is not answered while the switch is off', async () => {
    const engine = { extract: jest.fn(async () => ({ found: true, answer: 'Kevin is your best performer this month.', judgesAPerson: true })) };
    const prisma = aPrisma(false);
    prisma.groundDocument = { findMany: jest.fn(async () => []) };
    const groundsFor = prisma.ground.findMany;
    prisma.ground.findMany = jest.fn(async (a: any) => (await groundsFor(a)).map((g: any) => ({ ...g, participants: [] })));
    const said = await answerFromTheDocuments({ prisma, engine }, { organizationId: 'o', userId: 'u-grace', question: "Who's my best performer this month?" });
    expect(said).toBe(NOT_SHOWN_IN_THIS_ORGANISATION);
  });
});
