import { GroundsService } from './grounds.service';
import { BoardService } from '../board/board.service';
import { ReportsService } from '../reports/reports.service';
import { ResolutionService } from '../resolution/resolution.service';
import { GroundMode, PartyType } from '@prisma/client';
import { whatTheyMayRead, runsIt, groundsAViewerMayList, askedToApproveIt } from './who-may-read-this-check-in';

/**
 * DECISION 75, ITEM 2: THE ADMIN ASKED TO APPROVE AN EVALUATION CHECK-IN READS WHAT THEY ARE APPROVING.
 *
 * A performance plan, a promotion or renewal, or a probation (item 25) set up by a lead who is not an admin
 * waits for an admin to accept it. Before this, an admin who did not run it or set it up could not even see it
 * in the approval queue, so it waited for ever. Now every admin of the organisation is asked while it waits, and
 * reads it as an admin with access does; once decided, only the admin who decided keeps that access. Reading
 * only: they still cannot change its setup. Nobody else gains anything.
 *
 * Every reader is served the real routes: the lead (a member), the person reviewed, a colleague, a guest, an
 * admin who only reads, the admin who set it up, and the admin asked to approve.
 */
const LEAD = 'u-lead';
const SETTER = 'u-setter';
const APPROVER = 'u-approver';
const OTHER_ADMIN = 'u-other-admin';
const SUBJECT = 'u-sub';
const COLLEAGUE = 'u-colleague';
const GUEST = 'u-guest';

const party = (id: string, userId: string, type: PartyType, n: number) => ({
  id, userId, email: `${id}@x.test`, partyType: type, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: false,
  invitedAt: new Date(), notifiedAt: new Date(), soloArtifactAt: null, soloArtifactShared: false, createdAt: new Date(`2026-09-0${n}`),
  user: { firstName: id, lastName: 'X' },
});

type State = { status: string; approvedById: string | null; createdByUserId?: string | null };
const WAITING: State = { status: 'AWAITING_APPROVAL', approvedById: null, createdByUserId: null };
const APPROVED: State = { status: 'OPEN', approvedById: APPROVER, createdByUserId: null };

function groundOf(scenario: string, st: State) {
  const people = st.status === 'AWAITING_APPROVAL'
    ? [party('p-lead', LEAD, PartyType.INITIATOR, 1)]
    : [party('p-lead', LEAD, PartyType.INITIATOR, 1), party('p-sub', SUBJECT, PartyType.PARTICIPANT, 2), party('p-col', COLLEAGUE, PartyType.PARTICIPANT, 3)];
  return {
    id: 'g1', scenario, mode: GroundMode.SHARED, organizationId: 'org1', initiatorId: LEAD, createdByUserId: st.createdByUserId ?? null, createdAt: new Date(),
    label: 'Review', cadence: 'WEEKLY', timelineDays: 90, peersVisibleToEachOther: false, restrictExternalVisibility: false,
    participants: people, checkIns: [], objectives: [], dependencies: [], poll: null, report: null, resolution: null, patternDetections: [],
    status: st.status, approvedById: st.approvedById, brief: 'Daniel has missed the last three client deadlines.',
  };
}
const roleOf = (u: string) => ([OTHER_ADMIN, SETTER, APPROVER].includes(u) ? 'ADMIN' : u === GUEST ? 'GUEST' : u === LEAD ? 'LEAD' : 'MEMBER');
const orgOf = (u: string) => (u === GUEST ? 'org-guest' : 'org1');

function groundsService(scenario: string, st: State, calls: any = {}) {
  const ground = groundOf(scenario, st);
  const own: any = {
    groundBaseline: { findFirst: async () => null },
    personObjective: { findMany: async () => [] },
    ground: {
      findFirst: jest.fn(async (a: any) => { calls.findFirst = a; return JSON.parse(JSON.stringify(ground)); }),
      findUnique: jest.fn(async () => JSON.parse(JSON.stringify(ground))),
      findMany: jest.fn(async (a: any) => { calls.findMany = a; return []; }),
      update: jest.fn(async (a: any) => { calls.update = a; return { id: 'g1', status: a.data.status }; }),
    },
    user: { findUnique: jest.fn(async ({ where }: any) => ({ role: roleOf(where.id), organizationId: orgOf(where.id), email: null })) },
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
  return new GroundsService(prisma, { sendGroundApproved: async () => undefined } as any, {} as any, {} as any, {} as any, { get: () => '' } as any, { respond: async () => '' } as any);
}

function boardService(scenario: string, st: State) {
  const ground = groundOf(scenario, st);
  const reads = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })) };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own });
  const prisma: any = new Proxy({
    ground: model({ findUnique: jest.fn(async () => JSON.parse(JSON.stringify(ground))) }),
    user: model({ findUnique: jest.fn(async ({ where }: any) => ({ role: roleOf(where.id), organizationId: orgOf(where.id) })) }),
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

function resolutionService(scenario: string, st: State) {
  const ground = groundOf(scenario, st);
  const prisma: any = {
    ground: { findUnique: async () => ground },
    groundParticipant: { findFirst: async ({ where }: any) => (ground.participants.some((p) => p.userId === where.userId) ? { id: 'p' } : null) },
    user: { findFirst: async ({ where }: any) => (roleOf(where.id) === 'ADMIN' ? { role: 'ADMIN', organizationId: 'org1' } : null) },
  };
  const svc: any = new ResolutionService(prisma, {} as any, {} as any, {} as any, {} as any);
  svc.buildState = async () => ({ outcome: 'the outcome and its reasons' });
  return svc as ResolutionService;
}

const SCENARIOS = [['a performance plan', 'PIP'], ['a promotion', 'RECOGNITION'], ['a renewal', 'CONTRACT_RENEWAL'], ['a probation', 'NEW_HIRE']];

describe.each(SCENARIOS)('%s waiting for an admin to accept it', (_l, scenario) => {
  const st = WAITING;
  const view = (userId: string) => whatTheyMayRead(userId, { userId, role: roleOf(userId), organizationId: orgOf(userId) }, groundOf(scenario, st) as any);

  it('the admin asked to approve it reads it as an admin with access does, and runs nothing', () => {
    expect(view(APPROVER)).toBe('lead');
    expect(view(OTHER_ADMIN)).toBe('lead'); // every admin of the organisation is asked while it waits
    expect(runsIt(APPROVER, { role: 'ADMIN', organizationId: 'org1' }, groundOf(scenario, st) as any)).toBe(false);
  });

  it('nobody else gains anything: a guest and an admin of another organisation read nothing', () => {
    expect(view(GUEST)).toBeNull();
    expect(whatTheyMayRead('u-stranger', { userId: 'u-stranger', role: 'ADMIN', organizationId: 'org-other' }, groundOf(scenario, st) as any)).toBeNull();
    expect(whatTheyMayRead('u-member', { userId: 'u-member', role: 'MEMBER', organizationId: 'org1' }, groundOf(scenario, st) as any)).toBeNull();
  });

  it('is in the approval queue of an admin who was not given access, so they can approve it', async () => {
    const queue: any = {};
    await groundsService(scenario, st, queue).listAwaitingApproval('org1', APPROVER);
    expect(queue.findMany.where.OR).toContainEqual({ status: 'AWAITING_APPROVAL' });
    const svc = groundsService(scenario, st);
    await expect(svc.approve('g1', 'org1', APPROVER)).resolves.toMatchObject({ status: 'OPEN', alreadyDecided: false });
  });

  it('its page, its board and its outcome are served to the admin asked to approve it', async () => {
    const page: any = await groundsService(scenario, st).get('g1', 'org1', APPROVER);
    expect(page).toMatchObject({ id: 'g1' });
    expect(page.brief).toBe('Daniel has missed the last three client deadlines.');
    await expect(boardService(scenario, st).get('g1', APPROVER)).resolves.toBeTruthy();
    await expect(resolutionService(scenario, st).get('g1', APPROVER)).resolves.toMatchObject({ outcome: 'the outcome and its reasons' });
  });

  it('the admin asked to approve it cannot change its setup', async () => {
    await expect(groundsService(scenario, st).setPeerVisibility('g1', APPROVER, true))
      .rejects.toThrow('Only the person who runs this check-in can change how it is set up. An admin can only do that once that person has left the organisation. Nothing was changed.');
  });
});

describe.each(SCENARIOS)('%s after the admin accepted it', (_l, scenario) => {
  const st = APPROVED;
  const view = (userId: string, s: State = st) => whatTheyMayRead(userId, { userId, role: roleOf(userId), organizationId: orgOf(userId) }, groundOf(scenario, s) as any);

  it('each reader reads what they read before, and the admin who accepted it keeps reading it', () => {
    expect(view(LEAD)).toBe('lead');
    expect(view(SUBJECT)).toBe('own');
    expect(view(COLLEAGUE)).toBe('own');
    expect(view(APPROVER)).toBe('lead');
    /* An admin who only reads, who was asked and did not decide, goes back to reading nothing. */
    expect(view(OTHER_ADMIN)).toBeNull();
    expect(view(GUEST)).toBeNull();
    /* The admin who set it up reads it as before. */
    expect(view(SETTER, { ...st, createdByUserId: SETTER })).toBe('lead');
  });

  it('an admin who only reads is refused the page, the board and the outcome; the admin who accepted it is served them', async () => {
    await expect(groundsService(scenario, st).get('g1', 'org1', OTHER_ADMIN)).rejects.toThrow('Check-in not found');
    await expect(boardService(scenario, st).get('g1', OTHER_ADMIN)).rejects.toThrow('Check-in not found');
    await expect(resolutionService(scenario, st).get('g1', OTHER_ADMIN)).rejects.toThrow('You are not part of this check-in.');
    await expect(groundsService(scenario, st).get('g1', 'org1', APPROVER)).resolves.toMatchObject({ id: 'g1' });
    await expect(boardService(scenario, st).get('g1', APPROVER)).resolves.toBeTruthy();
    await expect(resolutionService(scenario, st).get('g1', APPROVER)).resolves.toBeTruthy();
  });

  it('the list for an admin carries the one they decided, and nothing else they were not given', () => {
    const where: any = groundsAViewerMayList(APPROVER, { role: 'ADMIN', organizationId: 'org1' }, 'org1');
    expect(where.OR).toContainEqual({ approvedById: APPROVER });
    expect(where.OR).toContainEqual({ status: 'AWAITING_APPROVAL' });
    const member: any = groundsAViewerMayList(SUBJECT, { role: 'MEMBER', organizationId: 'org1' }, 'org1');
    /* A member is never given a waiting check-in: nothing in their list lets one in, and since B-126 their
       roster line says so outright by leaving waiting ones out. */
    expect(member.OR).not.toContainEqual({ status: 'AWAITING_APPROVAL' });
    expect(JSON.stringify(member)).toContain('{"not":"AWAITING_APPROVAL"}');
    expect(JSON.stringify(member)).not.toContain('approvedById');
  });
});

describe('an ordinary team check-in, as a control', () => {
  it('nothing about approval changes who reads it', () => {
    const g: any = groundOf('OKR_ALIGNMENT', WAITING);
    expect(askedToApproveIt({ userId: APPROVER, role: 'ADMIN', organizationId: 'org1' }, g)).toBe(false);
    expect(whatTheyMayRead(OTHER_ADMIN, { role: 'ADMIN', organizationId: 'org1' }, g)).toBe('lead');
  });

  it('a caller that does not say whether it waits grants nothing', () => {
    const g: any = { ...groundOf('PIP', WAITING), status: undefined };
    expect(whatTheyMayRead(APPROVER, { role: 'ADMIN', organizationId: 'org1' }, g)).toBeNull();
  });
});
