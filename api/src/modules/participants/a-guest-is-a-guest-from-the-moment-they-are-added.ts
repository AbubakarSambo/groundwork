import { GUEST_ROLE } from './joining-a-second-organisation';

/**
 * SOMEBODY FROM ANOTHER ORGANISATION IS A GUEST HERE FROM THE MOMENT THEY ARE ADDED (U.4 review).
 *
 * The guest membership was only written by accept(), when they clicked the invitation. Until then
 * somebody from another company, added to one of this organisation's check-ins, was on no row of
 * the People page, the "Guests" filter showed nobody, and they could not switch to this
 * organisation to find the check-in they had been told about.
 *
 * So when the address belongs to an account that lives elsewhere, the same GUEST membership accept()
 * writes is written when they are added. accept() upserts it without changing it, so a second write
 * never happens and a role an admin gave them later is kept.
 *
 * HOW THE DOOR RULE IS KEPT (nobody-joins-your-company-by-being-invited-to-a-check-in.ts): a guest is
 * not a member. The role is GUEST, never MEMBER and never their role at home. A guest holds no keys
 * here: they cannot open a check-in or invite this organisation's people, they are listed as "Guest"
 * and never as one of the organisation's people, and their colleague list is only the people on their
 * own check-ins (common/colleagues.ts). Nothing here creates an account or links the participant row:
 * somebody with no account is left exactly as before, for accept() to create and, unless an admin
 * here added them, to wait for an admin.
 */
type Db = {
  user: { findUnique: (a: any) => Promise<any> };
  organizationMembership: { findUnique: (a: any) => Promise<any>; create: (a: any) => Promise<any>; update?: (a: any) => Promise<any> };
};

/**
 * `held`: added when the plan had no seat for them (U.4 re-review). A guest with an account takes a
 * seat, as the prototype says, so a guest added with no room is written held: on the People page,
 * holding no seat, and offered nothing until their invitation is sent.
 */
export async function aGuestHereIfTheyAreFromElsewhere(db: Db, groundOrganizationId: string, email: string, held = false): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, organizationId: true, isActive: true, deletedAt: true },
  });
  if (!user || user.deletedAt || !user.isActive) return false;
  /* Their own organisation: a missing membership there is a different fault, never papered over. */
  if (user.organizationId === groundOrganizationId) return false;
  const here = await db.organizationMembership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: groundOrganizationId } },
    select: { id: true, heldForASeat: true },
  });
  if (here) {
    /* Held on one check-in, added to another now there is room: they take their seat. */
    if (here.heldForASeat && !held && db.organizationMembership.update) {
      await db.organizationMembership.update({ where: { id: here.id }, data: { heldForASeat: false } });
    }
    return false;
  }
  await db.organizationMembership.create({
    data: { userId: user.id, organizationId: groundOrganizationId, role: GUEST_ROLE, ...(held ? { heldForASeat: true } : {}) },
  });
  return true;
}

/**
 * A PERSON TAKES A SEAT THE MOMENT AN ADMIN SAYS YES (Hafsah, 26 November 2026).
 *
 * "Anyone invited to a check-in takes a seat the moment admin approves, they see who takes the seat and approve and pay if
 * needed." And: "Leads can add people to a check-in. If they are not part of the org yet, or a guest, the admin receives the list
 * with people added and they have to approve within a week and add them to a seat, or they can't keep checking in."
 *
 * So a person is placed here the moment they are added, whoever adds them:
 *   - added by an admin (or named on a check-in an admin approved): the admin's yes, so they hold a seat now, or are held for one
 *     when the plan has no room (`held`);
 *   - added by anybody else, when they are new here or a guest: in, with no seat yet, and a request for an admin to answer
 *     (`MembershipRequest`, PENDING, from today). They can do their own check-in at once; the board and the reports open when an
 *     admin lets them in (privacy row 5, kept: Hafsah chose "own check-in only", 26 November 2026). A week with no yes pauses
 *     their check-ins (grounds.cron.ts) and keeps what they said.
 *
 * Their account is made here at that moment, exactly as an invitation from People makes one (auth.service.ts teamInvite), so the
 * seat count is right from the start and accept() finds them already placed. Somebody already in the organisation is left alone.
 */
type DbWithUsers = Db & {
  user: { findUnique: (a: any) => Promise<any>; create: (a: any) => Promise<any> };
  organizationMembership: Db['organizationMembership'] & { upsert: (a: any) => Promise<any>; updateMany?: (a: any) => Promise<any> };
  membershipRequest: { upsert: (a: any) => Promise<any>; updateMany: (a: any) => Promise<any> };
};
export interface HowTheyWereAdded { name?: string | null; held?: boolean; byAnAdmin: boolean; addedBy: string; groundId: string }

export async function theirPlaceHereOnceAdded(db: DbWithUsers, organizationId: string, email: string, how: HowTheyWereAdded): Promise<'already here' | 'a seat' | 'held for a seat' | 'waiting for a yes'> {
  const lower = email.trim().toLowerCase();
  let user = await db.user.findUnique({ where: { email: lower }, select: { id: true, organizationId: true, isActive: true, deletedAt: true } });
  if (user && (user.deletedAt || !user.isActive)) return 'already here';
  const here = user ? await db.organizationMembership.findUnique({ where: { userId_organizationId: { userId: user.id, organizationId } }, select: { id: true, heldForASeat: true } }) : null;
  const pending = !!user && !!here?.heldForASeat;
  /* In already, holding a seat (or held only for room, which an admin's add does not change). */
  if (here && !pending) return 'already here';
  if (here && pending) {
    if (!how.byAnAdmin) return 'waiting for a yes';
    await letThemIn(db, organizationId, user!.id, how.addedBy, how.held);
    return how.held ? 'held for a seat' : 'a seat';
  }
  if (!user) {
    const typed = (how.name ?? '').replace(/\s+/g, ' ').trim();
    const localPart = lower.split('@')[0].replace(/[._\-+]/g, ' ').trim();
    const firstName = (typed ? typed.split(' ')[0] : localPart.charAt(0).toUpperCase() + localPart.slice(1).split(' ')[0]).slice(0, 40) || 'there';
    const lastName = typed ? typed.split(' ').slice(1).join(' ').slice(0, 100) : '';
    user = await db.user.create({ data: { organizationId, email: lower, firstName, lastName, role: 'MEMBER', isEmailVerified: false } });
  }
  /* Their own organisation (just made, or a membership row an older import left out) gives MEMBER; anybody else's account is a guest here. */
  const role = user!.organizationId === organizationId || !user!.organizationId ? 'MEMBER' : GUEST_ROLE;
  const noSeatYet = how.byAnAdmin ? !!how.held : true;
  await db.organizationMembership.upsert({
    where: { userId_organizationId: { userId: user!.id, organizationId } },
    create: { userId: user!.id, organizationId, role, heldForASeat: noSeatYet },
    update: { heldForASeat: noSeatYet },
  });
  if (how.byAnAdmin) return how.held ? 'held for a seat' : 'a seat';
  await db.membershipRequest.upsert({
    where: { organizationId_userId: { organizationId, userId: user!.id } },
    create: { organizationId, userId: user!.id, email: lower, requestedByUserId: how.addedBy, groundId: how.groundId, viaInvitation: true },
    update: {},
  });
  return 'waiting for a yes';
}

/**
 * LET THEM IN: THE ONE WRITE OF AN ADMIN'S YES. Their seat (unless `held`, when the plan has no room), their request answered, and
 * any check-in paused because the week ran out started again. Read by People's "Let in", by Ask, by an admin adding them, and by an
 * admin approving a check-in they are named on.
 */
export async function letThemIn(db: any, organizationId: string, userId: string, adminUserId: string, held = false): Promise<void> {
  await db.organizationMembership.updateMany({ where: { userId, organizationId }, data: { heldForASeat: !!held } });
  await db.membershipRequest.updateMany({
    where: { userId, organizationId, status: 'PENDING' },
    data: { status: 'APPROVED', decidedByUserId: adminUserId, decidedAt: new Date() },
  });
  if (!held) {
    /* Only the check-ins they were already invited to and paused on; somebody held because there was no room is released by the seat queue, which also sends their invitation. */
    await db.groundParticipant.updateMany({ where: { userId, awaitingSeat: true, invitedAt: { not: null }, leftAt: null, ground: { organizationId } }, data: { awaitingSeat: false } });
  }
}

/** How long an admin has to let in somebody a lead added, while they check in (Hafsah, 26 November 2026: "within a week"). */
export const A_WEEK_TO_SAY_YES_MS = 7 * 24 * 60 * 60 * 1000;

/** When the week for this request runs out. The one place the date is worked out, for the pause and for every sentence that says it. */
export const theWeekEnds = (askedAt: Date | string): Date => new Date(new Date(askedAt).getTime() + A_WEEK_TO_SAY_YES_MS);

/**
 * A WEEK WITH NO YES PAUSES THEIR CHECK-INS. Every check-in of this organisation they were invited to is held, the same hold as
 * somebody with no seat (held-for-a-seat.ts): no new session, no reminder, and what they already said stays theirs to read. Letting
 * them in later (letThemIn) starts it again. Run by the clock; nothing here is sent to anybody.
 */
export async function pauseThoseNotLetInWithinAWeek(db: any, now: Date = new Date()): Promise<number> {
  const due: { userId: string; organizationId: string }[] = await db.membershipRequest.findMany({
    where: { status: 'PENDING', groundId: { not: null }, createdAt: { lte: new Date(now.getTime() - A_WEEK_TO_SAY_YES_MS) } },
    select: { userId: true, organizationId: true },
  });
  let paused = 0;
  for (const r of due) {
    const here = await db.organizationMembership.findUnique({ where: { userId_organizationId: { userId: r.userId, organizationId: r.organizationId } }, select: { heldForASeat: true } });
    if (!here?.heldForASeat) continue;
    const res = await db.groundParticipant.updateMany({ where: { userId: r.userId, awaitingSeat: false, leftAt: null, ground: { organizationId: r.organizationId } }, data: { awaitingSeat: true } });
    paused += res?.count ?? 0;
  }
  return paused;
}

const aDay = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Lagos' });

/** "They can check in until Wednesday 3 December. After that their check-ins pause until you let them in." Or, once it has passed, that they are paused. */
export function theWeekSays(askedAt: Date | string, now: Date = new Date()): string {
  const ends = theWeekEnds(askedAt);
  return ends.getTime() > now.getTime()
    ? `They can check in until ${aDay(ends)}. After that their check-ins pause until you let them in.`
    : 'Their week ran out, so their check-ins are paused until you let them in. What they already said is kept.';
}

/** The same for several people, said once from the first week to run out. */
export function theWeeksSay(askedAt: (Date | string)[], now: Date = new Date()): string | null {
  const first = askedAt.map((d) => theWeekEnds(d)).sort((a, b) => a.getTime() - b.getTime())[0];
  if (!first) return null;
  return first.getTime() > now.getTime()
    ? `Each of them can check in for a week after they were added, and the first week runs out on ${aDay(first)}.`
    : 'The week has run out for at least one of them, so their check-ins are paused until you let them in.';
}
