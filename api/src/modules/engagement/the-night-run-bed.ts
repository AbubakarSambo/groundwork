import * as RUN from './__fixtures__/night-run-2.json';

/**
 * THE SECOND NIGHT RUN, AS A DATABASE THE MORNING CAN READ (test data only).
 *
 * Drop Access (test) and Muchemi & Co (test), every row of the record as `gw_night_run2` held it on 20 October 2026, and each lead's
 * board as she was served it on Tuesday 20 October in the morning (`__fixtures__/night-run-2.json`). One check-in at a time, served by a
 * stand-in for the database that answers each read the morning makes. No model is called and nothing is written.
 */
export const N: any = (RUN as any).default ?? RUN;
export type AGroundOfTheRun = 'drop' | 'fees' | 'lit';

const DATE = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/;
const dated = (v: any): any => {
  if (Array.isArray(v)) return v.map(dated);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'fields' ? x : dated(x)]));
  return typeof v === 'string' && DATE.test(v) ? new Date(v) : v;
};

function matches(row: any, where: any): boolean {
  if (!where) return true;
  return Object.entries(where).every(([k, w]: [string, any]) => {
    if (k === 'AND') return (w as any[]).every((x) => matches(row, x));
    if (k === 'OR') return (w as any[]).some((x) => matches(row, x));
    if (k === 'NOT') return !matches(row, w);
    if (!(k in row)) return true;
    const v = row[k];
    if (w === null) return v === null || v === undefined;
    if (w instanceof Date) return v instanceof Date && v.getTime() === w.getTime();
    if (typeof w !== 'object') return v === w;
    if ('in' in w) return (w.in as any[]).includes(v);
    if ('notIn' in w) return !(w.notIn as any[]).includes(v);
    if ('not' in w) return w.not === null ? v !== null && v !== undefined : v !== w.not;
    if ('gte' in w || 'lte' in w || 'gt' in w || 'lt' in w) {
      const n = v instanceof Date ? v.getTime() : v;
      const x = (y: any) => (y instanceof Date ? y.getTime() : y);
      return (w.gte === undefined || n >= x(w.gte)) && (w.lte === undefined || n <= x(w.lte)) && (w.gt === undefined || n > x(w.gt)) && (w.lt === undefined || n < x(w.lt));
    }
    return true;
  });
}
const table = (rows: any[]) => ({
  findMany: jest.fn(async (args: any = {}) => structuredClone(rows.filter((r) => matches(r, args?.where)))),
  findFirst: jest.fn(async (args: any = {}) => structuredClone(rows.find((r) => matches(r, args?.where)) ?? null)),
  findUnique: jest.fn(async (args: any = {}) => structuredClone(rows.find((r) => matches(r, args?.where)) ?? null)),
  count: jest.fn(async (args: any = {}) => rows.filter((r) => matches(r, args?.where)).length),
});

/** The lead's board as she was served it on Tuesday 20 October in the morning. */
export const theLeadsBoard = (g: AGroundOfTheRun): any => structuredClone(N.boards[g].board);

/** One check-in of the run as a database. `directMorning` is the organisation's switch; every other switch is as the run had it. */
export function theNightRunsDatabase(g: AGroundOfTheRun, opts: { directMorning?: boolean; judgements?: boolean } = {}) {
  const R = dated(N[g]);
  const ground = { ...R.ground, participants: R.participants };
  const org = { ...(N.org as any[]).find((o) => o.id === R.ground.organizationId), directMorningOn: opts.directMorning ?? false, personJudgementsOn: opts.judgements ?? true };
  const people = (id: string | null) => R.participants.find((p: any) => p.id === id) ?? null;
  const waits = R.waits.map((w: any) => ({ ...w, fromParticipant: people(w.fromParticipantId), onParticipant: people(w.onParticipantId) }));
  return {
    organization: { findUnique: jest.fn(async () => structuredClone(org)), findMany: jest.fn(async () => [structuredClone(org)]) },
    ground: { findUnique: jest.fn(async () => structuredClone(ground)), findFirst: jest.fn(async () => structuredClone(ground)), findMany: jest.fn(async () => [structuredClone(ground)]) },
    groundParticipant: table(R.participants),
    checkIn: table(R.checkIns),
    recordEntry: table(R.lines),
    groundDependency: table(waits),
    workItem: table(R.items),
    itemEvidence: table(R.evidence),
    groundDocument: table(R.documents),
    conversationTurn: table(R.turns),
    groundObjective: table(R.objectives),
    personObjective: table(R.personObjectives),
    groundContextItem: table(R.contextItems),
    user: { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => null) },
    $queryRaw: jest.fn(async () => []),
  } as any;
}

/** The lead of a check-in of the run: her user id, and her first name. */
export const theLeadOf = (g: AGroundOfTheRun): { userId: string; firstName: string } => {
  const R = N[g];
  const p = R.participants.find((x: any) => x.userId === R.ground.initiatorId);
  return { userId: R.ground.initiatorId, firstName: p?.user?.firstName ?? '' };
};
