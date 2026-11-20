import { thePartsFrom, withWhomEachItemIsAbout, whoMaySee, THE_LEAD_AND_WHOM_IT_IS_ABOUT, everyItemIn } from './the-assessment';
import { theFactsIn } from './the-facts-on-record';
import { theRecordLinesIn } from './the-record-from-the-assessment';
import { mayReadTheLine, theLinesThisReaderMayRead, EVERYBODY, THE_LEAD, thePerson } from './who-may-read-a-line';
import { theRecordTheyMayRead } from '../assistant/a-question-is-answered-from-the-documents';
import { whomTheLineNames, theAssessmentWithWhomEachItemNames } from '../../../scripts/the-leads-lines-about-a-named-person';

/**
 * WHAT A LEAD SAYS ABOUT A NAMED PERSON STAYS BETWEEN HER AND THAT PERSON (Hafsah, batch 2, item 1). The staging case of 4 November:
 * Stella, who leads the check-in, said in setup "remy Rep has sold 5 units this month", and Rita read it on the shared team report.
 * Stella and Remy read it; Rita never does, in every reader. And something about a person's wellbeing ("My mum is in hospital") is
 * never a work line: not on a record line, the lead's facts, a report or Ask.
 */
const STELLA = 'p-stella';
const REMY = 'p-remy';
const RITA = 'p-rita';
const SAID = 'remy Rep has sold 5 units this month';
const HERS = 'We have sold 14 of the 60 units so far';
const NOW = new Date('2026-11-05T09:00:00Z');

/* What the read gives back for Stella's update in setup, exactly as the model would: the line about Remy names him. */
const said = new Map<number, string>([[1, `${SAID}. ${HERS}.`]]);
const stellasRead = thePartsFrom({
  summary: 'Stella gave where things stand.',
  nothingToRecord: [],
  numbers: [
    { words: SAID, from: [1], figure: '5', measures: 'units sold this month', aboutWhom: 'remy Rep' },
    { words: HERS, from: [1], figure: '14', measures: 'units sold so far' },
  ],
}, said, { hasSetup: false, previous: null, givenRole: null, read: 1, isTheLead: true });
const stellas = {
  kind: 'assessment', version: 1,
  about: { checkInId: 'c-stella', groundId: 'g', participantId: STELLA, who: 'Stella Lead', isTheLead: true, sessionNumber: 1, endedAt: '2026-11-04T08:00:00Z' },
  messages: [{ n: 1, turnId: 't1', where: 'check-in', at: null, saidInSetup: true }],
  ...withWhomEachItemIsAbout(stellasRead, (name) => (name.toLowerCase() === 'remy rep' ? REMY : null)),
} as any;

/* Rita's first check-in: a work line, and something wrong at home. */
const ritaSaid = new Map<number, string>([[1, 'I called Naivas Sarit today.'], [2, 'My mum is in hospital.']]);
const ritasRead = thePartsFrom({
  summary: 'Rita called Naivas.',
  nothingToRecord: [],
  workUpdates: [{ words: 'I called Naivas Sarit today.', from: [1], work: 'Naivas Sarit' }],
  everythingElse: [{ words: 'My mum is in hospital.', from: [2], wellbeing: true, what: 'Her mother is in hospital.' }],
}, ritaSaid, { hasSetup: false, previous: null, givenRole: null, read: 1, isTheLead: false });
const ritas = {
  kind: 'assessment', version: 1,
  about: { checkInId: 'c-rita', groundId: 'g', participantId: RITA, who: 'Rita Rep', isTheLead: false, sessionNumber: 1, endedAt: '2026-11-04T10:00:00Z' },
  messages: [{ n: 1, turnId: 'r1', where: 'check-in', at: null }, { n: 2, turnId: 'r2', where: 'check-in', at: null }],
  ...ritasRead,
} as any;

describe('who may see an item is decided by what it is and whom it is about', () => {
  it('the lead\'s line about Remy is for the lead and Remy; her line about the team stays shared', () => {
    const [aboutRemy, aboutTheTeam] = stellas.numbers;
    expect(aboutRemy).toMatchObject({ whoMaySee: THE_LEAD_AND_WHOM_IT_IS_ABOUT, aboutParticipantId: REMY });
    expect(aboutTheTeam.whoMaySee).toBe('the people in this check-in');
  });
  it('a team member naming a colleague is still said in the check-in, as the rules allow', () => {
    expect(whoMaySee('numbers', { aboutWhom: 'Remy' }, false)).toBe('the people in this check-in');
  });
  it('a name nobody on the check-in has stays with the lead alone', () => {
    const parts = withWhomEachItemIsAbout(thePartsFrom({ summary: '', nothingToRecord: [], numbers: [{ words: SAID, from: [1], aboutWhom: 'Someone Else' }] }, said, { hasSetup: false, previous: null, givenRole: null, read: 1, isTheLead: true }), () => null);
    const [i] = everyItemIn(parts);
    expect(i.whoMaySee).toBe(THE_LEAD_AND_WHOM_IT_IS_ABOUT);
    expect(i.aboutParticipantId).toBeNull();
    expect(theRecordLinesIn({ ...stellas, ...parts } as any, () => true).map((l) => l.text)).not.toContain(SAID);
  });
  it('wellbeing is the person\'s alone, whatever section it was read into', () => {
    expect(ritas.everythingElse[0].whoMaySee).toBe('the person only');
    expect(whoMaySee('blockers', { wellbeing: true }, true)).toBe('the person only');
  });
});

describe('the facts every page reads, for each reader', () => {
  const words = (reader: any) => [...theFactsIn(stellas, reader), ...theFactsIn(ritas, reader)].map((f) => f.words);
  it('Stella, who leads it, reads her line about Remy', () => {
    expect(words({ kind: 'the lead', judgements: true })).toContain(SAID);
  });
  it('Remy reads it, with who said it and whom it is about', () => {
    const f = theFactsIn(stellas, { kind: 'the person', participantId: REMY });
    expect(f.map((x) => x.words)).toEqual([SAID]);
    expect(f[0]).toMatchObject({ participantId: STELLA, aboutParticipantId: REMY, who: 'Stella Lead' });
  });
  it('Rita never reads it, as herself or in what is shared with everybody', () => {
    expect(words({ kind: 'the person', participantId: RITA })).not.toContain(SAID);
    expect(words({ kind: 'everybody in the check-in' })).not.toContain(SAID);
    expect(words({ kind: 'everybody in the check-in' })).toContain(HERS);
  });
  it('"My mum is in hospital" is read by Rita alone: never the lead, never everybody', () => {
    expect(words({ kind: 'the person', participantId: RITA })).toContain('My mum is in hospital.');
    expect(words({ kind: 'the lead', judgements: true })).not.toContain('My mum is in hospital.');
    expect(words({ kind: 'everybody in the check-in' })).not.toContain('My mum is in hospital.');
  });
});

describe('the record\'s lines carry whom they are about, and every reader of colleagues\' lines takes the one rule', () => {
  const stellasLines = theRecordLinesIn(stellas, () => true);
  const ritasLines = theRecordLinesIn(ritas, () => true);
  it('the line about Remy carries his id; her own line carries none', () => {
    expect(stellasLines.find((l) => l.text === SAID)?.aboutParticipantId).toBe(REMY);
    expect(stellasLines.find((l) => l.text === HERS)?.aboutParticipantId).toBeNull();
  });
  it('distress is never a line, so never a board line, a report line or Today', () => {
    expect(ritasLines.map((l) => l.text)).toEqual(['I called Naivas Sarit today.']);
  });
  it('the team report, the team\'s picture and a colleague\'s check-in leave it out; Stella and Remy keep it', () => {
    const row = { participantId: STELLA, aboutParticipantId: REMY, text: SAID };
    expect(mayReadTheLine(row, EVERYBODY)).toBe(false);
    expect(mayReadTheLine(row, thePerson(RITA))).toBe(false);
    expect(mayReadTheLine(row, thePerson(REMY))).toBe(true);
    expect(mayReadTheLine(row, thePerson(STELLA))).toBe(true);
    expect(mayReadTheLine(row, THE_LEAD)).toBe(true);
    expect(theLinesThisReaderMayRead(thePerson(RITA), 'EVERYBODY')).toEqual({ NOT: [{ standing: { not: null, equals: 'cannot be true' } }, { aboutParticipantId: { not: null, notIn: [RITA] }, participantId: { not: RITA } }] });
    expect(theLinesThisReaderMayRead(THE_LEAD, 'THEIR_OWN')).toEqual({});
  });
});

describe('Ask, as Stella, Remy and Rita', () => {
  const people = [
    { id: STELLA, groundId: 'g', userId: 'u-stella', email: 'stella@x.test', nameGiven: null },
    { id: REMY, groundId: 'g', userId: 'u-remy', email: 'remy@x.test', nameGiven: null },
    { id: RITA, groundId: 'g', userId: 'u-rita', email: 'rita@x.test', nameGiven: null },
  ];
  const users = [{ id: 'u-stella', firstName: 'Stella', lastName: 'Lead' }, { id: 'u-remy', firstName: 'Remy', lastName: 'Rep' }, { id: 'u-rita', firstName: 'Rita', lastName: 'Rep' }];
  const checkIns = [
    { participantId: STELLA, completedAt: new Date('2026-11-04T08:00:00Z'), sessionReport: stellas },
    { participantId: RITA, completedAt: new Date('2026-11-04T10:00:00Z'), sessionReport: ritas },
  ];
  const prisma: any = {
    organization: { findUnique: jest.fn(async () => ({ personJudgementsOn: true })) },
    ground: { findMany: jest.fn(async () => [{ id: 'g', label: 'Sales updates', initiatorId: 'u-stella', cadence: null }]), findUnique: jest.fn(async () => ({ whoSeesTargets: 'THEIR_OWN' })) },
    groundParticipant: { findMany: jest.fn(async ({ where }: any) => people.filter((p) => !where.userId || p.userId === where.userId).map((p) => ({ ...p }))) },
    user: { findMany: jest.fn(async ({ where }: any) => users.filter((u) => where.id.in.includes(u.id))) },
    checkIn: { findMany: jest.fn(async ({ where }: any) => checkIns.filter((c) => !where.participantId?.in || where.participantId.in.includes(c.participantId))) },
    workItem: { findMany: jest.fn(async () => []) },
    itemEvidence: { findMany: jest.fn(async () => []) },
  };
  const read = async (userId: string) => (await theRecordTheyMayRead(prisma, { organizationId: 'o', userId }, NOW)).map((d) => d.content).join('\n');
  it('Stella reads it', async () => expect(await read('u-stella')).toContain(SAID));
  it('Remy reads it, said by Stella', async () => expect(await read('u-remy')).toMatch(new RegExp(`Stella Lead said[^\\n]*${SAID}`)));
  it('Rita never reads it, nor Stella\'s', async () => {
    const rita = await read('u-rita');
    expect(rita).not.toContain(SAID);
    expect(rita).toContain('My mum is in hospital.');
  });
  it('Stella never reads Rita\'s "My mum is in hospital"', async () => expect(await read('u-stella')).not.toContain('hospital'));
});

describe('the one-time script reads the lines already written', () => {
  const others = [{ id: REMY, names: ['Remy Rep', 'Remy'] }, { id: RITA, names: ['Rita Rep', 'Rita'] }];
  it('a line naming Remy is about Remy; one naming both stays with the lead; one naming nobody is left', () => {
    expect(whomTheLineNames('Stella said remy Rep has sold 5 units this month', STELLA, others)).toBe(REMY);
    expect(whomTheLineNames('Remy and Rita are behind', STELLA, others)).toBe(STELLA);
    expect(whomTheLineNames(HERS, STELLA, others)).toBeNull();
  });
  it('her stored assessment is read the same way, and a second run changes nothing', () => {
    const before = { ...stellas, numbers: stellas.numbers.map((i: any) => ({ ...i, whoMaySee: 'the people in this check-in', aboutParticipantId: undefined })) };
    const after = theAssessmentWithWhomEachItemNames(before, STELLA, others) as any;
    expect(after.numbers[0]).toMatchObject({ whoMaySee: THE_LEAD_AND_WHOM_IT_IS_ABOUT, aboutParticipantId: REMY });
    expect(after.numbers[1].whoMaySee).toBe('the people in this check-in');
    expect(theAssessmentWithWhomEachItemNames(after, STELLA, others)).toBeNull();
  });
});
