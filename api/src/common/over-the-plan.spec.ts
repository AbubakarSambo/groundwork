import { theOverThePlan, theOverThePlanSentence, whoIsOverThePlan } from './over-the-plan';
import { UsersService } from '../modules/users/users.service';

/**
 * REQUEST 197: WHO IS OVER THE PLAN, AND ONE SENTENCE FOR IT.
 * Eight people on a plan for five: the three most recently added are held, never an admin or anyone who runs a check-in.
 */
const day = (n: number) => new Date(`2026-09-${String(n).padStart(2, '0')}T09:00:00Z`);
const RELEASE = day(10); // amani, wairimu and the founder were here before it
const eight = [
  { userId: 'grace', role: 'ADMIN', joinedAt: day(20), runsACheckIn: false }, // newest, but the admin
  { userId: 'baraka', role: 'MEMBER', joinedAt: day(19), runsACheckIn: true }, // newest member, but runs a check-in
  { userId: 'kito', role: 'MEMBER', joinedAt: day(18), runsACheckIn: false },
  { userId: 'lerato', role: 'MEMBER', joinedAt: day(17), runsACheckIn: false },
  { userId: 'zawadi', role: 'GUEST', joinedAt: day(16), runsACheckIn: false },
  { userId: 'amani', role: 'MEMBER', joinedAt: day(5), runsACheckIn: false },
  { userId: 'wairimu', role: 'MEMBER', joinedAt: day(3), runsACheckIn: false },
  { userId: 'founder', role: 'ADMIN', joinedAt: day(1), runsACheckIn: true },
];

describe('who is over the plan', () => {
  it('holds the most recently added, three of them, and never the admin or a lead', () => {
    expect([...whoIsOverThePlan(eight, 5, RELEASE)].sort()).toEqual(['kito', 'lerato', 'zawadi']);
  });
  it('holds nobody at all when everyone was here before the release, however far over the plan', () => {
    expect(whoIsOverThePlan(eight, 2, day(25)).size).toBe(0);
    expect(whoIsOverThePlan(eight, 2, null).size).toBe(0);
  });
  it('holds only the ones added after the release, even when more are over', () => {
    expect([...whoIsOverThePlan(eight, 2, RELEASE)].sort()).toEqual(['kito', 'lerato', 'zawadi']);
  });
  it('holds nobody under the cap, at the cap or with no cap', () => {
    expect(whoIsOverThePlan(eight, 8, RELEASE).size).toBe(0);
    expect(whoIsOverThePlan(eight, null, RELEASE).size).toBe(0);
  });
  it('holds fewer when only admins and leads are left to hold, never them', () => {
    const few = eight.filter((p) => ['grace', 'baraka', 'founder', 'kito'].includes(p.userId));
    expect([...whoIsOverThePlan(few, 1, RELEASE)]).toEqual(['kito']);
  });
  it('says the same plain sentence for one person and for several', () => {
    expect(theOverThePlanSentence(3)).toBe('3 people are waiting for a seat because your plan is full. Choose a plan so everyone keeps checking in.');
    expect(theOverThePlanSentence(1)).toBe('1 person is waiting for a seat because your plan is full. Choose a plan so everyone keeps checking in.');
    expect(theOverThePlanSentence(0)).toBeNull();
  });
  it('reads the memberships and the check-ins people run, from the organisation', async () => {
    const prisma: any = {
      user: { findMany: jest.fn(async () => eight.map((p) => ({ id: p.userId, createdAt: day(1), role: 'MEMBER', memberships: [{ role: p.role, createdAt: p.joinedAt }] }))) },
      ground: { findMany: jest.fn(async () => [{ initiatorId: 'baraka', createdByUserId: null }, { initiatorId: 'founder', createdByUserId: 'grace' }]) },
    };
    const r = await theOverThePlan(prisma, 'org', {}, 5, RELEASE);
    expect(r.over).toBe(3);
    expect([...r.held].sort()).toEqual(['kito', 'lerato', 'zawadi']);
  });
});

describe('People marks exactly those rows and serves the sentence', () => {
  const row = (id: string, role: string, name: string) => ({
    role, heldForASeat: false,
    user: { id, email: `${id}@example.test`, firstName: name, lastName: null, isActive: true, isEmailVerified: true, createdAt: day(1), phoneNumber: null, awaitingOrgApproval: false },
  });
  const members = eight.map((p) => row(p.userId, p.role, p.userId));
  const make = (billing: any) => {
    const prisma: any = {
      organizationMembership: { findMany: jest.fn(async () => members), count: jest.fn(async () => members.length) },
      groundParticipant: { findMany: jest.fn(async () => []) },
      membershipRequest: { findMany: jest.fn(async () => []) },
      user: { findMany: jest.fn(async () => []) },
      ground: { findMany: jest.fn(async () => []) },
    };
    return new UsersService(prisma, {} as any, billing, {} as any, { emit: () => undefined } as any);
  };
  it('marks the three and says the sentence', async () => {
    const held = whoIsOverThePlan(eight, 5, RELEASE);
    const r: any = await make({ whoIsOverThePlan: async () => ({ over: 3, held, saying: theOverThePlanSentence(3) }) }).findAll('org', { page: 1, limit: 20 } as any, 'grace');
    expect(r.data.filter((m: any) => m.heldForASeat).map((m: any) => m.id).sort()).toEqual(['kito', 'lerato', 'zawadi']);
    expect(r.overThePlanSays).toBe('3 people are waiting for a seat because your plan is full. Choose a plan so everyone keeps checking in.');
  });
  it('marks nobody and says nothing when nobody is over', async () => {
    const r: any = await make({ whoIsOverThePlan: async () => ({ over: 0, held: new Set(), saying: null }) }).findAll('org', { page: 1, limit: 20 } as any, 'grace');
    expect(r.data.some((m: any) => m.heldForASeat)).toBe(false);
    expect(r.overThePlanSays).toBeNull();
  });
});
