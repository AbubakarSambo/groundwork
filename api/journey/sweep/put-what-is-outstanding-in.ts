/**
 * WHAT IS OUTSTANDING, PUT INTO THE TEST BED (the lead's daily nudge, decision 120).
 *
 * The five organisations start with nothing overdue, so the nudge would have nothing to say. This puts, into a few check-ins, the things the nudge reads: a lead's own
 * commitment that is late, her people's, a decision somebody waits on her for, a wait with a day that has passed, a wait that has gone on for three weeks, a team target
 * that is behind. Days are counted from today. Run it once after reset.sh:   SWEEP=a npx ts-node -T journey/sweep/put-what-is-outstanding-in.ts
 * Everything here is a test value on this computer. No model is called.
 */
import { PrismaClient } from '@prisma/client';
import { theBed } from './the-test-bed';

const DAY = 86_400_000;
const today = () => { const n = new Date(); return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())); };
const ago = (days: number) => new Date(today().getTime() - days * DAY);

/** One check-in's worth: [lead's own late days, then three people's late days]. */
export async function putWhatIsOutstandingIn(db: PrismaClient, groundLabel: string, organizationName: string): Promise<string> {
  const ground = await db.ground.findFirst({ where: { label: groundLabel, organization: { name: organizationName } }, select: { id: true, initiatorId: true, label: true } });
  if (!ground) return `No check-in called "${groundLabel}" in ${organizationName}.`;
  const rows = await db.groundParticipant.findMany({ where: { groundId: ground.id, leftAt: null }, select: { id: true, userId: true, partyType: true, managingOnly: true } });
  const lead = rows.find((r) => r.userId === ground.initiatorId);
  const others = rows.filter((r) => r.userId !== ground.initiatorId && !r.managingOnly);
  if (!lead || others.length < 3) return `"${groundLabel}" does not have a lead and three people.`;
  const [a, b, c] = others;
  const promise = (participantId: string, text: string, lateDays: number, authoredBy = 'self') => db.personObjective.upsert({
    where: { groundId_participantId_kind_externalId: { groundId: ground.id, participantId, kind: 'COMMITMENT', externalId: '' } },
    create: { groundId: ground.id, participantId, text, kind: 'COMMITMENT', check: 'DONE_OR_NOT', dueKind: 'A_DATE', dueSaid: 'by then', dueDate: ago(lateDays), status: 'OPEN', authoredBy, seenBySubject: true },
    update: { dueDate: ago(lateDays), status: 'OPEN' },
  });
  await promise(lead.id, 'send the pricing note to finance', 3);
  await promise(a.id, 'send the supplier list', 6);
  await promise(b.id, 'confirm the depot visit dates', 2);
  await promise(c.id, 'update the stock sheet', 1);
  const wait = (fromParticipantId: string, onParticipantId: string, what: string, createdDaysAgo: number, extra: Record<string, unknown> = {}) => db.groundDependency.create({
    data: { groundId: ground.id, fromParticipantId, onParticipantId, what, namedTheThing: true, status: 'WAITING', createdAt: ago(createdDaysAgo), ...extra },
  });
  await wait(a.id, lead.id, 'the discount limit for the Naivas order', 5, { blockerKind: 'DECISION' });
  await wait(b.id, c.id, 'the delivery schedule', 9, { dueOn: ago(4), dueSaid: 'last week' });
  await wait(c.id, a.id, 'the customer list', 21);
  const objective = await db.groundObjective.create({ data: { groundId: ground.id, name: 'depots on the new stock system', target: 20, count: 4, direction: 'AIM', sortOrder: 90 } });
  for (const [session, count] of [[1, 1], [2, 2], [3, 4]]) await db.groundObjectiveSnapshot.create({ data: { groundId: ground.id, objectiveId: objective.id, sessionNumber: session, count } });
  return `Put what is outstanding into "${groundLabel}" in ${organizationName}.`;
}

if (require.main === module) {
  const bed = theBed();
  const db = new PrismaClient({ datasources: { db: { url: bed.databaseUrl } } });
  (async () => {
    /* The engagement messages began a month ago on this copy, so a check-in that has gone quiet can be told. */
    await db.platformSetting.upsert({ where: { key: 'release.engagement_from' }, create: { key: 'release.engagement_from', value: { at: ago(30).toISOString() }, updatedBy: 'the test bed' }, update: { value: { at: ago(30).toISOString() } } });
    for (const [label, org] of [['Sales team, Q4', 'Msingi Foods'], ['The new stock system, four depots', 'Msingi Foods'], ['Sales weekly update', 'Baobab Distribution'], ['Operations weekly update', 'Baobab Distribution']]) console.log(await putWhatIsOutstandingIn(db, label, org));
  })().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
}
