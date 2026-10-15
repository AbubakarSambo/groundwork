import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * A WRITE THAT NAMES A GROUND FIRST ASKS WHETHER THE GROUND IS HERE.
 *
 * Four creates in this module wrote `{ organizationId, groundId }` straight off the route without
 * reading the ground at all. Both ids came from the caller: the organisation from their token, the
 * ground from the path. Nothing checked that the one belonged to the other, so a figure, an
 * assertion or an agreement could be written against a check-in in somebody else's organisation
 * with the caller's organisation stamped on it - a row that no read on either side would ever
 * explain. `parties.service.ts` had it right, and this is its question, asked once.
 */
export async function theGroundIsHere(prisma: PrismaService, groundId: string, organizationId: string): Promise<void> {
  const ground = await prisma.ground.findFirst({ where: { id: groundId, organizationId }, select: { id: true } });
  if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
}
