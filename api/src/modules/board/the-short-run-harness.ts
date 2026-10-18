import { person, type Setup } from './the-switchboards-sections-harness';
import { PartyType } from '@prisma/client';
import * as RUN from './__fixtures__/drop-access-short-run.json';

/**
 * DROP ACCESS, THE SHORT RUN OF THREE DAYS (12 to 14 October, gw_sweep_drop3), AS THE RECORD HELD IT ON 18 OCTOBER 2026.
 *
 * Every line, document, deal, wait, aim, promise, check-in and typed turn of the run, read on Grace's board as it was opened on
 * Sunday 18 October at 8:09pm. Grace Achieng runs it; Kevin Omondi, Mercy Wairimu and Joseph Kariuki check in. Read by the specs
 * of Hafsah's quality pass of 18 October.
 */
export const SHORT_NOW = new Date('2026-10-18T17:09:00Z');
export const R: any = RUN;
const at = (s: any) => (s ? new Date(s) : null);
export const userOf = (pid: string) => R.participants.find((p: any) => p.id === pid);
export const SHORT_PEOPLE = R.participants.map((p: any) => person(p.id, p.userId, p.user.firstName, p.user.lastName, p.partyType as PartyType));
export const pidOf = (first: string) => R.participants.find((p: any) => p.user.firstName === first).id;
export const reader = (first: string) => [userOf(pidOf(first)).userId, 'MEMBER'] as const;
export const SHORT_LINES = R.lines.map((l: any) => ({ ...l, createdAt: at(l.createdAt), confirmedAt: at(l.confirmedAt), disputedAt: null }));
export const SHORT_WAITS = R.dependencies.map((d: any) => ({ ...d, createdAt: at(d.createdAt), updatedAt: at(d.updatedAt), clearedAt: at(d.clearedAt), escalatedAt: at(d.escalatedAt), dueOn: at(d.dueOn) }));
const waitsModel = (waits: any[]) => ({
  findMany: jest.fn(async (args: any) => structuredClone(waits
    .filter((d) => !args?.where?.status?.in || args.where.status.in.includes(d.status))
    .filter((d) => !args?.where?.sourceCheckInId?.in || args.where.sourceCheckInId.in.includes(d.sourceCheckInId)))),
  findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0),
});
const dated = (o: any) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) ? new Date(v) : v]));

export function theShortRun(more: Partial<Setup> = {}): Setup {
  return {
    people: SHORT_PEOPLE,
    initiatorId: R.ground.initiatorId,
    kindOfWork: 'sales team',
    releaseOneSalesBoard: true,
    label: R.ground.label,
    clock: { now: SHORT_NOW, createdAt: new Date('2026-10-12T07:00:00Z'), endsAt: new Date('2026-10-30T17:00:00Z'), timelineDays: 15, cadence: 'DAILY' },
    checkIns: R.checkIns.map((c: any) => ({ ...c, completedAt: at(c.completedAt) })),
    lines: SHORT_LINES,
    recordLines: SHORT_LINES,
    documents: R.documents.map(dated),
    items: R.items.map((i: any) => ({ ...i, createdAt: at(i.createdAt), updatedAt: at(i.updatedAt), dueAt: at(i.dueAt) })),
    dependencies: SHORT_WAITS,
    commitments: R.commitments.map(dated),
    objectives: R.objectives.map(dated),
    mentions: R.mentions.map(dated),
    turns: R.turns.map((t: any) => ({ checkInId: t.checkInId, content: t.content, role: t.role })),
    room: R.room,
    report: dated(R.report),
    prismaExtras: { groundDependency: waitsModel(SHORT_WAITS) },
    ...more,
  };
}
