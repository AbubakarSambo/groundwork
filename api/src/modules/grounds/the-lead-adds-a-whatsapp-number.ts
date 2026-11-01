import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { tidyANumberFor } from '../whatsapp/the-organisations-country';
import { theCheckInIsOpen } from '../whatsapp/what-goes-to-a-phone';
import { whereTheyAreOnWhatsApp, WHERE_ON_WHATSAPP_SAYS, type WhereOnWhatsApp } from '../whatsapp/where-they-are-on-whatsapp';
import { refuseANumberOnSomebodyElse, aSignInsNumberChanged, everyRosterEntryTakesTheNumber, theNumberOnRecord, theSignInFor } from '../whatsapp/one-number-for-a-person';
import { formsOfTheSameNumber, WRITE_THE_FULL_NUMBER } from '../whatsapp/a-number-whatsapp-can-reach';
import { organisationsThatTurnedWhatsAppOn } from '../whatsapp/only-where-whatsapp-is-turned-on';

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
    } catch (err: any) {
      /* The sentence that says what is wrong with it ("write the whole number with the country code"), not a guess that it is not a number. */
      const said = typeof err?.response?.message === 'string' ? err.response.message : null;
      throw new BadRequestException(said === WRITE_THE_FULL_NUMBER ? said : NOT_A_NUMBER);
    }
  }

  const p = await prisma.groundParticipant.findFirst({
    where: { id: input.participantId, groundId: input.groundId },
    select: { id: true, email: true, userId: true, nameGiven: true, user: { select: { firstName: true, lastName: true, phoneNumber: true } } },
  });
  if (!p?.email) throw new NotFoundException('That person is not in this check-in, so check the name and try again.');
  const name = (p.user?.firstName || p.nameGiven || 'This person').toString().trim();

  /* Their sign-in, found from their address when they have not opened this invitation yet (theSignInFor): their own number is never
     somebody else's, and it is kept where every reader looks. */
  const signIn = await theSignInFor(prisma, { userId: p.userId ?? null, email: p.email });
  /* Never a number that is already somebody else's sign-in. Said with the colleague's name when they are in this organisation. */
  await refuseANumberOnSomebodyElse(prisma, phone, signIn, input.organizationId, p.email);

  /* EVERY ROSTER ENTRY THAT IS THIS PERSON takes it, not the first one found (Drop Access, 21 October): with two entries, the number
     was saved on one and the screen and the sender could read the other. */
  const entries = await everyRosterEntryTakesTheNumber(prisma, input.organizationId, { userId: signIn, email: p.email }, phone);
  if (!entries && phone) {
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
        linkedUserId: signIn,
        active: true,
      },
    });
  }
  /* One number for a person: their sign-in holds the same number, so the opening and inbound routing read one thing. */
  if (signIn) {
    /* Never silently: a sign-in that could not take the number says so, and the screen shows it (Drop Access, 21 October). */
    try {
      await prisma.user.update({ where: { id: signIn }, data: { phoneNumber: phone } });
    } catch {
      throw new BadRequestException(`${name}'s WhatsApp number could not be saved on their sign-in, so Groundwork would not reach them there. Try again, and if it happens again, contact Groundwork.`);
    }
    await aSignInsNumberChanged(prisma, signIn, phone, input.organizationId).catch(() => undefined);
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
    select: { id: true, email: true, userId: true, user: { select: { phoneNumber: true } } },
  });
  const out = [];
  for (const p of people) {
    /* Every roster entry that is this person, then their sign-in: the same number the opening reads (one-number-for-a-person.ts). */
    const phone = (await theNumberOnRecord(prisma, input.organizationId, { userId: p.userId ?? null, email: p.email }).catch(() => null)) ?? p.user?.phoneNumber ?? null;
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
  /* Told once per number (Drop Access, 21 October; findings 1.4 E): an opening that went to the old number, or failed there, never stops the one to the number just added. */
  const before = await prisma.whatsAppSend?.findFirst?.({ where: { checkInId: ci.id, kind: { startsWith: 'checkin-open' }, phone: { in: formsOfTheSameNumber(input.phone) } }, select: { id: true } });
  if (before) return false;
  const said = theCheckInIsOpen({ firstName: ci.participant?.user?.firstName ?? ci.participant?.nameGiven ?? null, label: ci.participant.ground.label }, ci.participant.ground.simplerWords);
  await send.sendFor(input.organizationId, input.phone, said.text, { checkInId: ci.id, kind: said.kind, params: said.params });
  return true;
}

/**
 * A NUMBER JUST SAVED, BY THE PERSON IN SETTINGS, BY AN ADMIN ON PEOPLE, OR BY A LEAD ON A CHECK-IN'S PEOPLE (Drop Access, 21 October).
 * Each check-in open for them in this organisation sends its opening there now: the first one as Groundwork's approved first contact,
 * on a number nothing has gone to yet. The sender keeps quiet hours, STOP and the day's one routine message; never twice per number.
 */
export async function theOpeningsGoToANumberJustSaved(
  prisma: any,
  whatsapp: { sendFor: (organizationId: string, phone: string, text: string, ctx: any) => Promise<any>; isEnabled(): Promise<boolean> },
  input: { organizationId: string; phone: string; userId?: string | null; participantIds?: string[] },
): Promise<number> {
  const on = (await organisationsThatTurnedWhatsAppOn(prisma, whatsapp as any, [input.organizationId])).has(input.organizationId);
  if (!on) return 0;
  const or = [...(input.userId ? [{ userId: input.userId }] : []), ...((input.participantIds ?? []).length ? [{ id: { in: input.participantIds } }] : [])];
  if (!or.length) return 0;
  const theirs: any[] = (await prisma.groundParticipant.findMany({ where: { OR: or, leftAt: null, ground: { organizationId: input.organizationId } }, select: { id: true, groundId: true } })) ?? [];
  let went = 0;
  for (const p of theirs) {
    if (await theOpeningGoesToTheNumberJustAdded(prisma, whatsapp, { groundId: p.groundId, participantId: p.id, organizationId: input.organizationId, phone: input.phone }, true)) went += 1;
  }
  return went;
}
