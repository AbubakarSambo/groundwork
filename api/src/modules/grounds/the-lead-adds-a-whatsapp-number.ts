import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

/**
 * THE LEAD ADDS SOMEBODY'S WHATSAPP NUMBER (Hafsah, 13 October 2026, evening, D1 and D2: "add your phone number, or your
 * lead can"; "First contact can be on WhatsApp if your company adds your number").
 *
 * Whoever runs the check-in, or an administrator of the organisation, gives the number of somebody on it. It is kept on
 * the organisation's roster against that person's address, which is where every WhatsApp message and every reply is
 * matched, and on their sign-in when they have one and gave no number of their own. A number somebody already has is
 * never replaced from here: it is theirs, changed by them in Settings or by an administrator on People.
 */
export const A_NUMBER_IS_THEIRS = (name: string) => `${name} already has a WhatsApp number. Only they, in Settings, or an administrator, on People, can change it.`;
export const THE_NUMBER_IS_KEPT = (name: string) => `${name}'s WhatsApp number is kept. Groundwork will write to them there as well as by email.`;
export const NOT_A_NUMBER = 'That does not look like a phone number. Write it with the country code, for example +254 712 345 678.';

export async function theLeadAddsAWhatsAppNumber(
  prisma: any,
  input: { groundId: string; participantId: string; organizationId: string; userId: string; role: string; phone: string },
): Promise<{ said: string }> {
  const ground = await prisma.ground.findFirst({ where: { id: input.groundId, organizationId: input.organizationId }, select: { id: true, initiatorId: true, createdByUserId: true } });
  if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
  const runsIt = ground.initiatorId === input.userId || (!!ground.createdByUserId && ground.createdByUserId === input.userId);
  if (!runsIt && input.role !== 'ADMIN') throw new ForbiddenException('Only the person who runs this check-in, or an administrator of the organisation, can add a WhatsApp number for somebody on it.');

  const digits = String(input.phone ?? '').replace(/[^\d+]/g, '');
  if (!/^\+?\d{8,15}$/.test(digits)) throw new BadRequestException(NOT_A_NUMBER);
  const phone = WhatsAppService.normalize(digits.startsWith('+') ? digits : `+${digits}`);

  const p = await prisma.groundParticipant.findFirst({
    where: { id: input.participantId, groundId: input.groundId },
    select: { id: true, email: true, userId: true, nameGiven: true, user: { select: { firstName: true, lastName: true, phoneNumber: true } } },
  });
  if (!p?.email) throw new NotFoundException('That person is not in this check-in, so check the name and try again.');
  const name = (p.user?.firstName || p.nameGiven || 'This person').toString().trim();

  const entry = await prisma.person.findFirst({ where: { organizationId: input.organizationId, email: { equals: p.email, mode: 'insensitive' } }, select: { id: true, phone: true } });
  if (entry?.phone && WhatsAppService.normalize(entry.phone) !== phone) throw new BadRequestException(A_NUMBER_IS_THEIRS(name));
  if (p.user?.phoneNumber && WhatsAppService.normalize(p.user.phoneNumber) !== phone) throw new BadRequestException(A_NUMBER_IS_THEIRS(name));

  if (entry) {
    await prisma.person.update({ where: { id: entry.id }, data: { phone } });
  } else {
    await prisma.person.create({
      data: {
        organizationId: input.organizationId,
        sourceSystem: 'groundwork',
        externalId: `participant:${p.id}`,
        userName: p.email,
        displayName: [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ') || p.nameGiven || null,
        givenName: p.user?.firstName || (p.nameGiven ?? '').split(/\s+/)[0] || null,
        familyName: p.user?.lastName || null,
        email: p.email,
        phone,
        linkedUserId: p.userId ?? null,
        active: true,
      },
    });
  }
  if (p.userId && !p.user?.phoneNumber) await prisma.user.update({ where: { id: p.userId }, data: { phoneNumber: phone } }).catch(() => undefined);
  return { said: THE_NUMBER_IS_KEPT(name) };
}
