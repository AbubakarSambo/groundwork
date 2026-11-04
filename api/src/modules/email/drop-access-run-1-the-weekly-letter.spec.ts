import { theWeekOf, theLeadsLetter, theSubjectFor, theCountsOf } from './the-leads-weekly-letter';
import { whatTheyTriedInFull } from '../grounds/a-wait-is-the-speakers-account';

/**
 * DROP ACCESS RUN 1, ITEMS 17 TO 20: GRACE'S FRIDAY LETTER OF 23 OCTOBER (gw_sweep_drop10), from the run's own rows.
 *
 * What she read (subject "Five things people said they would do were done; 25 handoffs are still waiting"):
 *   "This week, all four people checked in. Four people said what they will do next. Five things people said they would do were done.
 *    25 handoffs are still waiting."
 *   "Joseph says the work is waiting on you for a decision on the KES 4,500 price for Juja Hardware. Not backed: no attempt to unblock
 *    mentioned. Joseph could have messaged you or asked again."
 *   "Sort out a decision on the KES 4,500 price for Juja Hardware. Joseph Kariuki is waiting on you for it."
 *   "Sort out approval on the KES 4,500 price for 5 units. Joseph Kariuki is waiting on you for it."
 *   "Sort out an answer about the KES 4,500 price. Joseph Kariuki is waiting on you for it."
 * Joseph missed sessions 7 and 8 (closed by the clock with nothing said), and he had said "I've asked Grace about the price".
 * And on 16 October the subject was "Ten things people said they would do were done; 14 handoffs are still waiting".
 */
const NOW = new Date('2026-10-23T14:00:00.046Z');
const G = { id: 'ffa3b4b1-5ce0-4651-b35b-bf5ecc42d5be', label: 'Sales team, Q4', initiatorId: 'u-grace' };
const P = { grace: 'p-grace', joseph: 'p-joseph', mercy: 'p-mercy', kevin: 'p-kevin' };
const person = (id: string, userId: string, first: string, last: string) => ({ id, userId, email: `${first.toLowerCase()}@dropaccess.test`, managingOnly: false, nameGiven: null, lastNudgedAt: null, acceptedAt: new Date('2026-10-12'), joinedAt: new Date('2026-10-12'), partyType: id === P.grace ? 'INITIATOR' : 'PARTICIPANT', user: { firstName: first, lastName: last, awaitingOrgApproval: false } });
const PEOPLE = [person(P.grace, 'u-grace', 'Grace', 'Achieng'), person(P.joseph, 'u-joseph', 'Joseph', 'Kariuki'), person(P.mercy, 'u-mercy', 'Mercy', 'Wairimu'), person(P.kevin, 'u-kevin', 'Kevin', 'Omondi')];

/* Sessions 6 to 10 opened 19 to 23 October at 05:00 UTC; Joseph's 7 and 8 were closed by the clock with nothing said. */
const day = (n: number) => `2026-10-${String(13 + n).padStart(2, '0')}`;
const session = (participantId: string, n: number, answered: boolean) => ({
  participantId, sessionNumber: n, status: 'COMPLETED', isSetup: false, optional: participantId === P.grace,
  closedReason: answered ? null : 'auto_closed', availableFrom: new Date(`${day(n)}T05:00:00Z`), createdAt: new Date(`${day(n)}T05:00:00Z`),
  completedAt: answered ? new Date(`${day(n)}T11:05:00Z`) : new Date(`${day(n + 1)}T05:00:00Z`), missedReason: null, turns: answered ? [{ id: 't' }] : [],
});
const SESSIONS = [
  ...[6, 7, 8, 9, 10].flatMap((n) => [session(P.kevin, n, true), session(P.mercy, n, true), session(P.joseph, n, n !== 7 && n !== 8)]),
  session(P.grace, 10, true),
];
/* The three KES 4,500 waits Joseph has on Grace, as the record holds them. */
const ON_GRACE = [
  { id: '86186c63', groundId: G.id, fromParticipantId: P.joseph, onParticipantId: P.grace, status: 'WAITING', what: 'a decision on the KES 4,500 price for Juja Hardware', triedSaid: null, createdAt: new Date('2026-10-14T11:08:07.442Z') },
  { id: '8ad5d462', groundId: G.id, fromParticipantId: P.joseph, onParticipantId: P.grace, status: 'WAITING', what: 'approval on the KES 4,500 price for 5 units', triedSaid: "I've asked her", createdAt: new Date('2026-10-15T11:06:34.117Z') },
  { id: 'f4648cb3', groundId: G.id, fromParticipantId: P.joseph, onParticipantId: P.grace, status: 'BLOCKING', what: 'approval for the KES 4,500 price for Juja Hardware', triedSaid: "I've asked Grace about the price", createdAt: new Date('2026-10-23T11:08:09.115Z') },
];
const THE_REPORTS_TO_DO = [
  { do: 'Sort out a decision on the KES 4,500 price for Juja Hardware.', why: 'Joseph Kariuki is waiting on you for it.' },
  { do: 'Sort out approval on the KES 4,500 price for 5 units.', why: 'Joseph Kariuki is waiting on you for it.' },
  { do: 'Sort out an answer about the KES 4,500 price.', why: 'Joseph Kariuki is waiting on you for it.' },
];

/* Release 1's sales board is on for Drop Access unless a case says otherwise (release-one-sales-board). */
function theRecord(releaseOne = true) {
  return {
    ground: { findUnique: jest.fn(async () => ({ organizationId: 'org-drop' })) },
    organization: { findUnique: jest.fn(async () => ({ release1SalesBoardOn: releaseOne })) },
    groundParticipant: { findMany: jest.fn(async () => PEOPLE) },
    checkIn: { findMany: jest.fn(async (args: any) => (args?.where?.status === 'COMPLETED'
      ? SESSIONS.filter((c) => c.closedReason !== 'auto_closed' && c.completedAt >= args.where.completedAt.gte && c.completedAt <= args.where.completedAt.lte)
      : SESSIONS)) },
    groundCommitment: {
      findMany: jest.fn(async (args: any) => (args?.where?.status === 'DONE' ? [] : [{ participantId: P.kevin }, { participantId: P.mercy }, { participantId: P.joseph }, { participantId: P.grace }])),
      count: jest.fn(async () => 5),
    },
    groundDependency: { count: jest.fn(async () => 25), findMany: jest.fn(async () => ON_GRACE) },
    notification: { findMany: jest.fn(async () => []) },
    emailDelivery: { findMany: jest.fn(async () => []) },
  };
}

describe('item 17: the week counts the check-ins made', () => {
  it('13 of the 15 check-ins due were made, and Joseph missed two of five; never "all four people checked in"', async () => {
    const w = await theWeekOf(theRecord(), G, NOW);
    expect([w.checkInsMade, w.checkInsDue]).toEqual([13, 15]);
    expect(w.missedBy).toEqual([{ name: 'Joseph', missed: 2, of: 5 }]);
    const letter = theLeadsLetter([{ ...w, toDo: THE_REPORTS_TO_DO }])!;
    expect(letter.lines[1]).toBe('This week, 13 of the 15 check-ins were made. Joseph missed two of five. Four people said what they will do next. Five things people said they would do were done. 25 handoffs are still waiting.');
    expect(letter.lines.join(' ')).not.toContain('all four people checked in');
  });
});

describe('item 18: what Joseph tried is said in full, from the record, or nothing', () => {
  it('his words of 23 October, with the day: never "Not backed: ... could have messaged you"', () => {
    expect(whatTheyTriedInFull({ triedSaid: ON_GRACE[2].triedSaid, createdAt: ON_GRACE[2].createdAt }, 'Joseph')).toBe('Joseph said on Friday 23 October, “I\'ve asked Grace about the price.”');
    expect(whatTheyTriedInFull({ triedSaid: null }, 'Kennedy')).toBe('');
  });
});

describe('item 19: the letter says one decision once', () => {
  it('the three "Sort out" lines are one, and the claim above them is not said again', async () => {
    const w = await theWeekOf(theRecord(), G, NOW);
    const letter = theLeadsLetter([{ ...w, toDo: THE_REPORTS_TO_DO }])!;
    const all = letter.lines.join('\n');
    expect(all.match(/KES 4,500/g)).toHaveLength(1);
    expect(letter.lines).toEqual([
      'Your team is starting to move.',
      'This week, 13 of the 15 check-ins were made. Joseph missed two of five. Four people said what they will do next. Five things people said they would do were done. 25 handoffs are still waiting.',
      'Here is what I would do this week.',
      'Sort out a decision on the KES 4,500 price for Juja Hardware. Joseph Kariuki is waiting on you for it.',
    ]);
    expect(all).not.toMatch(/Not backed|could have messaged/);
  });
});

describe('item 20: a subject or line never mixes words and digits for its counts', () => {
  it('16 October: "Ten things ...; 14 handoffs" is "10 things ...; 14 handoffs"; 23 October\'s "Five ...; 25" is "5 ...; 25"', () => {
    const base = { groundId: G.id, label: G.label, ofHowMany: 4, checkedIn: 4, notYet: [], saidWhatNext: 4, releaseOne: true };
    expect(theSubjectFor([{ ...base, done: 10, waiting: 14 }])).toBe('10 things people said they would do were done; 14 handoffs are still waiting');
    expect(theSubjectFor([{ ...base, done: 5, waiting: 25 }])).toBe('5 things people said they would do were done; 25 handoffs are still waiting');
    expect(theSubjectFor([{ ...base, done: 4, waiting: 10 }])).toBe('Four things people said they would do were done; ten handoffs are still waiting');
    expect(theCountsOf(9, 12)(9)).toBe('9');
  });
});

describe('with Release 1\'s switch off for the organisation, the letter reads as before, except the count of check-ins made', () => {
  it('the claim and each "Sort out" line are said as before, with the note beside the claim, and the check-ins made are still counted', async () => {
    const w = await theWeekOf(theRecord(false), G, NOW);
    expect(w.releaseOne).toBeUndefined();
    const letter = theLeadsLetter([{ ...w, toDo: THE_REPORTS_TO_DO }])!;
    expect(letter.lines[1]).toBe('This week, 13 of the 15 check-ins were made. Joseph missed two of five. Four people said what they will do next. Five things people said they would do were done. 25 handoffs are still waiting.');
    /* Changed 3 November (Hafsah, F2: silence is never a finding): "Not backed: no attempt to unblock mentioned" is gone everywhere, switch on or off. */
    expect(letter.lines.join('\n')).not.toMatch(/Not backed|could have messaged/);
  });
  it('a subject says each count as before: "Ten things ...; 14 handoffs"', () => {
    const base = { groundId: G.id, label: G.label, ofHowMany: 4, checkedIn: 4, notYet: [], saidWhatNext: 4 };
    expect(theSubjectFor([{ ...base, done: 10, waiting: 14 }])).toBe('Ten things people said they would do were done; 14 handoffs are still waiting');
  });
});
