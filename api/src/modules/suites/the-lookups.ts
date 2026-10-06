import type { PrismaService } from '../prisma/prisma.service';
import { withTheirSignIns } from './a-roster-entry-and-its-sign-in';
import { readDuties, type Duties } from './who-holds-each-duty';

/**
 * WHAT A READ OF MANY REQUESTS LOADS ONCE, so each request is decided in memory (decision 85's one
 * approval resolver, who-may-decide.ts, answers from this when it is given, and from the database, one
 * question at a time, when it is not).
 *
 * The boards used to ask the database several questions for every request on them (the person's
 * directory entry, their manager's, a role, the duties, who is away), so a board of 150 requests asked
 * about a thousand. Everything the resolver needs about an organisation is small and the same for every
 * request: its memberships, its staff directory, its duties, and who is on approved leave today with who
 * stands in. Read once, the same read costs the same for ten requests as for a thousand. Nothing here
 * decides anything: the resolver is the only place that does.
 */

/** One entry of the staff directory, as the resolver reads it. */
export interface AnEntry { externalId: string; userId: string | null; department: string | null; managerExternalId: string | null; givenName: string | null; displayName: string | null }

export interface Lookups {
  /** Each member's role in this organisation, by sign-in. A sign-in with no row is not in it. */
  roles: Map<string, string>;
  /** Each sign-in's directory entry (linked, or matched by address), by sign-in. */
  entryOf: Map<string, AnEntry>;
  /** Each active directory entry, by its external id. */
  byExternalId: Map<string, AnEntry>;
  duties: Duties;
  /** Who is on approved leave today and has a stand-in who is not away too: the away person's sign-in to the stand-in's. */
  cover: Map<string, string>;
  /** Everybody on approved leave today, with the last day of it, by sign-in. */
  away: Map<string, string>;
  on: Date;
  /** First names of sign-ins asked for so far in this one read, so a name is asked of the database once and not once a request. */
  names: Map<string, string>;
  /** The names this organisation knows (people, teams, customers), so a line that starts with one keeps its capital (a-request-in-words.ts). */
  knownNames: string[];
}

const dayOf = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Who is on approved leave on a day and who stands in for them. A stand-in who is on approved leave on
 * that day too does not stand in (nobody stands in for a stand-in). Only approved leave counts: not
 * waiting, not declined.
 */
export async function leaveToday(
  prisma: PrismaService, organizationId: string, on: Date = new Date(),
): Promise<{ cover: Map<string, string>; away: Map<string, string> }> {
  const cover = new Map<string, string>();
  const away = new Map<string, string>();
  const table = (prisma as any)?.leaveRequest;
  if (!table?.findMany) return { cover, away };
  const today = new Date(`${dayOf(on)}T00:00:00.000Z`);
  const found: { userId: string; standInUserId?: string | null; status?: string; startsOn?: Date; endsOn?: Date }[] = await table
    .findMany({ where: { organizationId, status: 'approved', startsOn: { lte: today }, endsOn: { gte: today } }, select: { userId: true, standInUserId: true, status: true, startsOn: true, endsOn: true } })
    .catch(() => []);
  /* Asked again here, in the dates themselves, so the answer never depends on the read having filtered. */
  const rows = (found ?? []).filter((r) => r?.userId && r.status === 'approved' && r.startsOn && r.endsOn && r.startsOn <= today && r.endsOn >= today) as { userId: string; standInUserId: string | null; endsOn: Date }[];
  for (const r of rows) {
    const until = dayOf(r.endsOn);
    if (!away.get(r.userId) || until > (away.get(r.userId) as string)) away.set(r.userId, until);
  }
  for (const r of rows) if (r.standInUserId && r.standInUserId !== r.userId && !away.has(r.standInUserId)) cover.set(r.userId, r.standInUserId);
  return { cover, away };
}

/** Who stands in for whom today, by the away person's sign-in. */
export async function coverToday(prisma: PrismaService, organizationId: string, on: Date = new Date()): Promise<Map<string, string>> {
  return (await leaveToday(prisma, organizationId, on)).cover;
}

/** The people this sign-in stands in for today. Empty for almost everybody. */
export async function whoTheyStandInFor(prisma: PrismaService, organizationId: string, userId: string, on: Date = new Date()): Promise<string[]> {
  return [...(await coverToday(prisma, organizationId, on))].filter(([, standIn]) => standIn === userId).map(([away]) => away);
}

/**
 * Everything the resolver asks about an organisation, in four reads (memberships, the directory, the
 * duties, today's leave), plus one more per address when a directory entry has no sign-in linked and is
 * matched by its address (a-roster-entry-and-its-sign-in.ts). `duties` may be passed when already read.
 */
export async function loadLookups(prisma: PrismaService, organizationId: string, on: Date = new Date(), already: { duties?: Duties } = {}): Promise<Lookups> {
  const [members, entries, duties, today] = await Promise.all([
    prisma.organizationMembership.findMany({ where: { organizationId }, select: { userId: true, role: true } }),
    prisma.person.findMany({
      where: { organizationId, active: true },
      select: { externalId: true, linkedUserId: true, email: true, department: true, managerExternalId: true, givenName: true, familyName: true, displayName: true },
    }),
    already.duties ? Promise.resolve(already.duties) : readDuties(prisma, organizationId),
    leaveToday(prisma, organizationId, on),
  ]);
  /* An organisation has members and every membership has a role. A read that says otherwise has not read what the resolver needs, and the caller asks the old way. */
  if (!Array.isArray(members) || !members.length || members.some((m) => !m?.userId || !m.role)) throw new Error('The memberships were read without their roles.');
  const roles = new Map<string, string>(members.map((m) => [m.userId, String(m.role)]));
  const signed = await withTheirSignIns(prisma, organizationId, entries ?? []);
  const byExternalId = new Map<string, AnEntry>();
  const entryOf = new Map<string, AnEntry>();
  for (const p of signed) {
    const e: AnEntry = {
      externalId: p.externalId, userId: p.userId, department: p.department ?? null, managerExternalId: p.managerExternalId ?? null,
      givenName: p.givenName ?? null, displayName: p.displayName ?? null,
    };
    byExternalId.set(p.externalId, e);
    if (p.userId && !entryOf.has(p.userId)) entryOf.set(p.userId, e);
  }
  /* Customers are the organisation's own counterparties (a Subject of that type); a read that cannot be made leaves them out. */
  const customers: { title?: string | null }[] = await (prisma as any).subject?.findMany?.({ where: { organizationId, type: 'COUNTERPARTY' }, select: { title: true }, take: 2000 })?.catch?.(() => []) ?? [];
  const knownNames = [...new Set([
    ...signed.flatMap((p) => [p.givenName, p.familyName, p.displayName, p.department]),
    ...customers.map((c) => c.title),
  ].filter((x): x is string => !!x && x.trim().length >= 2))];
  return { roles, entryOf, byExternalId, duties, cover: today.cover, away: today.away, on, names: new Map(), knownNames };
}
