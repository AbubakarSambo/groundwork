import { GroundsService } from './grounds.service';
import { BoardService } from '../board/board.service';
import { ReportsService } from '../reports/reports.service';
import { ResolutionService } from '../resolution/resolution.service';
import { GroundMode, PartyType } from '@prisma/client';

/**
 * DECISION 5, REQUEST 78: THE CHECK-IN, ITS LIST AND ITS BOARD, FOR AN ADMIN WHO WAS NOT GIVEN ACCESS.
 *
 * A performance plan, a promotion and a renewal are not read by an admin of the organisation unless that
 * admin runs it, set it up or takes part in it. Without access it is as if they were not an admin: the
 * check-in is not listed, its page and its board are refused, and the outcome is refused. The admin who set
 * it up reads it. An ordinary team check-in is read by every admin as before.
 */
const LEAD = 'u-lead';
const SETTER = 'u-setter';
const OTHER_ADMIN = 'u-other-admin';

const party = (id: string, userId: string, type: PartyType, n: number) => ({
  id, userId, email: `${id}@x.test`, partyType: type, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: false,
  invitedAt: new Date(), notifiedAt: new Date(), soloArtifactAt: null, soloArtifactShared: false, createdAt: new Date(`2026-09-0${n}`),
  user: { firstName: id, lastName: 'X' },
});
const people = () => [party('p-lead', LEAD, PartyType.INITIATOR, 1), party('p-sub', 'u-sub', PartyType.PARTICIPANT, 2)];

function groundOf(scenario: string) {
  return {
    id: 'g1', scenario, mode: GroundMode.SHARED, organizationId: 'org1', initiatorId: LEAD, createdByUserId: SETTER, createdAt: new Date(),
    label: 'Review', cadence: 'WEEKLY', timelineDays: 90, peersVisibleToEachOther: false, restrictExternalVisibility: false,
    participants: people(), checkIns: [], objectives: [], dependencies: [], poll: null, report: null, resolution: null, patternDetections: [],
    status: 'OPEN',
  };
}
const roleOf = (u: string) => (u === OTHER_ADMIN || u === SETTER ? 'ADMIN' : 'MEMBER');

function groundsService(scenario: string, calls: any = {}) {
  const ground = groundOf(scenario);
  const own: any = {
    groundBaseline: { findFirst: async () => null },
    personObjective: { findMany: async () => [] },
    ground: {
      findFirst: jest.fn(async (a: any) => { calls.findFirst = a; return JSON.parse(JSON.stringify(ground)); }),
      findUnique: jest.fn(async () => JSON.parse(JSON.stringify(ground))),
      findMany: jest.fn(async (a: any) => { calls.findMany = a; return []; }),
    },
    user: { findUnique: jest.fn(async ({ where }: any) => ({ role: roleOf(where.id), organizationId: 'org1' })) },
    groundParticipant: { findFirst: async () => null, findMany: async () => [] },
    organization: { findUnique: async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false }) },
    leadContextNote: { findMany: async () => [] },
  };
  const prisma: any = new Proxy(own, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) {
        target[prop] = { findMany: async () => [], findFirst: async () => null, findUnique: async () => null, count: async () => 0, aggregate: async () => ({ _max: {} }) };
      }
      return target[prop];
    },
  });
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any);
}

function boardService(scenario: string) {
  const ground = groundOf(scenario);
  const reads = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })) };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own });
  const prisma: any = new Proxy({
    ground: model({ findUnique: jest.fn(async () => JSON.parse(JSON.stringify(ground))) }),
    user: model({ findUnique: jest.fn(async ({ where }: any) => ({ role: roleOf(where.id), organizationId: 'org1' })) }),
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
  const reports = Object.create(ReportsService.prototype) as ReportsService;
  (reports as any).coachingForTheBoard = async () => null;
  return new BoardService(prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports);
}

function resolutionService(scenario: string) {
  const ground = groundOf(scenario);
  const prisma: any = {
    ground: { findUnique: async () => ground },
    groundParticipant: { findFirst: async () => null },
    user: { findFirst: async ({ where }: any) => (roleOf(where.id) === 'ADMIN' ? { role: 'ADMIN', organizationId: 'org1' } : null) },
  };
  const svc: any = new ResolutionService(prisma, {} as any, {} as any, {} as any, {} as any);
  svc.buildState = async () => ({ outcome: 'the outcome and its reasons' });
  return svc as ResolutionService;
}

describe.each([['a performance plan', 'PIP'], ['a promotion', 'RECOGNITION'], ['a renewal', 'CONTRACT_RENEWAL'], ['a probation (decision 75, item 25)', 'NEW_HIRE']])('%s', (_l, scenario) => {
  it('is not listed to an admin who was not given access, and is to the admin who set it up', async () => {
    const calls: any = {};
    await groundsService(scenario, calls).list('org1', OTHER_ADMIN, undefined, 'ADMIN');
    const where = calls.findMany.where;
    expect(where.OR[0]).toEqual({ scenario: { notIn: expect.arrayContaining(['PIP', 'RECOGNITION', 'CONTRACT_RENEWAL']) } });
    expect(where.OR).toContainEqual({ createdByUserId: OTHER_ADMIN });
    expect(where.OR).toContainEqual({ initiatorId: OTHER_ADMIN });
    expect(where.OR).toContainEqual({ participants: { some: { userId: OTHER_ADMIN } } });
  });

  it('is left out of the organisation roster and the approval queue for an admin without access', async () => {
    const calls: any = {};
    await groundsService(scenario, calls).getOrgRoster('org1', OTHER_ADMIN);
    expect(JSON.stringify(calls.findMany.where)).toContain('notIn');
    const queue: any = {};
    await groundsService(scenario, queue).listAwaitingApproval('org1', OTHER_ADMIN);
    expect(JSON.stringify(queue.findMany.where)).toContain('notIn');
  });

  it('cannot be approved by an admin who was not given access', async () => {
    const svc = groundsService(scenario);
    (svc as any).prisma.ground.findFirst = jest.fn(async () => null);
    await expect(svc.approve('g1', 'org1', OTHER_ADMIN)).rejects.toThrow('Check-in not found');
    await expect(svc.declineGround('g1', 'org1', OTHER_ADMIN)).rejects.toThrow('Check-in not found');
  });

  it('GET /grounds/:id is refused to an admin without access and served to the one who set it up', async () => {
    await expect(groundsService(scenario).get('g1', 'org1', OTHER_ADMIN)).rejects.toThrow('Check-in not found');
    await expect(groundsService(scenario).get('g1', 'org1', SETTER)).resolves.toMatchObject({ id: 'g1' });
  });

  it('its board is refused to an admin without access and served to the one who set it up', async () => {
    await expect(boardService(scenario).get('g1', OTHER_ADMIN)).rejects.toThrow('Check-in not found');
    await expect(boardService(scenario).get('g1', SETTER)).resolves.toBeTruthy();
  });

  it('its outcome and reasons are refused to an admin without access', async () => {
    await expect(resolutionService(scenario).get('g1', OTHER_ADMIN)).rejects.toThrow('You are not part of this check-in.');
    await expect(resolutionService(scenario).get('g1', SETTER)).resolves.toMatchObject({ outcome: 'the outcome and its reasons' });
  });
});

describe('an ordinary team check-in, as a control', () => {
  it('is listed, opened and shown on its board to any admin of the organisation', async () => {
    const calls: any = {};
    await groundsService('OKR_ALIGNMENT', calls).list('org1', OTHER_ADMIN, undefined, 'ADMIN');
    await expect(groundsService('OKR_ALIGNMENT').get('g1', 'org1', OTHER_ADMIN)).resolves.toMatchObject({ id: 'g1' });
    await expect(boardService('OKR_ALIGNMENT').get('g1', OTHER_ADMIN)).resolves.toBeTruthy();
    await expect(resolutionService('OKR_ALIGNMENT').get('g1', OTHER_ADMIN)).resolves.toBeTruthy();
  });
});
