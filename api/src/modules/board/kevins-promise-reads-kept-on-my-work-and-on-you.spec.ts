import { readMyWork, type MyWorkServed } from './my-work';
import { yourBoard } from '../grounds/your-board';

/**
 * KEVIN'S PROMISE HAS ONE STATE, ON MY WORK AND ON HIS OWN PAGE (browser test, 21 October, finding 9). Kevin's rows in "Sales team, Q4",
 * as the browser test's database holds them:
 *
 *  - a to-do he wrote himself on 12 October, "I'll call them by end of day tomorrow.", marked done on 15 October;
 *  - the same promise kept again as a commitment on 19 October, "I'll call them", by end of day tomorrow, still open;
 *  - "I'll call Paul", tomorrow afternoon, not done.
 *
 * You listed "Call them by end of day tomorrow. Kept", while My work listed "Call them" as Late ("It was due on 20 October.") and said
 * "You kept 0 of 1 promises.", because My work read the commitments alone. Both now read the one record of a promise and its state.
 */
const NOW = new Date('2026-10-21T09:00:00Z');
const G = 'a0cdc357-32d0-4df4-bece-692b27e5511f';
const KEVIN = '9f2e58a4-06d8-4a0a-bddc-03cd96df027c';

const COMMITMENTS = [
  { id: '76dc128e', groundId: G, participantId: KEVIN, text: 'I\'ll call Paul', whenSaid: 'tomorrow afternoon', status: 'NOT_DONE', explicit: true, settledBy: 'SAID', createdAt: new Date('2026-10-12T11:04:54Z'), settledAt: new Date('2026-10-19T11:03:05Z') },
  { id: 'b0635515', groundId: G, participantId: KEVIN, text: 'I\'ll call them', whenSaid: 'by end of day tomorrow', status: 'UNKNOWN', explicit: true, settledBy: null, createdAt: new Date('2026-10-19T11:03:06Z'), settledAt: null },
];
const TODOS = [
  { id: 'c16b9d1a', groundId: G, participantId: KEVIN, text: 'I\'ll call them by end of day tomorrow.', kind: 'TODO', authoredBy: 'self', dueSaid: 'by end of day tomorrow', status: 'MET', statusChangedAt: new Date('2026-10-15T11:03:50Z'), createdAt: new Date('2026-10-12T11:05:06Z') },
];

function theSalesCheckIn() {
  const person = (id: string, userId: string, first: string, last: string, lead = false) => ({
    id, userId, email: `${first.toLowerCase()}@dropaccess.test`, nameGiven: null, partyType: lead ? 'INITIATOR' : 'PARTICIPANT',
    managingOnly: lead, createdAt: new Date('2026-10-12T08:00:00Z'), user: { firstName: first, lastName: last },
  });
  const ground = {
    id: G, label: 'Sales team, Q4', organizationId: 'org-drop', initiatorId: 'u-grace', scenario: 'OKR_ALIGNMENT', kindOfWork: 'sales team',
    peersVisibleToEachOther: true, initiator: { firstName: 'Grace', lastName: 'Achieng' }, organization: { timeZone: 'Africa/Nairobi' },
    participants: [person('p-grace', 'u-grace', 'Grace', 'Achieng', true), person(KEVIN, 'u-kevin', 'Kevin', 'Otieno')],
  };
  const prisma: any = {
    organization: { findUnique: async () => ({ release1bTabsOn: true, personJudgementsOn: true }) },
    ground: { findFirst: async () => ground },
    groundCommitment: { findMany: async ({ where }: any) => COMMITMENTS.filter((c) => (typeof where.participantId === 'string' ? c.participantId === where.participantId : c.participantId !== where.participantId?.not)) },
    personObjective: { findMany: async ({ where }: any) => TODOS.filter((o) => o.participantId === where.participantId) },
    groundDependency: { findMany: async () => [] },
    workMention: { findMany: async () => [] },
    checkIn: { findMany: async () => [] },
    groundContextItem: { findMany: async () => [] },
    groundObjective: { findMany: async () => [] },
    recordEntry: { findMany: async () => [] },
  };
  const board = { get: async () => ({ workRecords: [], patterns: [] }) };
  return { prisma, board, ground };
}

describe('Kevin’s promise reads the same on My work and on You', () => {
  it('My work, as Kevin reads it, lists the promise as done and counts it kept', async () => {
    const c = theSalesCheckIn();
    const page = (await readMyWork(c.prisma, c.board, { groundId: G, userId: 'u-kevin' }, NOW)) as MyWorkServed;
    const text = JSON.stringify(page);
    expect(text).not.toContain('It was due on 20 October.');
    expect(page.toDo.own.map((t) => [t.text, t.when, t.done, t.late])).toEqual([
      ['Call them by end of day tomorrow.', 'Done on 15 October.', true, false],
    ]);
    expect(page.numbers).toContainEqual({ value: '1 of 2', label: 'promises kept' });
    expect(page.achieved.items).toContainEqual({ text: 'You kept 1 of 2 promises.', proof: 'Your check-ins' });
  });

  it('My work, as Grace reads Kevin’s page, says the same', async () => {
    const c = theSalesCheckIn();
    const page = (await readMyWork(c.prisma, c.board, { groundId: G, userId: 'u-grace', personId: KEVIN }, NOW)) as MyWorkServed;
    expect(page.toDo.own.map((t) => [t.text, t.done, t.late])).toEqual([['Call them by end of day tomorrow.', true, false]]);
    expect(page.numbers).toContainEqual({ value: '1 of 2', label: 'promises kept' });
  });

  it('You, as Kevin reads it, lists the same promise as Kept, and counts it the same way', () => {
    const c = theSalesCheckIn();
    const you = yourBoard([c.ground as any], { userId: 'u-kevin', organizationId: 'org-drop' }, {
      objectives: TODOS as any, ownedTargets: [], coaching: [], todos: [], commitments: COMMITMENTS as any,
    }, NOW);
    expect(you.saidYoudDo.map((s) => [s.text, s.stateSays])).toEqual([
      ['Call them by end of day tomorrow.', 'Kept'],
      ['Call Paul', 'Not done'],
    ]);
    expect(you.keptLately).toEqual({ kept: 1, of: 2, says: 'In the last four weeks, you kept one of your two commitments.' });
  });
});
