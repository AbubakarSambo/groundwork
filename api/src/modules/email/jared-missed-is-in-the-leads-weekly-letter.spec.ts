import { CLOSED_BY_THE_CLOCK } from '../../common/closed-by-the-clock';
import { NOT_A_QUIET_CLOSE } from '../grounds/an-answer-includes-a-refusal';
import { theLeadsLetter, theWeekOf } from './the-leads-weekly-letter';

/**
 * NIGHT QUALITY RUN 1, PROBLEM 4, IN THE LETTER ESTHER READS. Jared Okoth missed the week's check-in: the clock closed it with nothing
 * said. The week-2 letter said "This week, all four people checked in." A miss stays in the count, Jared is named as not yet, and
 * Esther, who runs it and checks in when she chooses, is never listed as missing.
 */
const person = (id: string, first: string, last: string, extra: any = {}) => ({ id, userId: `u-${id}`, email: `${id}@lakeshore.test`, managingOnly: false, partyType: 'PARTICIPANT', nameGiven: null, lastNudgedAt: null, user: { firstName: first, lastName: last, awaitingOrgApproval: false }, ...extra });
const people = [
  person('esther', 'Esther', 'Achieng', { partyType: 'INITIATOR' }),
  person('collins', 'Collins', 'Odhiambo'), person('hassan', 'Hassan', 'Mwenda'), person('amina', 'Amina', 'Otieno'), person('jared', 'Jared', 'Okoth'),
];
const at = new Date('2026-10-30T09:00:00Z');
const row = (participantId: string, said: boolean) => ({ participantId, status: 'COMPLETED', completedAt: new Date('2026-10-27T18:00:00Z'), closedReason: said ? null : CLOSED_BY_THE_CLOCK, turns: said ? [{ id: 't' }] : [] });
const sessions = [row('collins', true), row('hassan', true), row('amina', true), row('jared', false)];

/* The database's answer to the query the letter asks: when it asks to leave a quiet close out, a quiet close is left out. */
const prisma: any = {
  groundParticipant: { findMany: async () => people },
  checkIn: {
    findMany: async ({ where }: any) => sessions.filter((s) => !(JSON.stringify(where.AND ?? []) === JSON.stringify([NOT_A_QUIET_CLOSE]) && s.closedReason === CLOSED_BY_THE_CLOCK && !s.turns.length)),
  },
  groundCommitment: { findMany: async () => [], count: async () => 0 },
  groundDependency: { findMany: async () => [], count: async () => 0 },
};

describe("the lead's weekly letter keeps Jared's missed check-in in the count", () => {
  it('reads three of four, names Jared as not yet, and never lists Esther', async () => {
    const w = await theWeekOf(prisma, { id: 'g1', label: 'Lakeshore sales', initiatorId: 'u-esther' }, at);
    expect(w.ofHowMany).toBe(4);
    expect(w.checkedIn).toBe(3);
    expect(w.notYet).toEqual(['Jared']);
    const letter = theLeadsLetter([w])!;
    const text = [letter.subject, ...letter.lines].join(' ');
    expect(text).toContain('This week, three of four people checked in.');
    expect(text).toContain('Jared');
    expect(text).not.toContain('all four people checked in');
    expect(text).not.toMatch(/\bEsther\b|\byou\b has not/);
  });
});
