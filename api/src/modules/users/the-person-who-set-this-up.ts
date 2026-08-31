/**
 * THE PERSON WHO SET THE ORGANISATION UP CANNOT BE REMOVED BY THE PEOPLE THEY LET IN.
 *
 * Hafsah's call, and it closes the hole that made a full-admin assistant safe to have: "it's fine
 * if they have full admin setup, as long as they cannot remove the person that set it up, but the
 * person that set it up can remove them."
 *
 * WHY IT IS NEEDED. Admin was a flat role: every admin could demote or deactivate every other
 * admin, including the founder, using powers the founder had just handed them. An organisation
 * where the owner can be locked out of their own account by somebody they promoted this morning is
 * one nobody should be asked to put 160 people into.
 *
 * IT IS ONE ASYMMETRY AND NOT A HIERARCHY. There is no chain of seniority here, no second tier, no
 * "super admin" that can do more day to day. Every admin is an admin. Exactly one of them cannot be
 * touched by the others, and that one can hand the position on.
 *
 * SUCCESSION IS THE POINT, NOT AN AFTERTHOUGHT. A protection with no way to transfer it becomes a
 * hostage the day that person leaves the company - the account would have an owner who no longer
 * works there and nobody able to change it. So the owner may name another admin, and doing so gives
 * the position away rather than sharing it.
 */

export interface Acting {
  /** The user doing it. */
  id: string;
  role: string;
}

export interface Target {
  id: string;
  role: string;
}

/**
 * Whether `who` may take a role or an account away from `target`.
 *
 * `ownerId` is null for an organisation from before this existed. That reads as "nobody is
 * protected", which is exactly what was true for them a minute ago - not as "everybody is".
 */
export function mayChange(who: Acting, target: Target, ownerId: string | null): { may: boolean; because?: string } {
  if (target.id !== ownerId) return { may: true };
  if (who.id === ownerId) return { may: true }; /* Their own account. Other rules still apply. */
  return { may: false, because: ONLY_THEY_CAN };
}

/**
 * WHAT AN ADMIN IS TOLD WHEN THEY TRY.
 *
 * It names the position rather than the person, because the reason is structural and saying "you
 * cannot do this to Hafsah" invites reading it as a personal ranking. It also says what the way
 * round is, which is a real one: that person can hand the position over.
 */
/*
 * NAMED FOR A POSITION THAT CAN MOVE, not for having signed up.
 *
 * The first version said "this is the person who set up this organisation". True on the day, and
 * false the moment it is handed on - which is the whole point of it being handable. Driving the
 * hand-over produced that sentence about somebody who had not set anything up.
 */
export const ONLY_THEY_CAN =
  'This person holds this account, and only they can change their own role or access. If they are '
  + 'leaving, they can hand that over to another admin first.';

/**
 * Whether `who` may hand the position to `target`.
 *
 * ONLY TO AN ADMIN. Handing it to somebody who cannot manage the organisation would produce an
 * account whose protected person cannot use the protection, and the fix for that would be the
 * former owner promoting them - which they can no longer do.
 */
export function mayHandOver(who: Acting, target: Target, ownerId: string | null): { may: boolean; because?: string } {
  if (who.id !== ownerId) return { may: false, because: NOT_YOURS_TO_GIVE };
  if (target.id === ownerId) return { may: false, because: 'They already have it.' };
  if (target.role !== 'ADMIN') return { may: false, because: MUST_BE_AN_ADMIN };

  return { may: true };
}

export const NOT_YOURS_TO_GIVE =
  'Only whoever holds this account can hand it over.';

export const MUST_BE_AN_ADMIN =
  'Make them an admin first. Whoever holds this has to be able to manage the organisation.';

/**
 * THE FIRST ADMIN OF A NEW ORGANISATION HOLDS IT.
 *
 * Found by signing up through the entry chat and reading the row: a brand new organisation came out
 * with no holder at all. The backfill had covered every organisation that already existed and
 * nothing set it on the ones created from then on - so the protection would have quietly applied to
 * yesterday's customers and to nobody after them, and they could never have claimed it, because
 * handing it over is something only a holder can do.
 *
 * A FUNCTION BECAUSE THERE ARE FIVE DOORS. An organisation is created in five places - sign-up,
 * magic link, entry chat, Google, and the standalone workspace an invitation falls back to - and a
 * line at each is five chances to forget. This is the only way it is set.
 *
 * IT NEVER TAKES IT FROM SOMEBODY. `updateMany` with a null guard, so running twice, or on an
 * organisation that already has a holder, does nothing.
 */
export async function theFirstAdminHoldsIt(
  tx: { organization: { updateMany: (a: any) => Promise<unknown> } },
  organizationId: string,
  userId: string,
): Promise<void> {
  await tx.organization.updateMany({
    where: { id: organizationId, ownerUserId: null },
    data: { ownerUserId: userId },
  });
}
