import { whatNeedsYou, type ListedCheckIn } from './what-needs-you';
import { whatTheBoardAsksOfTheLead } from './what-the-board-asks-of-the-lead';

/**
 * Requests 151 (S1, E6) and 152 (2), in the words each reader reads on Today.
 */
const NOW = new Date('2026-10-05T09:00:00Z');
const H = 3_600_000;
const ago = (h: number) => new Date(NOW.getTime() - h * H).toISOString();
const person = (id: string, userId: string, firstName: string) => ({ id, userId, user: { firstName } });

const sales: ListedCheckIn = {
  id: 'g-sales', label: 'Sales team, Q3', status: 'ACTIVE', organizationId: 'org', initiatorId: 'u-rukia',
  participants: [person('p-r', 'u-rukia', 'Rukia'), person('p-a', 'u-amani', 'Amani')],
  checkIns: [
    { id: 'c-a1', participantId: 'p-a', sessionNumber: 1, status: 'COMPLETED', availableFrom: ago(200), completedAt: ago(190) },
    { id: 'c-a2', participantId: 'p-a', sessionNumber: 2, status: 'COMPLETED', availableFrom: ago(100), completedAt: ago(90) },
    { id: 'c-r1', participantId: 'p-r', sessionNumber: 1, status: 'COMPLETED', availableFrom: ago(200), completedAt: ago(190) },
  ],
  reportWaitingForMe: true,
  latestSummary: 'Three shops were signed.',
  glance: { progress: { roundsDone: 2, roundsPlanned: 12 } },
};

describe('Today: "Read it" for a report goes to the page that has it (request 151, S1)', () => {
  it('Amani, who takes part, is sent to her own latest check-in\'s report, not the check-in\'s empty report page', () => {
    const r = whatNeedsYou([sales], { userId: 'u-amani', role: 'MEMBER', organizationId: 'org' } as any, [], NOW);
    const ready = r.needs.find((n) => n.key === 'report-g-sales')!;
    expect(ready.title).toBe('The report for Sales team, Q3 is ready');
    expect(ready.action).toEqual({ label: 'Read it', to: '/checkin/c-a2/report' });
  });

  it('Rukia, who runs it, keeps the check-in\'s own report page', () => {
    const r = whatNeedsYou([sales], { userId: 'u-rukia', role: 'MEMBER', organizationId: 'org' } as any, [], NOW);
    expect(r.needs.find((n) => n.key === 'report-g-sales')!.action).toEqual({ label: 'Read it', to: '/grounds/g-sales/report' });
  });
});

describe('Today: every row says which check-in it belongs to (request 152, 2)', () => {
  it('a turn, a report and the lead\'s board items all carry the check-in\'s label', () => {
    const asAmani = whatNeedsYou([sales], { userId: 'u-amani', role: 'MEMBER', organizationId: 'org' } as any, [], NOW);
    for (const n of asAmani.needs) expect(n.checkInLabel).toBe('Sales team, Q3');
    const board = {
      decisions: [{ question: 'Whether to give the discount.' }],
      leadActions: [{ id: 'la1', says: 'Baraka Mwangi is waiting on the discount decision.', because: null }],
    };
    const asked = whatTheBoardAsksOfTheLead(board, { id: 'g-sales', organizationId: 'org', label: 'Sales team, Q3' });
    expect(asked.map((n) => [n.title, n.checkInLabel])).toEqual([
      ['Whether to give the discount.', 'Sales team, Q3'],
      ['Baraka Mwangi is waiting on the discount decision.', 'Sales team, Q3'],
    ]);
  });
});

describe('Today: a thing the board lists twice is listed once (request 151, E6)', () => {
  it('the discount decision, said as a decision and as a lead action, is one row', () => {
    const board = {
      decisions: [{ question: 'Decide whether Baraka Mwangi gets the discount' }],
      leadActions: [{ id: 'la1', says: 'Decide whether Baraka Mwangi gets the discount.', because: null }],
    };
    const asked = whatTheBoardAsksOfTheLead(board, { id: 'g-sales', organizationId: 'org', label: 'Sales team, Q3' });
    expect(asked.map((n) => n.title)).toEqual(['Decide whether Baraka Mwangi gets the discount']);
  });
});
