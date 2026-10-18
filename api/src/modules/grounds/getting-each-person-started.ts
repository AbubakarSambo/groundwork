import { ForbiddenException, NotFoundException } from '@nestjs/common';

/**
 * GETTING EACH PERSON STARTED (screen match, 16 October; N-phase-16-getting-each-person-started/
 * getting-each-person-started-from-invited-to-coming.jpg, "what Wairimu sees under People and setup").
 *
 * Each person who checks in, from their invitation to coming back on their own, read from rows that already exist:
 *   Invited       an invitation went, or they came in themselves
 *   Reached       it did not bounce
 *   Verified      they opened the link and have an account here
 *   First check-in  they finished one
 *   Coming back   they finished two or more, the latest in the last fortnight
 * with one sentence saying where they are, by name. Nothing is written, nothing is scheduled, and nothing is said about
 * what Groundwork will send next, because no row records that: only what has happened.
 *
 * The same people and statuses whoever runs the check-in, and an admin, already read under "Who's in it", so it shows
 * nobody anything new; it is refused to anybody else, as that roster is.
 */

export const STAGES = ['Invited', 'Reached', 'Verified', 'First check-in', 'Coming back'] as const;
export type AStage = (typeof STAGES)[number];

export interface APersonGettingStarted {
  participantId: string;
  name: string;
  team: string | null;
  /** How many of the five stages they have reached, from the first. */
  reached: number;
  says: string;
  /**
   * WHAT ONLY YOU CAN DO FOR THEM (getting-each-person-started.jpg, "Needs you"): their invitation bounced, so the address
   * needs fixing, and the address it went to. Left out for everybody else. The reader is whoever runs the check-in or an
   * admin, who already reads each person's address on the roster.
   */
  needsYou?: { what: 'the address'; email: string | null };
}

const DAY = 86_400_000;
const theDay = (d: Date, now: Date) => {
  const days = Math.floor((now.getTime() - d.getTime()) / DAY);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { ...o, timeZone: 'Africa/Lagos' }).format(d);
  return days < 7 ? `on ${f({ weekday: 'long' })}` : `on ${f({ day: 'numeric', month: 'long' })}`;
};

export interface APersonsRows {
  participantId: string;
  name: string;
  team: string | null;
  invitedAt: Date | null;
  acceptedAt: Date | null;
  hasAnAccount: boolean;
  bounced: boolean;
  delivered: boolean;
  email?: string | null;
  /** Their check-ins on this check-in: when each started and finished. */
  checkIns: { startedAt: Date | null; completedAt: Date | null; quietClose: boolean }[];
}

export function whereEachPersonIsGettingStarted(people: APersonsRows[], now: Date): APersonGettingStarted[] {
  return people.map((p) => {
    const first = p.name.trim().split(/\s+/)[0] || p.name;
    const finished = p.checkIns.filter((c) => c.completedAt && !c.quietClose).map((c) => c.completedAt as Date).sort((a, b) => b.getTime() - a.getTime());
    const startedNotFinished = p.checkIns.filter((c) => c.startedAt && !c.completedAt).map((c) => c.startedAt as Date).sort((a, b) => b.getTime() - a.getTime());
    const invited = !!p.invitedAt || p.hasAnAccount;
    const reached = invited && !p.bounced;
    const verified = p.hasAnAccount;
    const firstCheckIn = finished.length >= 1;
    const comingBack = finished.length >= 2 && now.getTime() - finished[0].getTime() <= 14 * DAY;
    const count = [invited, reached, verified, firstCheckIn, comingBack].findIndex((x) => !x);
    const reachedStages = count === -1 ? 5 : count;
    let says: string;
    if (!invited) says = `${first} has not been sent an invitation yet.`;
    else if (p.bounced) says = `The invitation email to ${first} bounced, so it did not arrive. Check the address.`;
    else if (!verified) says = p.invitedAt
      ? `${first} was invited by email ${theDay(p.invitedAt, now)}.${p.delivered ? ' The email reached them,' : ''} ${p.delivered ? 'but they have' : `${first} has`} not opened the link yet.`
      : `${first} has not opened the link yet.`;
    else if (!finished.length && startedNotFinished.length) says = `${first} started a check-in ${theDay(startedNotFinished[0], now)} and stopped before the end. What they said is saved.`;
    else if (!finished.length) says = `${first} opened the link${p.acceptedAt ? ` ${theDay(p.acceptedAt, now)}` : ''}, but has not started a check-in yet.`;
    else if (finished.length === 1) says = `${first} checked in once, ${theDay(finished[0], now)}, and has not come back since.`;
    else if (!comingBack) says = `${first} has checked in ${finished.length} times, and not in the last two weeks.`;
    else says = `${first} checks in on their own, most recently ${theDay(finished[0], now)}.`;
    return {
      participantId: p.participantId, name: p.name, team: p.team, reached: reachedStages, says: says.replace(/\s+/g, ' ').trim(),
      ...(invited && p.bounced ? { needsYou: { what: 'the address' as const, email: p.email ?? null } } : {}),
    };
  });
}

/** The read, with the roster's own wall: whoever runs the check-in, or an admin of its organisation. */
export async function readWhereEachPersonIsGettingStarted(
  prisma: any,
  input: { groundId: string; organizationId: string; userId: string; role: string },
  now: Date = new Date(),
): Promise<{ stages: readonly string[]; people: APersonGettingStarted[] }> {
  const ground = await prisma.ground.findFirst({ where: { id: input.groundId, organizationId: input.organizationId }, select: { id: true, initiatorId: true, createdByUserId: true } });
  if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
  const runsIt = ground.initiatorId === input.userId || (!!ground.createdByUserId && ground.createdByUserId === input.userId);
  if (!runsIt && input.role !== 'ADMIN') throw new ForbiddenException('Only the person who runs this check-in, or an administrator of the organisation, can see how each person is getting started.');
  const parties: any[] = await prisma.groundParticipant.findMany({
    /*
     * EVERYBODY INVITED, WITH AN ACCOUNT OR NOT (screen match, 16 October). `NOT: { userId: <the lead> }` is SQL's
     * `NOT (user_id = ...)`, which is unknown, not true, where nobody has signed up yet, so every invitation not yet
     * opened (and every one that bounced) was left out of the very list that follows people from their invitation on.
     */
    where: { groundId: input.groundId, managingOnly: false, OR: [{ userId: null }, { userId: { not: ground.initiatorId } }] },
    select: {
      id: true, email: true, nameGiven: true, invitedAt: true, acceptedAt: true, userId: true, inviteDeliveryStatus: true, department: true,
      user: { select: { firstName: true, lastName: true } },
      checkIns: { select: { startedAt: true, completedAt: true, closedReason: true } },
    },
  });
  return {
    stages: STAGES,
    people: whereEachPersonIsGettingStarted(parties.map((p) => ({
      participantId: p.id,
      name: [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim() || String(p.nameGiven ?? '').trim() || String(p.email ?? '').split('@')[0] || 'Somebody',
      team: p.department ?? null,
      invitedAt: p.invitedAt ? new Date(p.invitedAt) : null,
      acceptedAt: p.acceptedAt ? new Date(p.acceptedAt) : null,
      hasAnAccount: !!p.userId,
      bounced: String(p.inviteDeliveryStatus ?? '').toUpperCase() === 'BOUNCED',
      email: p.email ?? null,
      delivered: String(p.inviteDeliveryStatus ?? '').toUpperCase() === 'DELIVERED',
      checkIns: (p.checkIns ?? []).map((c: any) => ({ startedAt: c.startedAt ? new Date(c.startedAt) : null, completedAt: c.completedAt ? new Date(c.completedAt) : null, quietClose: c.closedReason === 'auto_closed' })),
    })), now),
  };
}
