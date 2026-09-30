/**
 * A COMMITMENT IS WRITTEN IN ONE PLACE, WHOEVER ASKED FOR THE CHANGE.
 *
 * The panel's routes (`/commitments`) and Ask Groundwork both add a commitment, mark one done and
 * move its deadline. They call these functions, so there is never a second copy of the write that
 * could drift from the first. Who may ask is decided by each caller, before it gets here. What the
 * write itself does is decided only here.
 *
 * Plain functions over prisma, for the same reason `mirrorCommitment` is: the assistant and the
 * public API both need them, and neither should have to import the other's module.
 */
import { PrismaService } from '../prisma/prisma.service';

export async function addACommitment(
  prisma: PrismaService,
  args: { organizationId: string; personExternalId: string; subjectExternalId?: string | null; text: string; dueSaid: string | null; dueAt: Date | null; source: string },
) {
  return prisma.commitment.create({
    data: {
      organizationId: args.organizationId,
      personExternalId: args.personExternalId,
      subjectExternalId: args.subjectExternalId ?? null,
      text: args.text,
      dueSaid: args.dueSaid,
      dueAt: args.dueAt,
      state: 'OPEN',
      source: args.source,
    },
  });
}

export async function markACommitmentDone(prisma: PrismaService, id: string) {
  return prisma.commitment.update({ where: { id }, data: { state: 'KEPT', resolvedAt: new Date() } });
}

/**
 * MOVE ONE DEADLINE. The organisation's row is moved, and so is the check-in's own row where this
 * one was copied from a check-in, because the check-in's record stays the authority for the check-in
 * and would otherwise still say the old day. The words said are kept beside the day, as always.
 */
export async function moveACommitmentsDeadline(prisma: PrismaService, id: string, dueAt: Date, dueSaid: string) {
  const moved = await prisma.commitment.update({ where: { id }, data: { dueAt, dueSaid } });
  if (moved.sourcePersonObjectiveId) {
    await prisma.personObjective.update({
      where: { id: moved.sourcePersonObjectiveId },
      data: { dueDate: dueAt, dueSaid },
    });
  }
  return moved;
}
