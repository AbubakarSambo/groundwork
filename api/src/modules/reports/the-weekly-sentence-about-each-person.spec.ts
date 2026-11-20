import { NotFoundException } from '@nestjs/common';
import { TheWeeklyReportService, NOTHING_YET_THIS_WEEK } from './the-weekly-report.service';
import { theSentenceAbout, theSentenceIsSafe, theWeekOf, thingsNamedIn } from './the-weekly-sentence-about-each-person';

/**
 * WEEK 12B: WHAT PEOPLE SAID IN THE WEEK, IN ONE SENTENCE EACH (decisions 11, 38, 40, 43).
 * Checked as each reader reads it, not only as the draft is written.
 * 1 November 2026: the sentence quotes what they said, read from their assessments through the one reader; it used to count and
 * name ("named Green Mart and gave a next step and a date"). The walls are unchanged: stored without names, the lead reads every
 * sentence, a person only their own, and an item noted for the lead never reaches it.
 */

const L = 'Participant A';
/* Typed word for word unless said otherwise: only those are quoted (batch 2, group 3, their-words-as-said.ts). */
const line = (text: string, type = 'PROGRESS', documented = false, saidWordForWord = true) => ({ text, type, documented, saidWordForWord });

describe('the sentence about one person', () => {
  /* What they said this week, in their own words, from their assessments (1 November 2026). It used to count and name. */
  it('says what they said, in their words, the most telling first', () => {
    const s = theSentenceAbout({ label: L, checkedIn: true, lines: [
      line('I met Green Mart and they want a quote.', 'workUpdates'),
      line('I will send the quote on Friday.', 'promises'),
      line('Green Mart owes KES 380,000.', 'numbers'),
    ] })!;
    expect(s).toBe('This week Participant A said “Green Mart owes KES 380,000” and “I will send the quote on Friday”. One more thing Participant A said is on the record.');
  });

  /* Batch 2, group 3 (round 50): a reworded line is never shown in quotation marks as theirs. */
  it('says a line they did not type word for word plainly, with no quotation marks', () => {
    const s = theSentenceAbout({ label: L, checkedIn: true, lines: [line("I've promised to send the draft to Wanjiru by Wednesday, 4 November.", 'promises', false, false)] })!;
    expect(s).toBe("This week Participant A said I've promised to send the draft to Wanjiru by Wednesday, 4 November.");
    expect(s).not.toMatch(/[“”"]/);
  });

  it('says one thing as one quotation, with nothing about how many more', () => {
    const s = theSentenceAbout({ label: L, checkedIn: true, lines: [line('It was a busy week with lots of calls.', 'everythingElse')] })!;
    expect(s).toBe('This week Participant A said “It was a busy week with lots of calls”.');
  });

  it('says somebody who checked in and said nothing on the record so, and gives no label', () => {
    expect(theSentenceAbout({ label: L, checkedIn: true, lines: [] })).toBe('Participant A checked in this week, and nothing Participant A said is on the record yet.');
  });

  it('says proof is behind it only when it is', () => {
    const s = theSentenceAbout({ label: L, checkedIn: true, lines: [line('Green Mart bought on Tuesday.', 'claims', true)] })!;
    expect(s).toContain('One thing Participant A said has proof behind it.');
    expect(theSentenceAbout({ label: L, checkedIn: true, lines: [line('Green Mart bought on Tuesday.', 'claims')] })).not.toContain('proof');
  });

  it('does not treat a capital at the start of a sentence or a weekday as a name', () => {
    expect(thingsNamedIn('Today I called. On Friday we met.')).toEqual([]);
    expect(thingsNamedIn('We met Nyama Choma Palace on Friday.')).toEqual(['Nyama Choma Palace']);
  });

  it('says somebody who has not checked in has not, and nothing else', () => {
    expect(theSentenceAbout({ label: L, checkedIn: false, lines: [] })).toBe('Participant A has not checked in this week, so there is nothing here yet about what Participant A is working on.');
  });

  it('never uses rating, label or ranking words, and never says consistently', () => {
    const all = [
      theSentenceAbout({ label: L, checkedIn: true, lines: [line('Green Mart on Friday, I will call.', 'promises', true)] }),
      theSentenceAbout({ label: L, checkedIn: true, lines: [] }),
      theSentenceAbout({ label: L, checkedIn: false, lines: [] }),
    ].join(' ').toLowerCase();
    for (const w of ['score', 'rating', 'rank', 'best', 'worst', 'weak', 'strong', 'at risk', 'consistently', 'specific', 'checkable']) expect(all).not.toContain(w);
  });

  it('refuses a sentence whose own words hold a rating word or a name, and never refuses their quoted words', () => {
    const lines = [line('Best Foods paid on Friday.', 'claims')];
    expect(theSentenceIsSafe('Participant A is the best this week.', { label: L, lines })).toBe(false);
    expect(theSentenceIsSafe('Participant A named Kwik Stores this week.', { label: L, lines })).toBe(false);
    expect(theSentenceIsSafe('This week Participant A said “Best Foods paid on Friday”.', { label: L, lines })).toBe(true);
  });

  it('counts a week from Monday in Lagos', () => {
    expect(theWeekOf(new Date('2026-09-23T15:00:00Z')).key).toBe('2026-09-21');
    expect(theWeekOf(new Date('2026-09-20T23:30:00Z')).key).toBe('2026-09-21'); // already Monday 00:30 in Lagos
  });
});

/* A check-in with a lead (Wairimu), two people, and one who has no name yet. */
const party = (id: string, userId: string | null, partyType: string, first: string | null, t: number) => ({
  id, userId, partyType, createdAt: new Date(2026, 8, 1, 0, t), email: null, nameGiven: null, organisationGiven: null, roleAsDescribed: null,
  user: first ? { firstName: first, lastName: null, email: null } : null,
});
const PARTIES = [
  party('p-lead', 'u-lead', 'INITIATOR', 'Wairimu', 0),
  party('p-aisha', 'u-aisha', 'RESPONDENT', 'Aisha', 1),
  party('p-baraka', 'u-baraka', 'RESPONDENT', 'Baraka', 2),
];

/* What each person said, as their assessments hold it: the one reader reads these (conversation/the-facts-on-record.ts). */
const anAssessment = (participantId: string, who: string, parts: Record<string, unknown>) => ({
  kind: 'assessment', version: 1,
  about: { checkInId: `c-${participantId}`, groundId: 'g1', participantId, who, isTheLead: false, sessionNumber: 3, endedAt: '2026-09-22T09:00:00Z' },
  summary: '', setup: null, comparedWithLastTime: {}, ...parts,
});
const said = (words: string, whoMaySee = 'the people in this check-in') => ({ id: words.slice(0, 6), words, from: [1], whoMaySee, saidWordForWord: true });

function build(scenario = 'SALES_TEAM_CHECK', assessments: any[] = []) {
  let stored: any = null;
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({ organizationId: 'org', initiatorId: 'u-lead', createdByUserId: 'u-lead', scenario, peersVisibleToEachOther: true, participants: PARTIES })) },
    checkIn: { findMany: jest.fn(async ({ select }: any) => (select?.sessionReport ? assessments.map((a) => ({ sessionReport: a })) : [{ participantId: 'p-aisha' }, { participantId: 'p-baraka' }])) },
    recordEntry: { findMany: jest.fn(async () => []) },
    weeklyReport: {
      upsert: jest.fn(async ({ create, update }: any) => { stored = { ...(stored ?? create), ...(update ?? {}), weekStart: create.weekStart, builtAt: new Date() }; return stored; }),
      findFirst: jest.fn(async () => stored),
    },
  };
  return { svc: new TheWeeklyReportService(prisma), prisma, stored: () => stored };
}
const ROWS = [
  anAssessment('p-aisha', 'Aisha', {
    workUpdates: [said('I met Green Mart and they want a quote.')],
    promises: [said('I will send the quote on Friday.')],
    /* What was noted for the lead about Aisha never reaches a sentence everybody's week is built from. */
    observations: [said('I think it went fine.', 'the lead only')],
  }),
  anAssessment('p-baraka', 'Baraka', { everythingElse: [said('A lot of calls this week. Aisha helped me.')] }),
];
const lead = { userId: 'u-lead', role: 'LEAD', organizationId: 'org' };

describe('the weekly sentences, built and read', () => {
  it('is built from the week\'s record, stored without a single name, and asks for no rating', async () => {
    const { svc, prisma, stored } = build('SALES_TEAM_CHECK', ROWS);
    await svc.build('g1', new Date('2026-09-23T10:00:00Z'));
    const json = JSON.stringify(stored().eachPerson);
    for (const n of ['Wairimu', 'Aisha', 'Baraka']) expect(json).not.toContain(n);
    expect(json).toContain('Participant');
    expect(json).not.toContain('I think it went fine');
    for (const call of prisma.checkIn.findMany.mock.calls) expect(JSON.stringify(call[0])).not.toMatch(/verifiab|specificity/i);
  });

  it('serves the lead every sentence, with names and as the lead reads it', async () => {
    const { svc } = build('SALES_TEAM_CHECK', ROWS);
    await svc.build('g1', new Date('2026-09-23T10:00:00Z'));
    const r = await svc.read('g1', lead);
    const says = r.eachPerson.map((e) => `${e.who}: ${e.says}`);
    expect(says).toEqual([
      'Aisha: This week Aisha said “I will send the quote on Friday” and “I met Green Mart and they want a quote”.',
      'Baraka: This week Baraka said “A lot of calls this week. Aisha helped me”.',
    ]);
    expect(JSON.stringify(r)).not.toMatch(/Participant [A-Z]|the initiator/);
  });

  it('serves a person only the sentence about themselves, as "you", and never a colleague\'s', async () => {
    const { svc } = build('SALES_TEAM_CHECK', ROWS);
    await svc.build('g1', new Date('2026-09-23T10:00:00Z'));
    const r = await svc.read('g1', { userId: 'u-baraka', role: 'MEMBER', organizationId: 'org' });
    expect(r.eachPerson).toHaveLength(1);
    expect(r.eachPerson[0]).toMatchObject({ who: 'You', isYou: true });
    expect(r.eachPerson[0].says).toContain('“A lot of calls this week.');
    const all = JSON.stringify(r);
    expect(all).not.toMatch(/Green Mart|Wairimu|send the quote/);
  });

  it('gives a colleague nothing about another person when there is no sentence about them', async () => {
    const { svc } = build('SALES_TEAM_CHECK', ROWS);
    await svc.build('g1', new Date('2026-09-23T10:00:00Z'));
    const r = await svc.read('g1', { userId: 'u-aisha', role: 'MEMBER', organizationId: 'org' });
    expect(r.eachPerson).toHaveLength(1);
    expect(r.eachPerson[0].says).toContain('“I will send the quote on Friday” and “I met Green Mart and they want a quote”.');
    expect(JSON.stringify(r)).not.toMatch(/Baraka|lot of calls/);
  });

  it('gives an admin of the organisation what the lead reads, on an ordinary check-in', async () => {
    const { svc } = build('SALES_TEAM_CHECK', ROWS);
    await svc.build('g1', new Date('2026-09-23T10:00:00Z'));
    const r = await svc.read('g1', { userId: 'u-admin', role: 'ADMIN', organizationId: 'org' });
    expect(r.eachPerson.map((e) => e.who)).toEqual(['Aisha', 'Baraka']);
  });

  it('gives an admin who was not given access to an evaluation check-in nothing at all', async () => {
    const { svc } = build('PIP', ROWS);
    await svc.build('g1', new Date('2026-09-23T10:00:00Z'));
    await expect(svc.read('g1', { userId: 'u-admin', role: 'ADMIN', organizationId: 'org' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('gives a stranger from another organisation nothing at all', async () => {
    const { svc } = build('SALES_TEAM_CHECK', ROWS);
    await svc.build('g1', new Date('2026-09-23T10:00:00Z'));
    await expect(svc.read('g1', { userId: 'u-x', role: 'ADMIN', organizationId: 'other' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('says plainly that nothing has come in yet, and builds nothing when read', async () => {
    const { svc, prisma } = build();
    const r = await svc.read('g1', lead);
    expect(r).toMatchObject({ eachPerson: [], saying: NOTHING_YET_THIS_WEEK });
    expect(prisma.weeklyReport.upsert).not.toHaveBeenCalled();
    expect(prisma.checkIn.findMany).not.toHaveBeenCalled();
  });
});

/* Found in the anchor walk (8 October): "Amani Wekesa named Zawadi, Wairimu and INFERRED this week." */
describe('a note on a line is not a name', () => {
  it('"[INFERRED: from context]" and "[VERIFIABILITY:LOW]" are not things the person named', () => {
    expect(thingsNamedIn('The van list comes from Zawadi at five in the morning. [INFERRED: from context]')).toEqual(['Zawadi']);
    expect(thingsNamedIn('I think Wairimu says it every Monday. [VERIFIABILITY:LOW] [INFERRED: Wairimu means the hotels]')).toEqual(['Wairimu']);
  });
});
