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
    organizationMembership: { findUnique: jest.fn(async () => ({ role: 'ADMIN' })) },
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
    expect(NOBODY_ELSE_CAN_DECIDE).toBe('You are the only admin and nobody is named to approve your requests, so nobody else could decide this one. Add another admin, or name someone to approve it in the suite’s settings, and then ask again.');
  });
});

describe('the only admin asks to spend', () => {
  it('is told the same, and nothing is kept', async () => {
    const prisma = bed(0, 'spend');
    await expect(new SpendingService(prisma).ask(ORG, 'u-grace', { amount: 5000, what: 'A new chair' })).rejects.toThrow(new BadRequestException(NOBODY_ELSE_CAN_DECIDE));
    expect(prisma.spendRequest.create).not.toHaveBeenCalled();
  });
});
