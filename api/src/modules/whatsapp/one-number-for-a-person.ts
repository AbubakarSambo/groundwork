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

/** The same refusal, naming the colleague whose number it is when they are in the same organisation: an admin there already sees it on People. */
export const A_NUMBER_ON_A_COLLEAGUE = (name: string) =>
  `This number is already saved for ${name}, so it cannot be saved for somebody else too. Check the number, or change ${name}'s number on People first.`;

/**
 * Refuses, with a sentence, a number that is already on a sign-in other than this one.
 *
 * A SIGN-IN THAT WAS DELETED NEVER HOLDS A NUMBER (Drop Access, 21 October). `users.phone_number` is unique across Groundwork, deleted
 * sign-ins included, so a number left on a deleted sign-in was refused by the database with no sentence, or, from a check-in's people
 * list, not saved at all with nothing said. It is taken off the deleted sign-in first: nobody signs in with it, and the record stays.
 */
export async function refuseANumberOnSomebodyElse(prisma: Db, number: string | null | undefined, ownUserId: string | null | undefined, organizationId?: string | null, ownEmail?: string | null): Promise<void> {
  if (!number) return;
  const forms = formsOfTheSameNumber(number);
  /*
   * AND A NUMBER ALREADY ON SOMEBODY ELSE'S ROSTER ENTRY IN THIS ORGANISATION (browser test, 21 October 2026). Grace kept
   * "+254 712 345 678" for Sam on People and setup (Sam has no sign-in yet, so the number is on his roster entry), then typed
   * "0712345678" for Lucy on People, and it was saved: two people with one number, and every opening for one could go to the other.
   * An entry that is this person (linked to their sign-in, or with their email) is theirs, and never refuses them.
   */
  if (organizationId) {
    const own = ownUserId && !ownEmail ? await Promise.resolve(prisma.user?.findUnique?.({ where: { id: ownUserId }, select: { email: true } })).catch(() => null) : null;
    const email = (ownEmail ?? own?.email ?? '').trim();
    const entry = await Promise.resolve(prisma.person?.findFirst?.({
      where: {
        organizationId, phone: { in: forms }, active: true,
        /* Spelled with the empty case, because NOT on an empty column is never true in SQL: Sam's entry has no sign-in linked. */
        AND: [
          ...(ownUserId ? [{ OR: [{ linkedUserId: null }, { NOT: { linkedUserId: ownUserId } }] }] : []),
          ...(email ? [{ OR: [{ email: null }, { NOT: { email: { equals: email, mode: 'insensitive' } } }] }] : []),
        ],
      },
      select: { displayName: true, givenName: true, familyName: true, email: true },
    })).catch(() => null);
    if (entry) {
      const name = (entry.displayName || [entry.givenName, entry.familyName].filter(Boolean).join(' ') || entry.email || '').trim();
      throw new BadRequestException(name ? A_NUMBER_ON_A_COLLEAGUE(name) : A_NUMBER_ON_SOMEBODY_ELSE);
    }
  }
  await Promise.resolve(prisma.user?.updateMany?.({ where: { phoneNumber: { in: forms }, deletedAt: { not: null }, ...(ownUserId ? { NOT: { id: ownUserId } } : {}) }, data: { phoneNumber: null } })).catch(() => undefined);
  const other = await prisma.user?.findFirst?.({
    where: { phoneNumber: { in: forms }, deletedAt: null, ...(ownUserId ? { NOT: { id: ownUserId } } : {}) },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!other || other.id === ownUserId) return;
  const colleague = organizationId
    ? await Promise.resolve(prisma.organizationMembership?.findFirst?.({ where: { userId: other.id, organizationId }, select: { userId: true } })).catch(() => null)
    : null;
  const name = [other.firstName, other.lastName].filter(Boolean).join(' ').trim();
  throw new BadRequestException(colleague && name ? A_NUMBER_ON_A_COLLEAGUE(name) : A_NUMBER_ON_SOMEBODY_ELSE);
}

/**
 * A PERSON'S NUMBER, AS EVERY SCREEN AND EVERY SENDER READS IT (Drop Access, 21 October). The roster first, then the sign-in. A person
 * can have more than one roster entry (one from the HR system, one Groundwork made when a lead added their number); reading the first
 * one found, with no order, could read the entry without the number just saved on the other. Every entry that is this person is read,
 * the most recently changed one with a number wins, and the sign-in's number is used when no entry has one.
 */
export async function theNumberOnRecord(prisma: Db, organizationId: string, who: { userId?: string | null; email?: string | null }): Promise<string | null> {
  const or = [...(who.userId ? [{ linkedUserId: who.userId }] : []), ...(who.email ? [{ email: { equals: who.email.trim(), mode: 'insensitive' } }] : [])];
  const entries: any[] = or.length
    ? (await Promise.resolve(prisma.person?.findMany?.({ where: { organizationId, OR: or, phone: { not: null } }, orderBy: { updatedAt: 'desc' }, select: { phone: true } })).catch(() => [])) ?? []
    : [];
  const onTheRoster = (entries ?? []).find((e: any) => e?.phone)?.phone ?? null;
  if (onTheRoster) return onTheRoster;
  if (!who.userId) return null;
  const user = await Promise.resolve(prisma.user?.findUnique?.({ where: { id: who.userId }, select: { phoneNumber: true } })).catch(() => null);
  return user?.phoneNumber ?? null;
}

/**
 * THE SAME NUMBER ON EVERY ROSTER ENTRY THAT IS THIS PERSON, and their "last wrote" stamp cleared when it changes: the stamp was about
 * the old number, and kept, it read a new number that has never written as already connected (findings 1.4 D). Returns how many
 * entries there were.
 */
export async function everyRosterEntryTakesTheNumber(prisma: Db, organizationId: string, who: { userId?: string | null; email?: string | null }, number: string | null): Promise<number> {
  const or = [...(who.userId ? [{ linkedUserId: who.userId }] : []), ...(who.email ? [{ email: { equals: who.email.trim(), mode: 'insensitive' } }] : [])];
  if (!or.length || !prisma.person?.findMany) return 0;
  const entries: any[] = (await prisma.person.findMany({ where: { organizationId, OR: or }, select: { id: true, phone: true } })) ?? [];
  for (const e of entries) {
    if ((e.phone ?? null) === number) continue;
    await prisma.person.update({ where: { id: e.id }, data: { phone: number, whatsappLastInboundAt: null } });
  }
  return entries.length;
}

/** The roster entries that are this sign-in, in one organisation: linked to it, or carrying its address. */
async function rosterEntriesOf(prisma: Db, organizationId: string, user: { id: string; email?: string | null }) {
  return (await prisma.person?.findMany?.({
    where: { organizationId, OR: [{ linkedUserId: user.id }, ...(user.email ? [{ email: { equals: user.email.trim(), mode: 'insensitive' } }] : [])] },
    select: { id: true, phone: true },
  })) ?? [];
}

/** The sign-in's number was set or cleared (Settings, or an admin editing the sign-in): the roster follows. */
export async function aSignInsNumberChanged(prisma: Db, userId: string, number: string | null, alsoIn?: string | null): Promise<void> {
  const user = await prisma.user?.findUnique?.({ where: { id: userId }, select: { id: true, email: true, organizationId: true } })?.catch?.(() => null);
  if (!user || !prisma.person?.update) return;
  /*
   * EVERY ORGANISATION THEY BELONG TO, NOT ONLY THE ONE THEY LAST LOOKED AT (Drop Access, 21 October). `organizationId` on a sign-in
   * is the organisation they last switched to, so an admin of Drop Access saving Kevin's number while Kevin was looking at another
   * organisation changed Kevin's sign-in and left Drop Access's roster with the old number, which is the one every sender reads first.
   */
  const memberships: any[] = (await Promise.resolve(prisma.organizationMembership?.findMany?.({ where: { userId }, select: { organizationId: true } })).catch(() => [])) ?? [];
  const orgs = [...new Set([alsoIn, user.organizationId, ...memberships.map((m: any) => m?.organizationId)].filter((o): o is string => !!o))];
  for (const organizationId of orgs) {
    const entries = await rosterEntriesOf(prisma, organizationId, user);
    for (const e of entries) {
      if ((e.phone ?? null) === number) continue;
      /* The stamp was about the old number (findings 1.4 D). */
      await prisma.person.update({ where: { id: e.id }, data: { phone: number, whatsappLastInboundAt: null } });
    }
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
