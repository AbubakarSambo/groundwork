/**
 * THE PEOPLE THE ASKER IS RESPONSIBLE FOR (decision O-15, changed by Hafsah on 21 November 2026: "the assistant can now do performance but only for DRs or people
 * you are responsible for"). Ask may give a view of how somebody is doing, with the evidence, only about these people:
 *   - their direct reports, from the role map (a membership's `reportsToUserId`, and the roster's `managerExternalId`);
 *   - the people in the check-ins they run;
 *   - for a senior person, the team she named and introduced Groundwork to.
 * For anybody else, Ask says what is outstanding and never judges. This is read here, in the backend, and the answer is held to it whatever the model says
 * (a-question-is-answered-from-the-documents.ts). Somebody who acts for her is not responsible for her team: the rule follows the asker, not whose record it is.
 */
import { theTeamSheNamed } from '../executive-onboarding/the-material-for-work';

const nameOf = (u: any) => [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim();

export async function thePeopleTheAskerIsResponsibleFor(prisma: any, a: { organizationId: string; userId: string }): Promise<string[]> {
  const names = new Set<string>();
  const add = (n: unknown) => { const t = String(n ?? '').replace(/\s+/g, ' ').trim(); if (t) names.add(t); };
  const reports: any[] = (await Promise.resolve(prisma.organizationMembership?.findMany?.({ where: { organizationId: a.organizationId, reportsToUserId: a.userId }, select: { userId: true } })).catch(() => [])) ?? [];
  const me: any = await Promise.resolve(prisma.person?.findFirst?.({ where: { organizationId: a.organizationId, linkedUserId: a.userId }, select: { externalId: true } })).catch(() => null);
  const onTheRoster: any[] = me?.externalId ? (await Promise.resolve(prisma.person?.findMany?.({ where: { organizationId: a.organizationId, managerExternalId: me.externalId }, select: { displayName: true, givenName: true, familyName: true, linkedUserId: true } })).catch(() => [])) ?? [] : [];
  const grounds: any[] = (await Promise.resolve(prisma.ground?.findMany?.({ where: { organizationId: a.organizationId, initiatorId: a.userId }, select: { id: true } })).catch(() => [])) ?? [];
  const inMine: any[] = grounds.length ? (await Promise.resolve(prisma.groundParticipant?.findMany?.({ where: { groundId: { in: grounds.map((g) => g.id) } }, select: { userId: true, nameGiven: true } })).catch(() => [])) ?? [] : [];
  const userIds = [...new Set([...reports.map((r) => r.userId), ...inMine.map((p) => p.userId)].filter((x) => x && x !== a.userId))];
  const users: any[] = userIds.length ? (await Promise.resolve(prisma.user?.findMany?.({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true } })).catch(() => [])) ?? [] : [];
  for (const u of users) add(nameOf(u));
  for (const p of inMine) if (!p.userId) add(p.nameGiven);
  for (const p of onTheRoster) if (p.linkedUserId !== a.userId) add(p.displayName || [p.givenName, p.familyName].filter(Boolean).join(' '));
  for (const c of await theTeamSheNamed(prisma, a.organizationId, a.userId).catch(() => [])) add(c.name);
  return [...names];
}

/** Whether a person named in a question is one of them: the full name, or a first name only one of them has. An empty name, a judgement across the people the asker
 * is responsible for ("Who is my best performer?"), is theirs when they are responsible for anybody. */
export function isOneOfThem(named: string | null | undefined, theirs: string[]): boolean {
  const n = String(named ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!n) return theirs.length > 0;
  const full = theirs.map((t) => t.toLowerCase());
  if (full.includes(n)) return true;
  const first = full.filter((t) => t.split(' ')[0] === n.split(' ')[0]);
  return n.split(' ').length === 1 && first.length === 1;
}
