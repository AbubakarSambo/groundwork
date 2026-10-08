import { NotFoundException } from '@nestjs/common';
import { TheWeeklyReportService, NOTHING_YET_THIS_WEEK } from './the-weekly-report.service';
import { theSentenceAbout, theSentenceIsSafe, theWeekOf, thingsNamedIn } from './the-weekly-sentence-about-each-person';

/**
 * WEEK 12B: WHAT PEOPLE NAMED IN THE WEEK, SAID IN ONE SENTENCE EACH (decisions 11, 38, 40, 43).
 * Checked as each reader reads it, not only as the draft is written.
 */

const L = 'Participant A';
const line = (text: string, type = 'PROGRESS', documented = false) => ({ text, type, documented });

describe('the sentence about one person', () => {
  it('says what was named, with the next step and the date', () => {
    const s = theSentenceAbout({ label: L, checkedIn: true, lines: [line('I visited Green Mart and Nyama Choma Palace.'), line('I will send the quote on Friday.', 'COMMITMENT')] })!;
    expect(s).toBe('Participant A named Green Mart and Nyama Choma Palace this week, and gave a next step and a date.');
  });

  it('says a gap as what the record shows, and gives no label', () => {
    const s = theSentenceAbout({ label: L, checkedIn: true, lines: [line('It was a busy week with lots of calls.')] })!;
    expect(s).toBe("Participant A's account named no person or company, date or next step this week, so there is nothing yet to follow up on.");
  });

  it('says "customer" when the words were about customers', () => {
    const s = theSentenceAbout({ label: L, checkedIn: true, lines: [line('I spoke to a few customers.')] })!;
    expect(s).toBe("Participant A's account named no customer, date or next step this week, so there is nothing yet to follow up on.");
  });

  it('says names with no next step as not yet clear what happens next', () => {
    const s = theSentenceAbout({ label: L, checkedIn: true, lines: [line('Mama Fresh said the price was high.')] })!;
    expect(s).toBe('Participant A named Mama Fresh this week, but gave no next step or date, so it is not yet clear what happens next.');
  });

  it('says a document is behind it only when one is', () => {
    const s = theSentenceAbout({ label: L, checkedIn: true, lines: [line('Green Mart bought on Tuesday.', 'PROGRESS', true)] })!;
    expect(s).toContain('One of them has a document behind it.');
    expect(theSentenceAbout({ label: L, checkedIn: true, lines: [line('Green Mart bought on Tuesday.')] })).not.toContain('document');
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
      theSentenceAbout({ label: L, checkedIn: true, lines: [line('Green Mart on Friday, I will call.', 'COMMITMENT', true)] }),
      theSentenceAbout({ label: L, checkedIn: true, lines: [line('busy')] }),
      theSentenceAbout({ label: L, checkedIn: false, lines: [] }),
    ].join(' ').toLowerCase();
    for (const w of ['score', 'rating', 'rank', 'best', 'worst', 'weak', 'strong', 'at risk', 'consistently', 'specific', 'checkable']) expect(all).not.toContain(w);
  });

  it('refuses a sentence that holds a rating word or a name the person never said', () => {
    const lines = [line('Green Mart on Friday.')];
    expect(theSentenceIsSafe('Participant A is the best this week.', { label: L, lines })).toBe(false);
    expect(theSentenceIsSafe('Participant A named Kwik Stores this week.', { label: L, lines })).toBe(false);
    expect(theSentenceIsSafe('Participant A named Green Mart this week.', { label: L, lines })).toBe(true);
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

function build(scenario = 'SALES_TEAM_CHECK', rows: any[] = []) {
  let stored: any = null;
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({ organizationId: 'org', initiatorId: 'u-lead', createdByUserId: 'u-lead', scenario, peersVisibleToEachOther: true, participants: PARTIES })) },
    checkIn: { findMany: jest.fn(async () => [{ participantId: 'p-aisha' }, { participantId: 'p-baraka' }]) },
    recordEntry: { findMany: jest.fn(async () => rows) },
    weeklyReport: {
      upsert: jest.fn(async ({ create, update }: any) => { stored = { ...(stored ?? create), ...(update ?? {}), weekStart: create.weekStart, builtAt: new Date() }; return stored; }),
      findFirst: jest.fn(async () => stored),
    },
  };
  return { svc: new TheWeeklyReportService(prisma), prisma, stored: () => stored };
}
const ROWS = [
  { participantId: 'p-aisha', type: 'PROGRESS', text: 'I met Green Mart and they want a quote.', anchoredDocumentId: null },
  { participantId: 'p-aisha', type: 'COMMITMENT', text: 'I will send the quote on Friday.', anchoredDocumentId: null },
  { participantId: 'p-baraka', type: 'PROGRESS', text: 'A lot of calls this week.', anchoredDocumentId: null },
];
const lead = { userId: 'u-lead', role: 'LEAD', organizationId: 'org' };

describe('the weekly sentences, built and read', () => {
  it('is built from the week\'s record, stored without a single name, and asks for no rating', async () => {
    const { svc, prisma, stored } = build('SALES_TEAM_CHECK', ROWS);
    await svc.build('g1', new Date('2026-09-23T10:00:00Z'));
    const json = JSON.stringify(stored().eachPerson);
    for (const n of ['Wairimu', 'Aisha', 'Baraka']) expect(json).not.toContain(n);
    expect(json).toContain('Participant');
    const asked = JSON.stringify(prisma.recordEntry.findMany.mock.calls[0][0].select);
    expect(asked).not.toMatch(/verifiab|specificity/i);
  });

  it('serves the lead every sentence, with names and as the lead reads it', async () => {
    const { svc } = build('SALES_TEAM_CHECK', ROWS);
    await svc.build('g1', new Date('2026-09-23T10:00:00Z'));
    const r = await svc.read('g1', lead);
    const says = r.eachPerson.map((e) => `${e.who}: ${e.says}`);
    expect(says).toEqual([
      "Aisha: Aisha named Green Mart this week, and gave a next step and a date.",
      "Baraka: Baraka's account named no person or company, date or next step this week, so there is nothing yet to follow up on.",
    ]);
    expect(JSON.stringify(r)).not.toMatch(/Participant [A-Z]|the initiator/);
  });

  it('serves a person only the sentence about themselves, as "you", and never a colleague\'s', async () => {
    const { svc } = build('SALES_TEAM_CHECK', ROWS);
    await svc.build('g1', new Date('2026-09-23T10:00:00Z'));
    const r = await svc.read('g1', { userId: 'u-baraka', role: 'MEMBER', organizationId: 'org' });
    expect(r.eachPerson).toEqual([{ who: 'You', isYou: true, says: "Your account named no person or company, date or next step this week, so there is nothing yet to follow up on." }]);
    const all = JSON.stringify(r);
    expect(all).not.toMatch(/Aisha|Green Mart|Wairimu/);
  });

  it('gives a colleague nothing about another person when there is no sentence about them', async () => {
    const { svc } = build('SALES_TEAM_CHECK', ROWS);
    await svc.build('g1', new Date('2026-09-23T10:00:00Z'));
    const r = await svc.read('g1', { userId: 'u-aisha', role: 'MEMBER', organizationId: 'org' });
    expect(r.eachPerson).toHaveLength(1);
    expect(r.eachPerson[0].says).toBe('You named Green Mart this week, and gave a next step and a date.');
    expect(JSON.stringify(r)).not.toMatch(/Baraka/);
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
    expect(prisma.recordEntry.findMany).not.toHaveBeenCalled();
  });
});

/* Found in the anchor walk (8 October): "Amani Wekesa named Zawadi, Wairimu and INFERRED this week." */
describe('a note on a line is not a name', () => {
  it('"[INFERRED: from context]" and "[VERIFIABILITY:LOW]" are not things the person named', () => {
    expect(thingsNamedIn('The van list comes from Zawadi at five in the morning. [INFERRED: from context]')).toEqual(['Zawadi']);
    expect(thingsNamedIn('I think Wairimu says it every Monday. [VERIFIABILITY:LOW] [INFERRED: Wairimu means the hotels]')).toEqual(['Wairimu']);
  });
});
