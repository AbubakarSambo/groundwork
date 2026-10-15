import { GroundMode, GroundScenario, PartyType } from '@prisma/client';

/**
 * HOW THE LEADING IS LANDING IS SERVED ONLY AS PATTERNS ARE. Screens request 64.
 *
 * `managerAlignment` is a pattern about how the check-in is led, and it reached the wire outside
 * `sections` while patterns are switched off, for every reader. This builds the real board with the
 * leadership reads in the stored report, and reads what is served to the lead, a participant and an
 * admin who only reads: with patterns off, nobody gets it; with patterns on, only the lead does, and
 * only the reads seen in three periods (decision 8).
 */
const person = (id: string, userId: string, first: string, partyType: PartyType = PartyType.PARTICIPANT, managingOnly = false) => ({
  id, userId, partyType, email: `${id}@baridi.test`, roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null,
  managingOnly, signedOffAt: null, createdAt: new Date(partyType === PartyType.INITIATOR ? '2026-09-01T09:00:00Z' : '2026-09-01T10:00:00Z'),
  user: { firstName: first, lastName: 'Test' },
});
const PEOPLE = [person('p-lead', 'u-rukia', 'Rukia', PartyType.INITIATOR, true), person('p-amani', 'u-amani', 'Amani'), person('p-juma', 'u-juma', 'Juma')];

const THREE = 'One account describes a series of key decisions being deferred across several weeks, while other accounts are silent on the impact of the delay.';
const TWO = 'One account describes work being handed back unfinished, while another describes it as finished.';
const SETUP = 'One account describes a target of ten shops, and another describes a different one.';

function boardAs(mods: any, userId: string, role = 'MEMBER') {
  const ground: any = {
    id: 'g-1', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED,
    initiatorId: 'u-rukia', createdByUserId: 'u-rukia', organizationId: 'org-1',
    peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'WEEKLY',
    whoSeesTargets: 'EVERYBODY', label: 'Sales team, Q3', participants: PEOPLE, checkIns: [1, 2, 3].map((n) => ({ id: `ci${n}`, participantId: PEOPLE[0].id, sessionNumber: n, status: 'COMPLETED', isSetup: false, completedAt: new Date(`2026-09-0${n}T10:00:00Z`) })), objectives: [], dependencies: [], poll: null,
    report: {
      releasedAt: new Date('2026-09-23T17:00:00Z'), sharedPicture: 'Everybody describes the stock count as late.', agreements: [], divergences: [],
      engagement: {}, createdAt: new Date('2026-09-20T09:00:00Z'), updatedAt: new Date('2026-09-23T15:02:00Z'),
      leadershipGaps: [
        { pattern: 'CONVERSATION_DEFERRED', gap: THREE, periods: 3 },
        { pattern: 'WORK_NOT_HANDED_OVER', gap: TWO, periods: 2 },
        { pattern: 'SETUP_NEVER_SAID', gap: SETUP, periods: 1 },
      ],
    },
  };
  const reads = {
    findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })),
  };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own, update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})) });
  const prisma = new Proxy({
    ground: model({ findUnique: jest.fn(async () => JSON.parse(JSON.stringify(ground))) }),
    user: model({ findUnique: jest.fn(async () => ({ role, organizationId: 'org-1' })) }),
  } as any, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
  const reports = Object.create(mods.ReportsService.prototype);
  return new mods.BoardService(prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports)
    .get('g-1', userId) as Promise<any>;
}

function withTheSwitch(on: boolean) {
  let mods: any;
  jest.isolateModules(() => {
    jest.doMock('../patterns/patterns-are-served', () => ({ PATTERNS_ARE_SERVED: on }));
    mods = {
      BoardService: require('./board.service').BoardService,
      ReportsService: require('../reports/reports.service').ReportsService,
    };
  });
  jest.dontMock('../patterns/patterns-are-served');
  return mods;
}

const READERS: Array<[string, string, string]> = [
  ['the lead', 'u-rukia', 'MEMBER'],
  ['a participant', 'u-amani', 'MEMBER'],
  ['an admin who only reads', 'u-grace', 'ADMIN'],
];

describe('with patterns switched off, as they are', () => {
  const mods = withTheSwitch(false);
  it.each(READERS)('%s is served no read of how the check-in is led', async (_who, userId, role) => {
    const board = await boardAs(mods, userId, role);
    expect(board).not.toHaveProperty('managerAlignment');
    const served = JSON.stringify(board);
    for (const gap of [THREE, TWO, SETUP]) expect(served).not.toContain(gap);
  });
});

describe('with patterns switched on', () => {
  const mods = withTheSwitch(true);
  /*
   * Decision 57, item 7 (30 September 2026): SETUP_NEVER_SAID only ever has one period, so the
   * three-period floor below is never a reason to hold it back - it is restored, not just kept off
   * the discard pile inside `buildManagerAlignment`. WORK_NOT_HANDED_OVER at two periods is still
   * not enough: it is a behaviour, and one period of that really might be nothing.
   */
  it('the lead reads the one seen in three periods and the setup gap, and not the one seen fewer times', async () => {
    const board = await boardAs(mods, 'u-rukia');
    expect(board.managerAlignment.map((m: any) => m.gap)).toEqual([THREE, SETUP]);
    expect(board.managerAlignment[0].periods).toBe(3);
    expect(board.managerAlignment[1].periods).toBe(1);
  });

  it.each(READERS.slice(1))('%s is still served none of it', async (_who, userId, role) => {
    const board = await boardAs(mods, userId, role);
    expect(board).not.toHaveProperty('managerAlignment');
    expect(JSON.stringify(board)).not.toContain(THREE);
    expect(JSON.stringify(board)).not.toContain(SETUP);
  });
});
