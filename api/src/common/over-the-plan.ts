/**
 * WHO IS WAITING FOR A SEAT BECAUSE THE PLAN IS FULL (request 197, Hafsah's answer, 8 October).
 *
 * An organisation can have more people with accounts than its plan covers. Organisations already over their limit when this
 * release went out KEEP EVERYONE THEY HAVE: nobody with an account at release is ever held because of this. Only people added
 * after the release (the engagement moment, `release.engagement_from`) wait for a seat, when the plan is over its cap.
 *
 * ONE RULE, used by the People list, Plan and billing and the refusal of new participation, so they never pick different people:
 *   - the people held are the most recently added to the organisation (the membership's own date), after the release,
 *     as many as there are over the cap, and never more than the ones added after the release;
 *   - an admin is never one of them, and nor is anyone who runs a check-in or set one up for a lead;
 *   - nothing is stored: adding a seat or a plan frees them at once.
 *
 * They keep their own answers and their own report (decision 110, B3) and are refused only new participation.
 */
export interface APersonOnTheAccount {
  userId: string;
  role: string | null | undefined;
  joinedAt: Date | string | null | undefined;
  runsACheckIn: boolean;
}

/** How many more people have accounts than the plan covers; zero when there is no cap or nobody is over. */
export function howManyAreOverThePlan(seatsTaken: number, cap: number | null | undefined): number {
  if (cap === null || cap === undefined) return 0;
  return Math.max(0, seatsTaken - cap);
}

/** The one sentence People and Plan and billing both say, of those waiting. Null when nobody is waiting. */
export function theOverThePlanSentence(waiting: number): string | null {
  if (waiting <= 0) return null;
  return waiting === 1
    ? '1 person is waiting for a seat because your plan is full. Choose a plan so everyone keeps checking in.'
    : `${waiting} people are waiting for a seat because your plan is full. Choose a plan so everyone keeps checking in.`;
}

/** The most recently added people, never an admin and never anyone who runs a check-in. Pure, so it can be proved. */
export function whoIsOverThePlan(people: APersonOnTheAccount[], cap: number | null | undefined, since: Date | null): Set<string> {
  if (!since) return new Set();
  const over = howManyAreOverThePlan(people.length, cap);
  if (!over) return new Set();
  const time = (p: APersonOnTheAccount) => (p.joinedAt ? new Date(p.joinedAt).getTime() : 0);
  const mayBeHeld = people
    .filter((p) => p.role !== 'ADMIN' && !p.runsACheckIn && time(p) >= since.getTime())
    .sort((a, b) => time(b) - time(a) || (a.userId < b.userId ? 1 : -1));
  return new Set(mayBeHeld.slice(0, over).map((p) => p.userId));
}

/** Reads who holds a seat in the organisation (common/seats.ts `seatsIn`) and answers who is over. */
export async function theOverThePlan(
  prisma: any,
  organizationId: string,
  seatsIn: unknown,
  cap: number | null | undefined,
  since: Date | null,
): Promise<{ over: number; held: Set<string> }> {
  const users: any[] = (await prisma.user.findMany({
    where: seatsIn,
    select: {
      id: true,
      memberships: { where: { organizationId }, select: { role: true, createdAt: true } },
      createdAt: true,
      role: true,
    },
  })) ?? [];
  const everyone = users.map((u) => u.id);
  const runs: any[] = everyone.length
    ? (await prisma.ground.findMany({
      where: { organizationId, OR: [{ initiatorId: { in: everyone } }, { createdByUserId: { in: everyone } }] },
      select: { initiatorId: true, createdByUserId: true },
    })) ?? []
    : [];
  const runners = new Set<string>();
  for (const g of runs) {
    if (g.initiatorId) runners.add(g.initiatorId);
    if (g.createdByUserId) runners.add(g.createdByUserId);
  }
  const people: APersonOnTheAccount[] = users.map((u) => {
    const m = u.memberships?.[0];
    return { userId: u.id, role: m?.role ?? u.role, joinedAt: m?.createdAt ?? u.createdAt, runsACheckIn: runners.has(u.id) };
  });
  const held = whoIsOverThePlan(people, cap, since);
  return { over: held.size, held };
}
