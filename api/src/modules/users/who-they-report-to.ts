import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { CANNOT_REPORT_TO_THEMSELVES, NOT_IN_THIS_ORGANISATION, THAT_WOULD_MAKE_A_LOOP, wouldMakeALoop } from './where-they-sit';

/**
 * THE ONE WRITER OF A REPORTING LINE (Batch S, S3). The People page ("Reports to") and Ask ("Amina reports to Joseph", saved only
 * on a yes) both set who somebody reports to through this, so the same checks refuse the same things in the same words: nobody
 * reports to themselves, the manager must be in this organisation, and no line may go round in a circle. Null clears it. The
 * approval resolver (who-may-decide.ts) reads the line it writes, so leave, hours, spending and reviews follow it at once.
 * Returns the checked line to write, so the caller writes it with whatever else it is saving.
 */
export async function aReportingLineToWrite(prisma: PrismaService, organizationId: string, userId: string, managerId: string | null): Promise<string | null> {
  if (!managerId) return null;
  if (managerId === userId) throw new BadRequestException(CANNOT_REPORT_TO_THEMSELVES);
  const everyone = await prisma.organizationMembership.findMany({ where: { organizationId }, select: { userId: true, reportsToUserId: true } });
  if (!everyone.some((m) => m.userId === managerId)) throw new BadRequestException(NOT_IN_THIS_ORGANISATION);
  if (wouldMakeALoop(userId, managerId, new Map(everyone.map((m) => [m.userId, m.reportsToUserId])))) throw new BadRequestException(THAT_WOULD_MAKE_A_LOOP);
  return managerId;
}

/** Sets who one person reports to, checked as above. */
export async function setWhoTheyReportTo(prisma: PrismaService, organizationId: string, userId: string, managerId: string | null): Promise<void> {
  const reportsToUserId = await aReportingLineToWrite(prisma, organizationId, userId, managerId);
  await prisma.organizationMembership.update({ where: { userId_organizationId: { userId, organizationId } }, data: { reportsToUserId } });
}
