import { BadRequestException } from '@nestjs/common';
import { LeaveBoardService } from './the-leave-board.service';
import { SpendingService } from './the-spending.service';
import { NOBODY_ELSE_CAN_DECIDE } from './who-may-decide';

/**
 * THE ONLY ADMIN'S OWN REQUEST (B-005). Grace is the only admin of Fieldnote Studio and has no manager.
 * Nobody decides their own request, and nobody else could, so it used to be "sent to an admin" and wait for ever.
 * She is told at once, in the words below, and nothing is kept. When a second admin exists it is sent as before.
 */
const ORG = 'org';
function bed(otherAdmins: number, suite: 'leave' | 'spend') {
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async ({ where }: any) => (where.organizationId_suite.suite === suite ? { isOn: true, answers: { days: 21, approver: 'An admin' } } : null)) },
    /* Admins are counted by their membership, the role every board reads (who-may-decide.ts, nobodyElseCanDecide); this fixture counted the account's own role. */
    organizationMembership: { findUnique: jest.fn(async () => ({ role: 'ADMIN' })), count: jest.fn(async () => otherAdmins) },
    person: { findFirst: jest.fn(async () => ({ linkedUserId: 'u-grace', externalId: 'p-grace', department: null, managerExternalId: null, active: true })), findMany: jest.fn(async () => []) },
    user: { count: jest.fn(async () => otherAdmins), findMany: jest.fn(async () => []) },
    leaveRequest: { create: jest.fn(async () => ({ id: 'r1' })), findMany: jest.fn(async () => []) },
    spendRequest: { create: jest.fn(async () => ({ id: 's1' })), findMany: jest.fn(async () => []) },
  };
  return prisma;
}

describe('the only admin asks for leave', () => {
  it('is told nobody else could decide it, and nothing is kept', async () => {
    const prisma = bed(0, 'leave');
    await expect(new LeaveBoardService(prisma).ask(ORG, 'u-grace', { startsOn: '2026-12-14', endsOn: '2026-12-16' })).rejects.toThrow(new BadRequestException(NOBODY_ELSE_CAN_DECIDE));
    expect(prisma.leaveRequest.create).not.toHaveBeenCalled();
  });
  it('sends it as before when there is a second admin', async () => {
    const prisma = bed(1, 'leave');
    await expect(new LeaveBoardService(prisma).ask(ORG, 'u-grace', { startsOn: '2026-12-14', endsOn: '2026-12-16' })).resolves.toEqual({ id: 'r1' });
  });
  it('says it in plain full sentences', () => {
    expect(NOBODY_ELSE_CAN_DECIDE).toBe('Nobody else can decide this one, because you are the only admin and nobody is named to approve your requests. Add another admin, or name someone to approve it in the suite’s settings, and then ask again.');
  });
});

describe('the only admin asks to spend', () => {
  it('is told the same, and nothing is kept', async () => {
    const prisma = bed(0, 'spend');
    await expect(new SpendingService(prisma).ask(ORG, 'u-grace', { amount: 5000, what: 'A new chair' })).rejects.toThrow(new BadRequestException(NOBODY_ELSE_CAN_DECIDE));
    expect(prisma.spendRequest.create).not.toHaveBeenCalled();
  });
});

import { sayBackLeave } from './leave-said-in-chat';

describe('the only admin asking for leave in a chat (B-137)', () => {
  it('is told at the say-back, not offered "send it to an admin"', async () => {
    const prisma = bed(0, 'leave');
    prisma.organizationSuite.findUnique = jest.fn(async () => ({ isOn: true, answers: { approver: 'An admin' } }));
    const leave: any = { mine: async () => ({ daysLeft: 21 }), ask: jest.fn() };
    const out = await sayBackLeave(prisma, leave, { userId: 'u-grace', organizationId: ORG }, { startsOn: '2026-11-02', endsOn: '2026-11-04' }, new Date('2026-10-07T09:00:00Z'));
    expect(out).toEqual({ ok: false, say: NOBODY_ELSE_CAN_DECIDE });
    expect(leave.ask).not.toHaveBeenCalled();
  });
});

describe('the same request sent twice while the first waits (B-147)', () => {
  it('is the first request, and the approver is told once', async () => {
    const leave = bed(1, 'leave');
    leave.leaveRequest.findFirst = jest.fn(async () => ({ id: 'r-already' }));
    const told = jest.fn();
    const svc: any = new LeaveBoardService(leave, { tell: told } as any);
    await expect(svc.ask(ORG, 'u-grace', { startsOn: '2026-12-14', endsOn: '2026-12-16' })).resolves.toEqual({ id: 'r-already' });
    expect(leave.leaveRequest.create).not.toHaveBeenCalled();
    expect(told).not.toHaveBeenCalled();
    const spend = bed(1, 'spend');
    spend.spendRequest.findFirst = jest.fn(async () => ({ id: 's-already' }));
    await expect(new SpendingService(spend).ask(ORG, 'u-grace', { amount: 15000, what: 'A new chair' })).resolves.toEqual({ id: 's-already' });
    expect(spend.spendRequest.create).not.toHaveBeenCalled();
  });
});

describe('three identical requests at the same moment (B-147)', () => {
  it('make one', async () => {
    const prisma = bed(1, 'leave');
    let made = 0;
    prisma.leaveRequest.create = jest.fn(async () => { made += 1; await new Promise((r) => setTimeout(r, 20)); return { id: `r${made}` }; });
    const svc = new LeaveBoardService(prisma);
    const out = await Promise.all([1, 2, 3].map(() => svc.ask(ORG, 'u-grace', { startsOn: '2026-12-14', endsOn: '2026-12-16' })));
    expect(made).toBe(1);
    expect(new Set(out.map((o) => o.id)).size).toBe(1);
  });
});

describe('leave for days long gone (B-148)', () => {
  it('is refused in a sentence, and yesterday is still taken', async () => {
    const prisma = bed(1, 'leave');
    const svc = new LeaveBoardService(prisma);
    await expect(svc.ask(ORG, 'u-grace', { startsOn: '2025-01-01', endsOn: '2025-01-02' })).rejects.toThrow('Those days ended more than a month ago, so they cannot be asked for now. Give days from the last month onwards.');
    const y = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    await expect(svc.ask(ORG, 'u-grace', { startsOn: y, endsOn: y })).resolves.toEqual({ id: 'r1' });
  });
});
