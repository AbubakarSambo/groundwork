import type { PrismaService } from '../prisma/prisma.service';
import { theirRosterEntry, withTheirSignIns } from './a-roster-entry-and-its-sign-in';

/**
 * EVERYBODY HERE, AS THE SUITES' RULES AND THE SETUP CHECK READ THEM (Batch S, S1 and S3).
 *
 * One read of the organisation: each member who is not a guest, with their name, their app role, their job title and team from
 * the staff directory (or the team an admin set on the People page), and who they report to. Who they report to is worked out
 * the same way the approval resolver does it (who-may-decide.ts): the line an admin set on the People page or by chat, or else the
 * manager the staff directory names, when that manager signs in here. The People page reads it from here too (users.service.ts),
 * so the page and the approvals never disagree (Batch S, round 2, T7). Nobody reports to themselves, and a guest is nobody's
 * manager.
 */
export interface APersonHere {
  userId: string;
  name: string;
  firstName: string;
  /** ADMIN, LEAD or MEMBER. */
  appRole: string;
  /** Their job title in the staff directory, or null. */
  title: string | null;
  /** Their team: the staff directory's department, or else the team set on the People page. */
  team: string | null;
  /** Who they report to here, or null when nobody. */
  managerUserId: string | null;
}

export async function thePeopleHere(prisma: PrismaService, organizationId: string): Promise<APersonHere[]> {
  const members: any[] = await (prisma as any).organizationMembership?.findMany?.({
    where: { organizationId },
    select: { userId: true, role: true, team: true, reportsToUserId: true, user: { select: { firstName: true, lastName: true } } },
  })?.catch?.(() => []) ?? [];
  const here = (members ?? []).filter((m) => m?.userId && m.role && m.role !== 'GUEST');
  const ids = new Set(here.map((m) => m.userId as string));
  const entries: any[] = await (prisma as any).person?.findMany?.({
    where: { organizationId, active: true },
    select: { externalId: true, linkedUserId: true, email: true, title: true, department: true, managerExternalId: true },
  })?.catch?.(() => []) ?? [];
  const signed = await withTheirSignIns(prisma, organizationId, entries ?? []).catch(() => [] as any[]);
  const byExternalId = new Map<string, any>(signed.map((p: any) => [p.externalId, p]));
  const entryOf = new Map<string, any>();
  for (const p of signed) if (p.userId && !entryOf.has(p.userId)) entryOf.set(p.userId, p);
  return here.map((m) => {
    const e = entryOf.get(m.userId);
    const first = String(m.user?.firstName ?? '').trim();
    const name = `${first} ${String(m.user?.lastName ?? '').trim()}`.trim();
    const fromDirectory = e?.managerExternalId ? byExternalId.get(e.managerExternalId)?.userId ?? null : null;
    const set = m.reportsToUserId ?? null;
    /* The line an admin set on the People page or by chat comes first, then the staff directory's: the same order the approval resolver reads (who-may-decide.ts, theLineAbove). */
    const managerUserId = [set, fromDirectory].find((id) => id && id !== m.userId && ids.has(id)) ?? null;
    return {
      userId: m.userId, name, firstName: first, appRole: String(m.role),
      title: e?.title?.trim() || null,
      team: e?.department?.trim() || m.team?.trim() || null,
      managerUserId,
    };
  });
}

/** One person, as the suites' rules read them (who-a-rule-is-for.ts): their app role, job title and team. Null when not here. */
export async function thePersonForRules(prisma: PrismaService, organizationId: string, userId: string): Promise<Pick<APersonHere, 'userId' | 'appRole' | 'title' | 'team'> | null> {
  const m: any = await (prisma as any).organizationMembership?.findUnique?.({
    where: { userId_organizationId: { userId, organizationId } }, select: { role: true, team: true },
  })?.catch?.(() => null);
  if (!m?.role || m.role === 'GUEST') return null;
  const e: any = await theirRosterEntry(prisma, organizationId, userId, { title: true, department: true }).catch(() => null);
  return { userId, appRole: String(m.role), title: e?.title?.trim() || null, team: e?.department?.trim() || m.team?.trim() || null };
}
