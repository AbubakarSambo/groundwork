import type { PrismaService } from '../prisma/prisma.service';
import { theOneWhoDecides, theStepsFor } from './who-may-decide';
import { readWorkflow } from './the-approval-steps';
import { readLeaveRules } from './the-leave-rules';

/**
 * WHO APPROVES LEAVE AND HOURS FOR ONE PERSON (decided 1 October 2026): the person's line manager in
 * the staff directory, or an admin when there is none. This is now only a short way of asking the one
 * approval resolver (who-may-decide.ts) with the steps for leave and time sheets, kept because the
 * say-backs read the approver's first name from it. Nobody approves their own.
 */
export type Approver = { kind: 'manager' | 'person'; userId: string; firstName: string | null } | { kind: 'admin' };

/**
 * Who first approves leave or hours for this person: the first step of the suite's steps, as the admin
 * set them (the-approval-steps.ts), or the manager, else an admin. Pass `managerExternalId` when the
 * directory row is already read; leave it out and the person's own row is read. For leave, pass the
 * request's working `days` and leave by length is read (the-leave-rules.ts); leave it out and the
 * steps are those for any length, as before.
 */
export async function whoApprovesFor(
  prisma: PrismaService,
  input: { organizationId: string; personUserId: string; managerExternalId?: string | null; suite?: 'leave' | 'time'; days?: number; kind?: string | null },
): Promise<Approver> {
  const suite = input.suite ?? 'leave';
  const workflow = await readWorkflow(prisma, input.organizationId, suite);
  const rules = suite === 'leave' && (input.days != null || input.kind) ? await readLeaveRules(prisma, input.organizationId).catch(() => ({})) : undefined;
  const who = await theOneWhoDecides(prisma, theStepsFor(suite, { workflow, rules }, input.days, input.kind)[0], {
    organizationId: input.organizationId, requesterUserId: input.personUserId, managerExternalId: input.managerExternalId,
  });
  if (who.kind === 'manager') return { kind: 'manager', userId: who.userId, firstName: who.firstName };
  if (who.kind === 'person') {
    const u = await (prisma as any).user?.findUnique({ where: { id: who.userId }, select: { firstName: true } }).catch(() => null);
    return { kind: 'person', userId: who.userId, firstName: u?.firstName?.trim() || null };
  }
  return { kind: 'admin' };
}
