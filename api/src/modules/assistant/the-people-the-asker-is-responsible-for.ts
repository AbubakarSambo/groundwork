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
import { theDirectReportsOf } from '../suites/who-may-decide';

const nameOf = (u: any) => [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim();

/** The people, by name, and the check-ins they run with who is in each. A question names a team the way people do ("the sales team"), and the model can only
 * tell that "the sales team" is Wairimu's "Sales team, Q4" when it is given the check-in's name with its people (release test, 22 November 2026, bug N5). */
export interface ThePeopleTheyLead {
  names: string[];
  checkInsTheyRun: { label: string; names: string[] }[];
}

export async function thePeopleTheAskerIsResponsibleFor(prisma: any, a: { organizationId: string; userId: string }): Promise<ThePeopleTheyLead> {
  const names = new Set<string>();
  const tidy = (n: unknown) => String(n ?? '').replace(/\s+/g, ' ').trim();
  const add = (n: unknown) => { const t = tidy(n); if (t) names.add(t); };
  const direct = await theDirectReportsOf(prisma, a);
  const grounds: any[] = (await Promise.resolve(prisma.ground?.findMany?.({ where: { organizationId: a.organizationId, initiatorId: a.userId }, select: { id: true, label: true } })).catch(() => [])) ?? [];
  const inMine: any[] = grounds.length ? (await Promise.resolve(prisma.groundParticipant?.findMany?.({ where: { groundId: { in: grounds.map((g) => g.id) } }, select: { groundId: true, userId: true, nameGiven: true } })).catch(() => [])) ?? [] : [];
  const userIds = [...new Set([...direct.userIds, ...inMine.map((p) => p.userId)].filter((x) => x && x !== a.userId))];
  const users: any[] = userIds.length ? (await Promise.resolve(prisma.user?.findMany?.({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true } })).catch(() => [])) ?? [] : [];
  const nameById = new Map(users.map((u) => [u.id, nameOf(u)]));
  const nameIn = (p: any): string => (p.userId ? (p.userId === a.userId ? '' : nameById.get(p.userId) ?? '') : tidy(p.nameGiven));
  for (const u of users) add(nameOf(u));
  for (const p of inMine) if (!p.userId) add(p.nameGiven);
  for (const n of direct.unsigned) add(n);
  for (const c of await theTeamSheNamed(prisma, a.organizationId, a.userId).catch(() => [])) add(c.name);
  const checkInsTheyRun = grounds
    .map((g) => ({ label: tidy(g.label), names: [...new Set(inMine.filter((p) => !p.groundId || p.groundId === g.id).map(nameIn).filter(Boolean))] }))
    .filter((g) => g.label && g.names.length);
  return { names: [...names], checkInsTheyRun };
}

/** What the model is told about them, in plain sentences: who they lead, and who is in each check-in they run, by the check-in's name. */
export function sayThePeopleTheyLead(theirs: ThePeopleTheyLead): string {
  if (!theirs.names.length) return 'Nobody reports to you, and you run no check-in.';
  return [
    `These people report to you, are in a check-in you run, or are the team you named: ${theirs.names.join(', ')}.`,
    ...theirs.checkInsTheyRun.map((g) => `You run the check-in "${g.label}", and these people are in it: ${g.names.join(', ')}. When the question names this team in any words, it means them.`),
  ].join('\n');
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
