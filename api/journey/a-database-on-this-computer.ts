/**
 * THE ONE RULE FOR WHERE A SEED MAY WRITE (decision 98, item 2).
 *
 * A seed script loads into a database on the computer it is running on and nowhere else: the host
 * in the connection string must be exactly localhost or 127.0.0.1. Anything hosted is refused
 * before a single row is read or written.
 *
 * IT LIVES IN ITS OWN FILE SO THERE IS ONE RULE AND NOT TWO. It used to be exported from
 * seed-a-marketview-q4-check-in.ts, and importing it from there silently gave back `undefined`,
 * because `seed-a-marketview-q4-check-in.json` sits beside it and wins module resolution. The
 * second seed then failed at the call rather than at the import, which is a confusing way to find
 * out - and a seed whose guard is undefined is exactly the thing this rule exists to prevent.
 */

/** Whether this connection string names a Postgres database on this computer, and nothing else. */
export function itIsADatabaseOnThisComputer(url: string | undefined): boolean {
  if (!url || !/^postgres(ql)?:\/\//i.test(url)) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return false;
  }
}

/** The sentence a refused seed says, so every seed refuses in the same words. */
export const NOT_A_DATABASE_ON_THIS_COMPUTER =
  'This only loads into a database on this computer (host localhost or 127.0.0.1). Nothing was read or written.';

/**
 * A PERSON IS ONLY IN AN ORGANISATION IF THERE IS A MEMBERSHIP ROW. Signing in reads one
 * (`jwt.strategy.ts`); without it the link is accepted and `/auth/me` answers 401, and the person
 * lands on "session expired". Screens request 158 found exactly that in all four seeds.
 *
 * The compound key is `userId_organizationId`, the order the model declares (`@@unique([userId,
 * organizationId])`), not the other way round. Three of the seeds had it reversed and hid the
 * failure behind `.catch(() => undefined)`, so each one wrote nothing and said nothing. There is no
 * catch here on purpose: a seed that cannot write a membership has not loaded, and should say so.
 *
 * The role goes on the row, on create AND on update, or the admin and the leads come back as plain
 * members the second time a seed is run.
 */
export async function theyAreInThisOrganisation(
  db: { organizationMembership: { upsert: (a: any) => Promise<unknown> } },
  organizationId: string,
  userId: string,
  role: 'ADMIN' | 'LEAD' | 'MEMBER',
) {
  await db.organizationMembership.upsert({
    where: { userId_organizationId: { userId, organizationId } },
    update: { role: role as any },
    create: { userId, organizationId, role: role as any },
  });
}
