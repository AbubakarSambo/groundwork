import type { PrismaService } from '../prisma/prisma.service';
import { decidesIt, theOneWhoDecides, theStepsFor } from './who-may-decide';

/**
 * WHO APPROVES LEAVE AND HOURS FOR ONE PERSON (decided 1 October 2026): the person's line manager in
 * the staff directory, or an admin when there is none. This is now only a short way of asking the one
 * approval resolver (who-may-decide.ts) with the steps for leave and time sheets, kept because the
 * say-backs read the approver's first name from it. Nobody approves their own.
 */
export type Approver = { kind: 'manager'; userId: string; firstName: string | null } | { kind: 'admin' };

/**
 * Who approves leave or hours for this person. Pass `managerExternalId` when the directory row is
 * already read; leave it out and the person's own row is read.
 */
export async function whoApprovesFor(
  prisma: PrismaService,
  input: { organizationId: string; personUserId: string; managerExternalId?: string | null },
): Promise<Approver> {
  const who = await theOneWhoDecides(prisma, theStepsFor('leave'), {
    organizationId: input.organizationId, requesterUserId: input.personUserId, managerExternalId: input.managerExternalId,
  });
  return who.kind === 'manager' ? { kind: 'manager', userId: who.userId, firstName: who.firstName } : { kind: 'admin' };
}

/** Whether this reader decides leave or hours for this person: the one who approves for them, and never the person themselves. */
export async function mayApproveFor(
  prisma: PrismaService,
  input: { organizationId: string; readerId: string; readerRole: string | null; personUserId: string; managerExternalId?: string | null },
): Promise<boolean> {
  if (input.personUserId === input.readerId) return false;
  const who = await theOneWhoDecides(prisma, theStepsFor('leave'), {
    organizationId: input.organizationId, requesterUserId: input.personUserId, managerExternalId: input.managerExternalId,
  });
  return decidesIt(who, { userId: input.readerId, role: input.readerRole }, input.personUserId);
}
