import * as RUN from './__fixtures__/round-15-drop-access.json';
import { dated, matches, table, withNothing, asItStoodAt, aPersonRecordTable } from './the-persons-record-bed';

/**
 * POLISH ROUND 15, AS A DATABASE (test data only; read on 26 October 2026).
 *
 * Drop Access (test) "Sales team, Q4": the rows of gw_loop_round15 as the run left them (`__fixtures__/round-15-drop-access.json`, read
 * only). Kevin proved Kilele Hotel (40 units, the M-Pesa PDF for KES 200,000), Ngong Road Minimart (5 units, M-Pesa code SFK2P8LQ4C for
 * KES 25,000) and Savannah Cafe (6 units, a KES 15,000 deposit, RBT7Y3KQ2P, and the KES 15,000 balance, SGL9W4MN7T, on Friday 16
 * October); Joseph typed M-Pesa code TGH5K2M9QX on Friday 16 October when asked what shows his 2 units for Juja Hardware. Served by a
 * stand-in for the database. No model is called.
 */
export const R15: any = (RUN as any).default ?? RUN;

/** Friday 16 October, 17:30 in Nairobi: after everybody's last check-in of the week. */
export const R15_FRIDAY_EVENING = new Date('2026-10-16T14:30:00.000Z');

export function theRound15AsADatabase(opts: { personRecord?: ReturnType<typeof aPersonRecordTable>; asOf?: Date } = {}) {
  const R = opts.asOf ? asItStoodAt(dated(R15.drop), opts.asOf) : dated(R15.drop);
  const orgRow = (R15.org as any[])[0];
  const ground = {
    ...R.ground,
    organization: { timeZone: orgRow?.timeZone ?? 'Africa/Nairobi', name: orgRow?.name },
    initiator: (() => { const p = R.participants.find((y: any) => y.userId === R.ground.initiatorId); return p ? { firstName: p.user?.firstName ?? null, lastName: p.user?.lastName ?? null, email: p.email } : null; })(),
    participants: R.participants,
  };
  const org = { ...orgRow, directMorningOn: true, personJudgementsOn: true, release1bTabsOn: true, release1SalesBoardOn: true };
  const whose = new Map((R.checkIns as any[]).map((c) => [c.id, c.participantId]));
  return withNothing({
    organization: { findUnique: jest.fn(async () => structuredClone(org)), findMany: jest.fn(async () => [structuredClone(org)]) },
    ground: {
      findUnique: jest.fn(async () => structuredClone(ground)),
      findFirst: jest.fn(async () => structuredClone(ground)),
      findMany: jest.fn(async ({ where }: any = {}) => (matches(R.ground, where) ? [structuredClone({ ...R.ground })] : [])),
    },
    groundParticipant: table(R.participants),
    checkIn: table(R.checkIns.map((c: any) => ({ ...c, turns: R.turns.filter((x: any) => x.checkInId === c.id) }))),
    recordEntry: table(R.lines.map((l: any) => ({ ...l, participant: { groundId: R.ground.id } }))),
    groundCommitment: table(R.commitments),
    groundDependency: table(R.waits),
    conversationTurn: table(R.turns.map((x: any) => ({ ...x, checkIn: { participantId: whose.get(x.checkInId) ?? null, groundId: R.ground.id } }))),
    workItem: table(R.items),
    itemEvidence: table(R.evidence),
    groundDocument: table(R.documents),
    groundObjective: table(R.objectives),
    groundObjectiveSnapshot: table(R.snapshots ?? []),
    groundContextItem: table(R.contextItems ?? []),
    personRecord: opts.personRecord ?? aPersonRecordTable(),
  });
}

/** A person of round 15, by first name. */
export function thePersonOfRound15(firstName: string): { participantId: string; userId: string } {
  const p = (R15.drop.participants as any[]).find((x) => x.user?.firstName === firstName || String(x.nameGiven ?? '').split(' ')[0] === firstName);
  if (!p) throw new Error(`${firstName} is not in round 15`);
  return { participantId: p.id, userId: p.userId };
}
