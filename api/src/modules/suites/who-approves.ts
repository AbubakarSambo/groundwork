import type { PrismaService } from '../prisma/prisma.service';

/**
 * WHO APPROVES, FOR THE SUITES THAT ASK (U.17): leave requests and time sheets. It follows the admin's
 * answer when they switched the suite on:
 *   - "Their manager": the person's manager in the staff directory, when that manager is a lead or an
 *     admin in this organisation (anybody else could not open the board to decide);
 *   - otherwise, and for "An admin": any admin.
 * Nobody approves their own.
 */
export async function mayApprove(
  prisma: PrismaService,
  input: { organizationId: string; readerId: string; readerRole: string | null; personUserId: string; approver: string | null; managerExternalId: string | null },
): Promise<boolean> {
  if (input.personUserId === input.readerId) return false;
  if (input.approver === 'Their manager' && input.managerExternalId) {
    const m = await prisma.person.findFirst({
      where: { organizationId: input.organizationId, externalId: input.managerExternalId, active: true },
      select: { linkedUserId: true },
    });
    if (m?.linkedUserId) {
      const r = await prisma.organizationMembership.findUnique({
        where: { userId_organizationId: { userId: m.linkedUserId, organizationId: input.organizationId } },
        select: { role: true },
      });
      if (r?.role === 'LEAD' || r?.role === 'ADMIN') return m.linkedUserId === input.readerId;
    }
  }
  return input.readerRole === 'ADMIN';
}
