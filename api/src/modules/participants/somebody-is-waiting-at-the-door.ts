import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

/**
 * AND TELL THE PEOPLE WHO CAN ANSWER IT.
 *
 * Every admin of the organisation is told that somebody is waiting to be let in, who added them and
 * to which check-in. Written once here because two doors now queue people - a participant
 * invitation and a broadcast join link - and the admins should hear the same sentence whichever
 * door it was. Called after the transaction that queued them and never inside it: a mail provider
 * being slow must not roll back somebody's acceptance, and a mail failing must not either. The
 * queue is visible on the People page whether or not this arrives.
 */
export async function tellTheAdminsSomebodyIsWaiting(
  deps: { prisma: PrismaService; email: EmailService; logger: Logger },
  organizationId: string,
  groundId: string,
  inviterId: string,
  who: string,
): Promise<void> {
  const [admins, inviter, ground, person, org] = await Promise.all([
    deps.prisma.user.findMany({
      where: { organizationId, role: 'ADMIN', isActive: true, deletedAt: null },
      select: { email: true, firstName: true },
    }),
    deps.prisma.user.findUnique({ where: { id: inviterId }, select: { firstName: true, lastName: true, email: true } }),
    deps.prisma.ground.findUnique({ where: { id: groundId }, select: { label: true } }),
    /* Their name, if they gave one, and the organisation's, for the subject (U.4 review). */
    deps.prisma.user.findUnique({ where: { email: who.trim().toLowerCase() }, select: { firstName: true, lastName: true } }),
    deps.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
  ]);
  const name = person ? [person.firstName, person.lastName].filter(Boolean).join(' ').trim() : '';
  const addedBy = inviter
    ? [inviter.firstName, inviter.lastName].filter(Boolean).join(' ') || inviter.email
    : 'somebody on your team';
  for (const admin of admins) {
    await deps.email
      .sendSomebodyIsWaiting(admin.email, admin.firstName ?? 'there', who, addedBy, ground?.label ?? null, { name, organisationName: org?.name ?? null })
      .catch((err: any) => deps.logger.warn(`Waiting-notice to ${admin.email} failed: ${err.message}`));
  }
}
