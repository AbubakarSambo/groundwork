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

/** Who approves for one person: their line manager when the staff directory has one who can open the board, otherwise an admin. */
export type Approver = { kind: 'manager'; userId: string; firstName: string | null } | { kind: 'admin' };

/**
 * WHO APPROVES FOR THIS PERSON, THE ONE ANSWER for leave, hours and spending (decided 1 October 2026):
 * the person's line manager in the staff directory, or an admin when there is none. The manager must
 * have an account here as a lead or an admin, because anybody else could not open the board to decide.
 * The person who runs a check-in does not approve just because they run it, and the person never
 * approves their own. Pass `managerExternalId` when the directory row is already read; leave it out
 * and the person's own row is read here.
 */
export async function whoApprovesFor(
  prisma: PrismaService,
  input: { organizationId: string; personUserId: string; managerExternalId?: string | null },
): Promise<Approver> {
  let managerExternalId = input.managerExternalId;
  if (managerExternalId === undefined) {
    const me = await prisma.person.findFirst({
      where: { organizationId: input.organizationId, linkedUserId: input.personUserId, active: true },
      select: { managerExternalId: true },
    });
    managerExternalId = me?.managerExternalId ?? null;
  }
  if (managerExternalId) {
    const m = await prisma.person.findFirst({
      where: { organizationId: input.organizationId, externalId: managerExternalId, active: true },
      select: { linkedUserId: true, givenName: true, displayName: true },
    });
    if (m?.linkedUserId && m.linkedUserId !== input.personUserId) {
      const r = await prisma.organizationMembership.findUnique({
        where: { userId_organizationId: { userId: m.linkedUserId, organizationId: input.organizationId } },
        select: { role: true },
      });
      if (r?.role === 'LEAD' || r?.role === 'ADMIN') {
        const firstName = m.givenName?.trim() || m.displayName?.trim().split(/\s+/)[0] || null;
        return { kind: 'manager', userId: m.linkedUserId, firstName };
      }
    }
  }
  return { kind: 'admin' };
}

/** Whether this reader decides for this person: the one who approves for them, and never the person themselves. */
export async function mayApproveFor(
  prisma: PrismaService,
  input: { organizationId: string; readerId: string; readerRole: string | null; personUserId: string; managerExternalId?: string | null },
): Promise<boolean> {
  if (input.personUserId === input.readerId) return false;
  const who = await whoApprovesFor(prisma, input);
  return who.kind === 'manager' ? who.userId === input.readerId : input.readerRole === 'ADMIN';
}
