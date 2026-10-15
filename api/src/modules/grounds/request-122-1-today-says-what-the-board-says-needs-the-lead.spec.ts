import { WhatNeedsYouService } from './what-needs-you.service';
import { boardAs } from '../board/the-switchboards-sections-harness';
import { review5, REVIEW_5_PEOPLE, REVIEW_5_CHECK_INS, RUKIA_RUNS_IT, AMANI } from '../board/__fixtures__/sales-board-review-5';

/**
 * REQUEST 122, READ AS EACH PERSON WHO OPENS TODAY, on "Sales team, Q3" (the thirteenth sales review).
 *  (1) Rukia's Today said "Nothing needs you right now." while her board's "What needs you in this check-in" listed
 *      Baraka Mwangi and Amani Wekesa waiting on her, and a commitment of hers still open.
 */
const NOW = new Date('2026-10-03T09:00:00Z');

const participants = (more: any[] = []) => [...REVIEW_5_PEOPLE, ...more].map((p: any) => ({ id: p.id, userId: p.userId, user: p.user, ...(p.notLetIn ? { notLetIn: true } : {}) }));
const rows = (more: any[] = []) => [
  ...REVIEW_5_CHECK_INS,
  /* Session 3 opens for everybody on 7 October. */
  ...['p-rukia', 'p-amani', 'p-baraka', 'p-neema', 'p-faraji'].map((id) => ({ id: `c3-${id}`, participantId: id, sessionNumber: 3, status: 'NOT_STARTED', isSetup: false, completedAt: null, availableFrom: new Date('2026-10-07T06:00:00Z') })),
  ...more,
];
const listRow = (extraPeople: any[] = [], extraRows: any[] = []) => ({
  id: 'g-1', label: 'Sales team, Q3', status: 'ACTIVE', organizationId: 'org-1', initiatorId: 'u-rukia',
  participants: participants(extraPeople), checkIns: rows(extraRows),
  glance: { progress: { roundsDone: 1, roundsPlanned: 12, answeredThisRound: 2, ofPeople: 4, waitingOn: ['p-baraka', 'p-neema'], openRound: 2 } },
});

function today(list: any[]) {
  const grounds: any = { list: jest.fn(async () => list), listAwaitingApproval: jest.fn(async () => []) };
  const prisma: any = {
    organizationMembership: { findMany: jest.fn(async () => []) },
    user: { findUnique: jest.fn(async () => ({ awaitingOrgApproval: false })) },
  };
  const boards = { get: jest.fn(async (_id: string, userId: string) => boardAs(review5(), userId, userId === 'u-grace' ? 'ADMIN' : 'MEMBER')) };
  const moduleRef: any = { get: jest.fn(() => boards) };
  const svc = new WhatNeedsYouService(prisma, grounds, undefined, undefined, undefined, undefined, undefined, moduleRef);
  return { svc, boards };
}

describe('request 122 (1): Today says what the board says needs the lead', () => {
  it('Rukia is told who is waiting on her and what she has not done, and not "nothing"', async () => {
    const { svc } = today([listRow()]);
    const r = await svc.forReader('u-rukia', 'rukia@x.test', 'org-1', 'MEMBER');
    const titles = r.needs.map((n) => n.title);
    const board = await boardAs(review5(), ...RUKIA_RUNS_IT);
    expect(r.count).toBeGreaterThanOrEqual(3);
    for (const a of board.leadActions as any[]) expect(titles).toContain(a.says);
    expect(titles.some((t) => /Baraka Mwangi, who is waiting on you for the discount/.test(t))).toBe(true);
    expect(titles.some((t) => /Amani Wekesa, who is waiting on you for the price list/.test(t))).toBe(true);
    expect(r.needs.filter((n) => n.groundId === 'g-1' && n.onTheBoardToo).length).toBe((board.leadActions as any[]).length + (board.decisions as any[]).length);
  });

  it('each item is under the board\'s own words, with the same reasons', async () => {
    const { svc } = today([listRow()]);
    const r = await svc.forReader('u-rukia', 'rukia@x.test', 'org-1', 'MEMBER');
    const board = await boardAs(review5(), ...RUKIA_RUNS_IT);
    for (const a of board.leadActions as any[]) {
      const n = r.needs.find((x) => x.title === a.says)!;
      expect(n.detail).toBe(a.because);
      expect(n.action.to).toBe('/grounds/g-1');
    }
  });

  it('Amani, who checks in, is not given the lead\'s items, and the board is not read for her', async () => {
    const { svc, boards } = today([listRow()]);
    const r = await svc.forReader('u-amani', 'amani@x.test', 'org-1', 'MEMBER');
    expect(boards.get).not.toHaveBeenCalled();
    expect(r.needs.some((n) => n.onTheBoardToo)).toBe(false);
    expect(JSON.stringify(r)).not.toMatch(/who is waiting on you/);
    void AMANI;
  });

  it('an admin who does not run it is not given the lead\'s items either', async () => {
    const { svc, boards } = today([listRow()]);
    const r = await svc.forReader('u-grace', 'grace@x.test', 'org-1', 'ADMIN');
    expect(boards.get).not.toHaveBeenCalled();
    expect(r.needs.some((n) => n.onTheBoardToo)).toBe(false);
  });

  it('a board that cannot be read leaves Today as it was, with no error', async () => {
    const { svc, boards } = today([listRow()]);
    boards.get.mockRejectedValueOnce(new Error('no'));
    const r = await svc.forReader('u-rukia', 'rukia@x.test', 'org-1', 'MEMBER');
    expect(r.needs.some((n) => n.onTheBoardToo)).toBe(false);
  });
});
