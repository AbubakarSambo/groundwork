import { BadRequestException } from '@nestjs/common';
import { formsOfTheSameNumber } from './a-number-whatsapp-can-reach';

/**
 * ONE NUMBER FOR ONE PERSON, WHEREVER IT WAS TYPED (decision 106 item 3).
 *
 * A person's WhatsApp number lives in two places: their sign-in (`User.phoneNumber`, which they set in
 * Settings and an admin can set for them) and their organisation's roster (`Person.phone`, which an admin
 * or the HR system sets). They drifted: a number typed in one was unknown to the other, so a person could
 * be written to on one number and not be recognised when they replied from it.
 *
 * Now an edit to either is carried to the other, here and only here:
 *  - The sign-in's number changed: every roster entry for that sign-in in that organisation takes it.
 *  - A roster entry's number changed: the sign-in it belongs to takes it.
 *  - The sign-in has none: the roster's number is used.
 * A number belongs to one sign-in across all of Groundwork. A number already on somebody else's sign-in is
 * refused with a sentence, before anything is written.
 */

export const A_NUMBER_ON_SOMEBODY_ELSE =
  'This number is already used by another Groundwork sign-in, so it cannot be saved here. Check the number, or ask that person to remove it from their Settings first.';

type Db = any;

/** Refuses, with a sentence, a number that is already on a sign-in other than this one. */
export async function refuseANumberOnSomebodyElse(prisma: Db, number: string | null | undefined, ownUserId: string | null | undefined): Promise<void> {
  if (!number) return;
  const other = await prisma.user?.findFirst?.({
    where: { phoneNumber: { in: formsOfTheSameNumber(number) }, deletedAt: null, ...(ownUserId ? { NOT: { id: ownUserId } } : {}) },
    select: { id: true },
  });
  if (other && other.id !== ownUserId) throw new BadRequestException(A_NUMBER_ON_SOMEBODY_ELSE);
}

/** The roster entries that are this sign-in, in one organisation: linked to it, or carrying its address. */
async function rosterEntriesOf(prisma: Db, organizationId: string, user: { id: string; email?: string | null }) {
  return (await prisma.person?.findMany?.({
    where: { organizationId, OR: [{ linkedUserId: user.id }, ...(user.email ? [{ email: user.email.toLowerCase() }] : [])] },
    select: { id: true, phone: true },
  })) ?? [];
}

/** The sign-in's number was set or cleared (Settings, or an admin editing the sign-in): the roster follows. */
export async function aSignInsNumberChanged(prisma: Db, userId: string, number: string | null): Promise<void> {
  const user = await prisma.user?.findUnique?.({ where: { id: userId }, select: { id: true, email: true, organizationId: true } })?.catch?.(() => null);
  if (!user?.organizationId || !prisma.person?.update) return;
  const entries = await rosterEntriesOf(prisma, user.organizationId, user);
  for (const e of entries) {
    if ((e.phone ?? null) === number) continue;
    await prisma.person.update({ where: { id: e.id }, data: { phone: number } });
  }
}

/**
 * A roster entry's number was set or cleared (an admin, or the HR system): the sign-in follows. Call
 * `refuseANumberOnSomebodyElse` before writing the roster entry; this only carries the number across.
 */
export async function aRosterNumberChanged(prisma: Db, personId: string, number: string | null): Promise<void> {
  const person = await prisma.person?.findUnique?.({ where: { id: personId }, select: { organizationId: true, linkedUserId: true, email: true } });
  if (!person) return;
  const user = await theSignInOf(prisma, person);
  if (!user || !prisma.user?.update) return;
  if ((user.phoneNumber ?? null) === number) return;
  /* Somebody else's sign-in already has it: the roster keeps its number, the sign-in keeps its own. Said by the caller beforehand. */
  const other = number ? await prisma.user.findFirst({ where: { phoneNumber: { in: formsOfTheSameNumber(number) }, deletedAt: null, NOT: { id: user.id } }, select: { id: true } }) : null;
  if (other && other.id !== user.id) return;
  await prisma.user.update({ where: { id: user.id }, data: { phoneNumber: number } });
}

/** The sign-in a roster entry belongs to: the one it is linked to, or the one with its address in its organisation. */
export async function theSignInOf(prisma: Db, person: { organizationId: string; linkedUserId?: string | null; email?: string | null }) {
  if (person.linkedUserId) {
    const u = await prisma.user?.findUnique?.({ where: { id: person.linkedUserId }, select: { id: true, phoneNumber: true, deletedAt: true } })?.catch?.(() => null);
    return u && !u.deletedAt ? u : null;
  }
  if (!person.email) return null;
  return (await prisma.user?.findFirst?.({ where: { organizationId: person.organizationId, email: person.email.toLowerCase(), deletedAt: null }, select: { id: true, phoneNumber: true } })?.catch?.(() => null)) ?? null;
}

/** A sign-in with no number takes its roster entry's number, when one is there and nobody else has it. */
export async function aSignInWithNoNumberTakesTheRosters(prisma: Db, userId: string, rosterNumber: string | null | undefined): Promise<void> {
  if (!rosterNumber || !prisma.user?.findFirst) return;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phoneNumber: true } });
  if (!user || user.phoneNumber) return;
  const other = await prisma.user.findFirst({ where: { phoneNumber: { in: formsOfTheSameNumber(rosterNumber) }, deletedAt: null, NOT: { id: userId } }, select: { id: true } });
  if (other && other.id !== userId) return;
  await prisma.user.update({ where: { id: userId }, data: { phoneNumber: rosterNumber } });
}
