import { UsersService } from '../users/users.service';
import { whoApprovesFor, mayApproveFor } from './who-approves';
import { theOneWhoDecides, theStepsFor } from './who-may-decide';
import { loadLookups } from './the-lookups';

/**
 * THE JOURNEY OF 12 OCTOBER: the admin set the leave approver to "Their manager", and set "Chidi
 * reports to Bola" on the People page. Nobody is in a staff directory. Chidi's request was sent "to an
 * admin", Bola's queue was empty, and only the admin could approve. The People page writes the
 * membership's reporting line; the suites read only the directory's manager. Here the line is set
 * through the same service the People page calls, and Bola is the one who approves.
 */

const ORG = 'org-j1';
type M = { id: string; userId: string; organizationId: string; role: string; reportsToUserId: string | null; level: string | null; team: string | null };

function anOrganisation() {
  const members: M[] = [
    { id: 'm-ada', userId: 'u-ada', organizationId: ORG, role: 'ADMIN', reportsToUserId: null, level: null, team: null },
    { id: 'm-bola', userId: 'u-bola', organizationId: ORG, role: 'LEAD', reportsToUserId: null, level: null, team: null },
    { id: 'm-chidi', userId: 'u-chidi', organizationId: ORG, role: 'MEMBER', reportsToUserId: null, level: null, team: null },
  ];
  const users = [
    { id: 'u-ada', firstName: 'Ada', lastName: 'Obi', email: 'ada@j1.test', organizationId: ORG, deletedAt: null },
    { id: 'u-bola', firstName: 'Bola', lastName: 'Ade', email: 'bola@j1.test', organizationId: ORG, deletedAt: null },
    { id: 'u-chidi', firstName: 'Chidi', lastName: 'Eze', email: 'chidi@j1.test', organizationId: ORG, deletedAt: null },
  ];
  const pick = (row: any, select?: any) => (select ? Object.fromEntries(Object.keys(select).map((k) => [k, row[k]])) : row);
  const prisma: any = {
    organizationMembership: {
      findUnique: jest.fn(async ({ where, select }: any) => {
        const k = where.userId_organizationId;
        const m = members.find((x) => x.userId === k.userId && x.organizationId === k.organizationId);
        return m ? pick(m, select) : null;
      }),
      findMany: jest.fn(async ({ where, select }: any) => members.filter((m) => m.organizationId === where.organizationId
        && (!where.userId?.in || where.userId.in.includes(m.userId))).map((m) => pick(m, select))),
      update: jest.fn(async ({ where, data }: any) => { const m = members.find((x) => x.id === where.id)!; Object.assign(m, data); return m; }),
    },
    user: {
      findUnique: jest.fn(async ({ where, select }: any) => { const u = users.find((x) => x.id === where.id); return u ? pick(u, select) : null; }),
      findMany: jest.fn(async ({ where, select }: any) => users.filter((u) => !where?.id?.in || where.id.in.includes(u.id)).map((u) => pick(u, select))),
    },
    person: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    organizationSuite: { findUnique: jest.fn(async () => ({ isOn: true, answers: { approver: 'Their manager' } })) },
    leaveRequest: { findMany: jest.fn(async () => []) },
    subject: { findMany: jest.fn(async () => []) },
    platformSetting: { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => null) },
  };
  const people = new UsersService(prisma, {} as any, {} as any, {} as any, { emit: jest.fn() } as any);
  return { prisma, people, members };
}

describe('the manager an admin sets on the People page approves leave', () => {
  it('before the line is set, the request goes to an admin', async () => {
    const { prisma } = anOrganisation();
    expect(await whoApprovesFor(prisma, { organizationId: ORG, personUserId: 'u-chidi' })).toEqual({ kind: 'admin' });
  });

  it('once "Chidi reports to Bola" is set, Bola approves, may decide, and his queue reads it as his', async () => {
    const { prisma, people } = anOrganisation();
    await people.setWhereTheySit(ORG, 'u-chidi', { reportsToUserId: 'u-bola' });

    expect(await whoApprovesFor(prisma, { organizationId: ORG, personUserId: 'u-chidi' })).toEqual({ kind: 'manager', userId: 'u-bola', firstName: 'Bola' });
    expect(await mayApproveFor(prisma, { organizationId: ORG, readerId: 'u-bola', readerRole: 'LEAD', personUserId: 'u-chidi' })).toBe(true);
    expect(await mayApproveFor(prisma, { organizationId: ORG, readerId: 'u-chidi', readerRole: 'MEMBER', personUserId: 'u-chidi' })).toBe(false);

    /* The boards and the queue answer from what is read once (the-lookups.ts): the same answer. */
    const lookups = await loadLookups(prisma, ORG, new Date('2026-10-12T09:00:00Z'));
    const who = await theOneWhoDecides(prisma, theStepsFor('leave')[0], { organizationId: ORG, requesterUserId: 'u-chidi', managerExternalId: null }, { lookups });
    expect(who).toMatchObject({ kind: 'manager', userId: 'u-bola', firstName: 'Bola' });
  });

  it('a line to somebody who is only a member does not make them an approver, and it still goes to an admin', async () => {
    const { prisma, people, members } = anOrganisation();
    members.find((m) => m.userId === 'u-bola')!.role = 'MEMBER';
    await people.setWhereTheySit(ORG, 'u-chidi', { reportsToUserId: 'u-bola' });
    expect(await whoApprovesFor(prisma, { organizationId: ORG, personUserId: 'u-chidi' })).toEqual({ kind: 'admin' });
  });
});
