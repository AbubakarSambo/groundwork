import * as RUN from './__fixtures__/the-final-check.json';
import { dated, matches, table, withNothing, asItStoodAt, aPersonRecordTable } from './the-persons-record-bed';

/**
 * THE FINAL REAL-MODEL CHECK, AS A DATABASE (test data only; Hafsah's final check, 21 October 2026).
 *
 * Drop Access (test) "Sales team, Q4" and Muchemi & Co (test) "Fee notes" and "Litigation team daily": the rows of gw_final_check as the
 * run left them (`__fixtures__/the-final-check.json`, written by journey/final-check/export-the-record.ts, read only). The bed's days are
 * Monday 12 to Wednesday 14 October; the morning summary was read on Thursday 15 October and the weekly letter on Friday 16 October.
 * Served by a stand-in for the database. No model is called.
 */
export const FC: any = (RUN as any).default ?? RUN;
export type AGroundOfTheCheck = 'drop' | 'fees' | 'lit';

/** Thursday 15 October, 07:45 in Nairobi: the morning summary after the third day. */
export const THURSDAY_MORNING = new Date('2026-10-15T04:45:00.000Z');
/** Friday 16 October, 17:30 in Nairobi: after the weekly letter. */
export const FRIDAY_EVENING = new Date('2026-10-16T14:30:00.000Z');

export function theCheckAsADatabase(g: AGroundOfTheCheck, opts: { directMorning?: boolean; judgements?: boolean; personRecord?: ReturnType<typeof aPersonRecordTable>; others?: AGroundOfTheCheck[]; asOf?: Date } = {}) {
  const R = opts.asOf ? asItStoodAt(dated(FC[g]), opts.asOf) : dated(FC[g]);
  const all = [g, ...(opts.others ?? [])].map((x) => ({ key: x, R: x === g ? R : dated(FC[x]) }));
  const orgOf = (x: any) => (FC.org as any[]).find((o) => o.id === x.ground.organizationId);
  const ground = (x: any) => ({
    ...x.ground,
    organization: { timeZone: orgOf(x)?.timeZone ?? 'Africa/Nairobi', name: orgOf(x)?.name },
    initiator: (() => { const p = x.participants.find((y: any) => y.userId === x.ground.initiatorId); return p ? { firstName: p.user?.firstName ?? null, lastName: p.user?.lastName ?? null, email: p.email } : null; })(),
    participants: x.participants,
  });
  const org = { ...orgOf(R), directMorningOn: opts.directMorning ?? false, personJudgementsOn: opts.judgements ?? true, release1bTabsOn: true, release1SalesBoardOn: true, release2CollectionsOn: true, billWord: /Muchemi/.test(orgOf(R)?.name ?? '') ? 'fee note' : null };
  const whose = new Map((R.checkIns as any[]).map((c) => [c.id, c.participantId]));
  return withNothing({
    organization: { findUnique: jest.fn(async () => structuredClone(org)), findMany: jest.fn(async () => [structuredClone(org)]) },
    ground: {
      findUnique: jest.fn(async ({ where }: any = {}) => structuredClone(ground(all.find((x) => x.R.ground.id === (where?.id ?? R.ground.id))?.R ?? R))),
      findFirst: jest.fn(async ({ where }: any = {}) => structuredClone(ground(all.find((x) => x.R.ground.id === (where?.id ?? R.ground.id))?.R ?? R))),
      findMany: jest.fn(async ({ where }: any = {}) => all.map((x) => x.R).filter((x) => matches(x.ground, where)).map((x) => structuredClone({ ...x.ground }))),
    },
    groundParticipant: table(R.participants),
    checkIn: table(R.checkIns.map((c: any) => ({ ...c, turns: R.turns.filter((x: any) => x.checkInId === c.id) }))),
    recordEntry: table(R.lines),
    groundCommitment: table(R.commitments),
    groundDependency: table(R.waits),
    conversationTurn: table(R.turns.map((x: any) => ({ ...x, checkIn: { participantId: whose.get(x.checkInId) ?? null, groundId: R.ground.id } }))),
    workItem: table(R.items),
    itemEvidence: table(R.evidence),
    groundDocument: table(R.documents),
    groundObjective: table(R.objectives),
    groundObjectiveSnapshot: table(R.snapshots ?? []),
    groundContextItem: table(R.contextItems),
    personRecord: opts.personRecord ?? aPersonRecordTable(),
  });
}

/** A person of the check, by first name, in one check-in. */
export function thePersonOfTheCheck(g: AGroundOfTheCheck, firstName: string): { participantId: string; userId: string } {
  const p = (FC[g].participants as any[]).find((x) => x.user?.firstName === firstName);
  if (!p) throw new Error(`${firstName} is not in ${g}`);
  return { participantId: p.id, userId: p.userId };
}

/** The people's records as the run kept them: rebuilt each evening a check-in finished, and once more at `end`. */
export async function theCheckRebuiltEachEvening(g: AGroundOfTheCheck, rebuild: (prisma: any, groundId: string, at: Date) => Promise<number>, end = FRIDAY_EVENING, t = aPersonRecordTable()) {
  const days = [...new Set((FC[g].checkIns as any[]).filter((c) => c.completedAt).map((c) => String(c.completedAt).slice(0, 10)))].sort();
  for (const d of days) {
    const at = new Date(`${d}T17:00:00Z`);
    if (at.getTime() > end.getTime()) continue;
    await rebuild(theCheckAsADatabase(g, { asOf: at, personRecord: t }), FC[g].ground.id, at);
  }
  await rebuild(theCheckAsADatabase(g, { personRecord: t, asOf: end }), FC[g].ground.id, end);
  return t;
}
