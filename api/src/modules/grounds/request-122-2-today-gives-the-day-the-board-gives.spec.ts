import { WhatNeedsYouService } from './what-needs-you.service';
import { boardAs } from '../board/the-switchboards-sections-harness';
import { review5, REVIEW_5_PEOPLE, REVIEW_5_CHECK_INS, RUKIA_RUNS_IT, AMANI } from '../board/__fixtures__/sales-board-review-5';

/**
 * REQUEST 122, READ AS EACH PERSON WHO OPENS TODAY, on "Sales team, Q3" (the thirteenth sales review).
 *  (1) Rukia's Today said "Nothing needs you right now." while her board's "What needs you in this check-in" listed
 *      Baraka Mwangi and Amani Wekesa waiting on her, and a commitment of hers still open.
 *  (2) Today's "Coming up" said the second check-in opens, when the board says session 2 opened on 30 September and
 *      session 3 opens on 7 October.
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
  const svc = new WhatNeedsYouService(prisma, grounds, undefined, undefined, undefined, undefined, undefined);
  return { svc, boards };
}

describe('request 122 (2): Today gives the day the next check-in opens that the board gives', () => {
  /* A FIXED CLOCK (user journeys, F-22). "Coming up" is what opens after today, so the spec read the real date and failed on 7 October, the very day it names. */
  beforeAll(() => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask'] });
  });
  afterAll(() => {
    jest.useRealTimers();
  });
  const comingUp = async (list: any) => (await today([list]).svc.forReader('u-rukia', 'r@x.test', 'org-1', 'MEMBER')).comingUp;

  it('is session 3 on 7 October, though a second-session row of somebody else opens on 4 October', async () => {
    const late = { id: 'c2-late', participantId: 'p-late', sessionNumber: 2, status: 'NOT_STARTED', isSetup: false, completedAt: null, availableFrom: new Date('2026-10-04T06:00:00Z') };
    const person = { id: 'p-late', userId: 'u-late', user: { firstName: 'Zawadi', lastName: 'Mutua' } };
    const c = await comingUp(listRow([person], [late]));
    expect(c[0]).toMatchObject({ what: 'The third check-in for “Sales team, Q3” opens.', at: '2026-10-07T06:00:00.000Z' });
    expect(JSON.stringify(c)).not.toMatch(/second check-in/);
  });

  it('is session 3 on 7 October, though somebody not let in has a second-session row on 4 October', async () => {
    const late = { id: 'c2-faraji', participantId: 'p-faraji', sessionNumber: 2, status: 'NOT_STARTED', isSetup: false, completedAt: null, availableFrom: new Date('2026-10-04T06:00:00Z') };
    const list: any = listRow([], [late]);
    list.participants = list.participants.map((p: any) => (p.id === 'p-faraji' ? { ...p, notLetIn: true } : p));
    const c = await comingUp(list);
    expect(c[0]).toMatchObject({ what: 'The third check-in for “Sales team, Q3” opens.', at: '2026-10-07T06:00:00.000Z' });
  });

  it('Amani reads her own next check-in, as hers', async () => {
    const r = await today([listRow()]).svc.forReader('u-amani', 'a@x.test', 'org-1', 'MEMBER');
    expect(r.comingUp[0]).toMatchObject({ at: '2026-10-07T06:00:00.000Z' });
    expect(r.comingUp[0].what).toMatch(/^Your /);
  });
});
