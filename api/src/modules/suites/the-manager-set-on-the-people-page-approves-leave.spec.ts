import { UsersService } from '../users/users.service';
import { whoApprovesFor } from './who-approves';
import { decidesIt, theOneWhoDecides, theStepsFor } from './who-may-decide';
import { loadLookups } from './the-lookups';
import { ApprovalsQueueService } from './the-approvals-queue.service';
import { LeaveBoardService } from './the-leave-board.service';

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
  /* Chidi asked for leave from Monday 19 October to Wednesday 21 October; it waits. */
  const leave: any[] = [{
    id: 'leave-1', organizationId: ORG, userId: 'u-chidi', status: 'waiting', startsOn: new Date('2026-10-19T00:00:00Z'), endsOn: new Date('2026-10-21T00:00:00Z'),
    step: 0, escalatedTo: 0, approvedByIds: [], askedAt: new Date('2026-10-12T08:00:00Z'), stepSince: new Date('2026-10-12T08:00:00Z'), decidedById: null,
  }];
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
    organizationSuite: {
      findUnique: jest.fn(async ({ where }: any) => (where?.organizationId_suite?.suite ?? 'leave') === 'leave' ? { isOn: true, answers: { approver: 'Their manager' } } : null),
      findMany: jest.fn(async () => [{ suite: 'leave', isOn: true, answers: { approver: 'Their manager' } }]),
    },
    leaveRequest: {
      findMany: jest.fn(async ({ where }: any) => leave.filter((r) => !where?.status || r.status === where.status)),
      findUnique: jest.fn(async ({ where }: any) => leave.find((r) => r.id === where.id) ?? null),
      updateMany: jest.fn(async ({ where, data }: any) => { const r = leave.find((x) => x.id === where.id && x.status === 'waiting'); if (!r) return { count: 0 }; Object.assign(r, data); return { count: 1 }; }),
    },
    subject: { findMany: jest.fn(async () => []) },
    platformSetting: { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => null) },
  };
  const people = new UsersService(prisma, {} as any, {} as any, {} as any, { emit: jest.fn() } as any);
  return { prisma, people, members, leave };
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
    /* mayApproveFor had no caller and is gone (Batch S, S2); the one resolver says the same through decidesIt. */
    const decides = await theOneWhoDecides(prisma, theStepsFor('leave')[0], { organizationId: ORG, requesterUserId: 'u-chidi' });
    expect(decidesIt(decides, { userId: 'u-bola', role: 'LEAD' }, 'u-chidi')).toBe(true);
    expect(decidesIt(decides, { userId: 'u-chidi', role: 'MEMBER' }, 'u-chidi')).toBe(false);

    /* The boards and the queue answer from what is read once (the-lookups.ts): the same answer. */
    const lookups = await loadLookups(prisma, ORG, new Date('2026-10-12T09:00:00Z'));
    const who = await theOneWhoDecides(prisma, theStepsFor('leave')[0], { organizationId: ORG, requesterUserId: 'u-chidi', managerExternalId: null }, { lookups });
    expect(who).toMatchObject({ kind: 'manager', userId: 'u-bola', firstName: 'Bola' });
  });

  /* Changed for Batch S, S2 (Hafsah, 19 November 2026: "approvals that follow the role map"): a manager who signs in as a member
     decides for the people who report to them. Before, they were skipped and the request went to an admin in silence. */
  it('a line to somebody who signs in as a member makes them the approver, whatever their app role', async () => {
    const { prisma, people, members } = anOrganisation();
    members.find((m) => m.userId === 'u-bola')!.role = 'MEMBER';
    await people.setWhereTheySit(ORG, 'u-chidi', { reportsToUserId: 'u-bola' });
    expect(await whoApprovesFor(prisma, { organizationId: ORG, personUserId: 'u-chidi' })).toEqual({ kind: 'manager', userId: 'u-bola', firstName: 'Bola' });
  });

  /* Batch S, round 2, T7 (W13): People showed "Reports to Nobody" for Amani while her leave went to Wairimu, because the page read
     only the line set on it and the approvals also read the staff directory. Both now read one line. */
  it('People shows the manager the staff directory names, the same person who approves the leave', async () => {
    const { prisma, people } = anOrganisation();
    const entries = [
      { externalId: 'p-bola', linkedUserId: 'u-bola', email: null, title: 'Head of Sales', department: 'Sales', managerExternalId: null, givenName: 'Bola', displayName: 'Bola Ade', active: true },
      { externalId: 'p-chidi', linkedUserId: 'u-chidi', email: null, title: 'Sales executive', department: 'Sales', managerExternalId: 'p-bola', givenName: 'Chidi', displayName: 'Chidi Eze', active: true },
    ];
    const matches = (e: any, w: any) => Object.entries(w ?? {}).every(([k, v]) => v === undefined || k === 'active' || k === 'organizationId'
      || (v && typeof v === 'object' && Array.isArray((v as any).in) ? (v as any).in.includes(e[k]) : e[k] === v));
    prisma.person.findMany = jest.fn(async ({ where }: any) => entries.filter((e) => matches(e, where)));
    prisma.person.findFirst = jest.fn(async ({ where }: any) => entries.find((e) => matches(e, where)) ?? null);
    expect((await people.whereTheySit(ORG, ['u-chidi'])).get('u-chidi')).toMatchObject({ reportsTo: { id: 'u-bola' }, team: 'Sales' });
    expect(await whoApprovesFor(prisma, { organizationId: ORG, personUserId: 'u-chidi' })).toMatchObject({ kind: 'manager', userId: 'u-bola' });
  });

  it('on the screen: Bola\'s "Waiting for you to decide" queue holds Chidi\'s leave, in a full sentence, and his Approve is kept', async () => {
    const { prisma, people, leave } = anOrganisation();
    await people.setWhereTheySit(ORG, 'u-chidi', { reportsToUserId: 'u-bola' });
    const today = new Date('2026-10-12T09:00:00Z');
    const queue = new ApprovalsQueueService(prisma);

    const bola = await queue.queue({ userId: 'u-bola', organizationId: ORG }, {}, today);
    expect(bola.says).toBe('One request is waiting for you to approve or decline.');
    expect(bola.items.map((i) => i.says)).toEqual(['Chidi asked for leave from Monday 19 October to Wednesday 21 October, which is 3 working days.']);
    /* Nobody else reads it as theirs: not the admin, not Chidi. */
    expect((await queue.queue({ userId: 'u-ada', organizationId: ORG }, {}, today)).counts.all).toBe(0);
    expect((await queue.queue({ userId: 'u-chidi', organizationId: ORG }, {}, today)).counts.all).toBe(0);

    /* Approve, as the queue's button sends it (the leave route). Chidi may not approve his own. */
    const board = new LeaveBoardService(prisma);
    await expect(board.decide({ userId: 'u-chidi', organizationId: ORG } as any, 'leave-1', 'approved', undefined, { lean: true })).rejects.toThrow();
    await board.decide({ userId: 'u-bola', organizationId: ORG } as any, 'leave-1', 'approved', undefined, { lean: true });
    expect(leave[0]).toMatchObject({ status: 'approved', decidedById: 'u-bola' });
    expect((await queue.queue({ userId: 'u-bola', organizationId: ORG }, {}, today)).says).toBe('Nothing is waiting for you to approve or decline.');
  });
});

/*
 * POLISH ROUND 1 (26 October 2026): Brian joined without a first or last name on his sign-in, and the queue counted his request and never
 * showed it. A request is never dropped for want of a name: it reads by the staff list, the name given in a check-in, or the address.
 */
describe('a request from somebody whose sign-in has no name', () => {
  it('is still in the approver\'s queue, by the first part of their address', async () => {
    const { prisma, people } = anOrganisation();
    await people.setWhereTheySit(ORG, 'u-chidi', { reportsToUserId: 'u-bola' });
    const before = prisma.user.findMany;
    prisma.user.findMany = jest.fn(async (a: any) => (await before(a)).map((u: any) => (u.id === 'u-chidi' ? { ...u, firstName: null, lastName: null } : u)));
    const bola = await new ApprovalsQueueService(prisma).queue({ userId: 'u-bola', organizationId: ORG }, {}, new Date('2026-10-12T09:00:00Z'));
    expect(bola.counts.all).toBe(1);
    expect(bola.items.map((i) => i.says)).toEqual(['Chidi asked for leave from Monday 19 October to Wednesday 21 October, which is 3 working days.']);
  });
});
