import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { tidyANumberFor } from '../whatsapp/the-organisations-country';
import { theCheckInIsOpen } from '../whatsapp/what-goes-to-a-phone';
import { whereTheyAreOnWhatsApp, WHERE_ON_WHATSAPP_SAYS, type WhereOnWhatsApp } from '../whatsapp/where-they-are-on-whatsapp';
import { refuseANumberOnSomebodyElse, aSignInsNumberChanged } from '../whatsapp/one-number-for-a-person';

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
export const THE_NUMBER_IS_REMOVED = (name: string) => `${name}'s WhatsApp number is removed. Groundwork will write to them by email only.`;
export const NOT_A_NUMBER = 'That does not look like a phone number. Write it with the country code, for example +254 712 345 678.';

export async function theLeadAddsAWhatsAppNumber(
  prisma: any,
  input: { groundId: string; participantId: string; organizationId: string; userId: string; role: string; phone: string },
): Promise<{ said: string; phone?: string | null }> {
  const ground = await prisma.ground.findFirst({ where: { id: input.groundId, organizationId: input.organizationId }, select: { id: true, initiatorId: true, createdByUserId: true } });
  if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
  const runsIt = ground.initiatorId === input.userId || (!!ground.createdByUserId && ground.createdByUserId === input.userId);
  if (!runsIt && input.role !== 'ADMIN') throw new ForbiddenException('Only the person who runs this check-in, or an administrator of the organisation, can add a WhatsApp number for somebody on it.');

  /*
   * TYPED ANY COMMON WAY, KEPT IN ONE FORMAT, AND CHANGED OR REMOVED BY WHOEVER MAY SET IT (pilots on WhatsApp, 14 October).
   * "0722 000 202", "+254722000202" and "254 722-000-202" are the same number: a number without a country code takes the
   * organisation's. An empty number removes it. The lead who runs the check-in and an admin may change it, not only add it.
   */
  const removing = !String(input.phone ?? '').trim();
  let phone: string | null = null;
  if (!removing) {
    try {
      phone = await tidyANumberFor(prisma, input.organizationId, String(input.phone));
    } catch {
      throw new BadRequestException(NOT_A_NUMBER);
    }
  }

  const p = await prisma.groundParticipant.findFirst({
    where: { id: input.participantId, groundId: input.groundId },
    select: { id: true, email: true, userId: true, nameGiven: true, user: { select: { firstName: true, lastName: true, phoneNumber: true } } },
  });
  if (!p?.email) throw new NotFoundException('That person is not in this check-in, so check the name and try again.');
  const name = (p.user?.firstName || p.nameGiven || 'This person').toString().trim();

  const entry = await prisma.person.findFirst({ where: { organizationId: input.organizationId, email: { equals: p.email, mode: 'insensitive' } }, select: { id: true, phone: true } });
  /* Never a number that is already somebody else's sign-in. */
  await refuseANumberOnSomebodyElse(prisma, phone, p.userId ?? null);

  if (entry) {
    await prisma.person.update({ where: { id: entry.id }, data: { phone } });
  } else if (phone) {
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
  /* One number for a person: their sign-in holds the same number, so the opening and inbound routing read one thing. */
  if (p.userId) {
    await prisma.user.update({ where: { id: p.userId }, data: { phoneNumber: phone } }).catch(() => undefined);
    await aSignInsNumberChanged(prisma, p.userId, phone).catch(() => undefined);
  }
  return { said: phone ? THE_NUMBER_IS_KEPT(name) : THE_NUMBER_IS_REMOVED(name), phone };
}

/**
 * EACH PERSON ON THIS CHECK-IN, ON WHATSAPP (pilots on WhatsApp, 14 October): their number and where they are, for whoever
 * runs the check-in and an admin of the organisation only, the same people who may set it. The number is the one the
 * opening and the inbound routing read: the roster's, else the sign-in's.
 */
export async function whereEachPersonIsOnWhatsApp(
  prisma: any,
  input: { groundId: string; organizationId: string; userId: string; role: string },
): Promise<{ participantId: string; phone: string | null; whatsapp: WhereOnWhatsApp; says: string }[]> {
  const ground = await prisma.ground.findFirst({ where: { id: input.groundId, organizationId: input.organizationId }, select: { id: true, initiatorId: true, createdByUserId: true } });
  if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
  const runsIt = ground.initiatorId === input.userId || (!!ground.createdByUserId && ground.createdByUserId === input.userId);
  if (!runsIt && input.role !== 'ADMIN') throw new ForbiddenException('Only the person who runs this check-in, or an administrator of the organisation, can see the WhatsApp numbers on it.');
  const people: any[] = await prisma.groundParticipant.findMany({
    where: { groundId: input.groundId },
    select: { id: true, email: true, user: { select: { phoneNumber: true } } },
  });
  const out = [];
  for (const p of people) {
    const entry = p.email ? await prisma.person.findFirst({ where: { organizationId: input.organizationId, email: { equals: p.email, mode: 'insensitive' } }, select: { phone: true } }).catch(() => null) : null;
    const phone = entry?.phone ?? p.user?.phoneNumber ?? null;
    const whatsapp = await whereTheyAreOnWhatsApp(prisma, phone).catch(() => (phone ? 'not-connected' : 'no-number') as WhereOnWhatsApp);
    out.push({ participantId: p.id, phone, whatsapp, says: WHERE_ON_WHATSAPP_SAYS[whatsapp] });
  }
  return out;
}

/**
 * THE NUMBER IS ADDED, SO THE OPENING GOES (pilots on WhatsApp, 14 October; D2, "first contact can be on WhatsApp if your
 * company adds your number"). When a lead or an admin adds a number for somebody with a session open and nothing ever sent to
 * or received from that number, that session's opening goes there at once, by the approved opening template. Never twice,
 * never for a check-in kept in the app, and only where WhatsApp is on for the organisation.
 */
export async function theOpeningGoesToTheNumberJustAdded(
  prisma: any,
  send: { sendFor: (organizationId: string, phone: string, text: string, ctx: any) => Promise<any> },
  input: { groundId: string; participantId: string; organizationId: string; phone: string },
  whatsAppIsOnHere: boolean,
  now: Date = new Date(),
): Promise<boolean> {
  if (!whatsAppIsOnHere || !input.phone) return false;
  if ((await whereTheyAreOnWhatsApp(prisma, input.phone)) !== 'not-connected') return false;
  const ci = await prisma.checkIn.findFirst({
    where: { participantId: input.participantId, status: 'NOT_STARTED', OR: [{ availableFrom: null }, { availableFrom: { lte: now } }] },
    orderBy: { sessionNumber: 'desc' },
    select: { id: true, participant: { select: { user: { select: { firstName: true } }, nameGiven: true, ground: { select: { label: true, overWhatsApp: true, simplerWords: true } } } } },
  });
  if (!ci || ci.participant?.ground?.overWhatsApp === false) return false;
  const before = await prisma.whatsAppSend?.findFirst?.({ where: { checkInId: ci.id, kind: { startsWith: 'checkin-open' } }, select: { id: true } });
  if (before) return false;
  const said = theCheckInIsOpen({ firstName: ci.participant?.user?.firstName ?? ci.participant?.nameGiven ?? null, label: ci.participant.ground.label }, ci.participant.ground.simplerWords);
  await send.sendFor(input.organizationId, input.phone, said.text, { checkInId: ci.id, kind: said.kind, params: said.params });
  return true;
}
