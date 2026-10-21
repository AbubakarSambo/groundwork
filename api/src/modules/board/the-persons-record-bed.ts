import * as RUN from './__fixtures__/the-persons-record-night-run-2.json';

/**
 * THE SECOND NIGHT RUN, AS A DATABASE THE PEOPLE'S RECORDS ARE BUILT FROM (test data only).
 *
 * Drop Access (test) and Muchemi & Co (test): the rows of `gw_night_run2` a person's record is read from, as the database held them on
 * 20 October 2026 (`__fixtures__/the-persons-record-night-run-2.json`, read on 21 October, read only). One check-in at a time, served
 * by a stand-in for the database. No model is called. The only table written is `personRecord`, in memory, for the test.
 */
export const R2: any = (RUN as any).default ?? RUN;
export type AGroundOfTheRun = 'drop' | 'fees' | 'lit';

const DATE = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/;
export const dated = (v: any): any => {
  if (Array.isArray(v)) return v.map(dated);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'fields' || k === 'specificityDimensions' ? x : dated(x)]));
  return typeof v === 'string' && DATE.test(v) ? new Date(v) : v;
};
const same = (a: any, b: any) => (a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b);
export function matches(row: any, where: any): boolean {
  if (!where) return true;
  return Object.entries(where).every(([k, w]: [string, any]) => {
    if (k === 'AND') return (w as any[]).every((x) => matches(row, x));
    if (k === 'OR') return (w as any[]).some((x) => matches(row, x));
    if (k === 'NOT') return !matches(row, w);
    if (!(k in row)) return true;
    const v = row[k];
    if (w === null) return v === null || v === undefined;
    if (w instanceof Date || typeof w !== 'object') return same(v, w);
    if (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) return matches(v, w);
    if ('in' in w) return (w.in as any[]).includes(v);
    if ('notIn' in w) return !(w.notIn as any[]).includes(v);
    if ('not' in w) return w.not === null ? v !== null && v !== undefined : !same(v, w.not);
    if ('equals' in w) return same(v, w.equals);
    if ('gte' in w || 'lte' in w || 'gt' in w || 'lt' in w) {
      const n = v instanceof Date ? v.getTime() : v;
      const x = (y: any) => (y instanceof Date ? y.getTime() : y);
      return (w.gte === undefined || n >= x(w.gte)) && (w.lte === undefined || n <= x(w.lte)) && (w.gt === undefined || n > x(w.gt)) && (w.lt === undefined || n < x(w.lt));
    }
    return true;
  });
}
export const table = (rows: any[]) => ({
  findMany: jest.fn(async (args: any = {}) => structuredClone(rows.filter((r) => matches(r, args?.where)))),
  findFirst: jest.fn(async (args: any = {}) => structuredClone(rows.find((r) => matches(r, args?.where)) ?? null)),
  findUnique: jest.fn(async (args: any = {}) => structuredClone(rows.find((r) => matches(r, args?.where)) ?? null)),
  count: jest.fn(async (args: any = {}) => rows.filter((r) => matches(r, args?.where)).length),
});
export const nothing: any = new Proxy({}, { get: (_t, m: string) => jest.fn(async () => (m === 'findMany' ? [] : m === 'count' ? 0 : null)) });
export const withNothing = (t: any) => new Proxy(t, { get: (x, k: string) => (k in x ? x[k] : nothing) });

/** Where the people's records are kept, in memory, for one test. */
export function aPersonRecordTable(rows: any[] = []) {
  return {
    rows,
    findUnique: jest.fn(async ({ where }: any) => structuredClone(rows.find((r) => r.participantId === where.participantId) ?? null)),
    findMany: jest.fn(async ({ where }: any = {}) => structuredClone(rows.filter((r) => matches(r, where)))),
    upsert: jest.fn(async ({ where, create, update }: any) => {
      const at = rows.findIndex((r) => r.participantId === where.participantId);
      if (at === -1) { const row = { id: `pr-${rows.length + 1}`, ...structuredClone(create) }; rows.push(row); return row; }
      rows[at] = { ...rows[at], ...structuredClone(update) };
      return rows[at];
    }),
  };
}

/**
 * The rows as they stood at one moment, for the rebuild each evening: only what was written by then, a check-in not yet finished as
 * open, and a promise not yet settled as open. A deal's stage and details are as the run left them; its proof filed later is left out.
 */
export function asItStoodAt(R: any, at: Date): any {
  const by = (d: any) => !d || new Date(d).getTime() <= at.getTime();
  return {
    ...R,
    checkIns: R.checkIns.filter((c: any) => by(c.createdAt)).map((c: any) => (by(c.completedAt) ? c : { ...c, status: 'IN_PROGRESS', completedAt: null })),
    lines: R.lines.filter((l: any) => by(l.createdAt)),
    commitments: R.commitments.filter((c: any) => by(c.createdAt)).map((c: any) => (by(c.settledAt) ? c : { ...c, status: 'UNKNOWN', settledAt: null })),
    waits: R.waits.filter((w: any) => by(w.createdAt)).map((w: any) => (by(w.clearedAt) ? w : { ...w, status: 'WAITING', clearedAt: null })),
    turns: R.turns.filter((t: any) => by(t.createdAt)),
    items: R.items.filter((i: any) => by(i.createdAt)),
    evidence: R.evidence.filter((e: any) => by(e.createdAt)),
    documents: R.documents.filter((d: any) => by(d.createdAt)),
  };
}

/** One check-in of the run as a database, with the switches as given. */
export function theRunAsADatabase(g: AGroundOfTheRun, opts: { directMorning?: boolean; judgements?: boolean; personRecord?: ReturnType<typeof aPersonRecordTable>; others?: AGroundOfTheRun[]; asOf?: Date } = {}) {
  const R = opts.asOf ? asItStoodAt(dated(R2[g]), opts.asOf) : dated(R2[g]);
  const all = [g, ...(opts.others ?? [])].map((x) => ({ key: x, R: x === g ? R : dated(R2[x]) }));
  const ground = (x: any) => ({ ...x.ground, organization: { timeZone: (R2.org as any[]).find((o) => o.id === x.ground.organizationId)?.timeZone ?? 'Africa/Nairobi', name: (R2.org as any[]).find((o) => o.id === x.ground.organizationId)?.name }, initiator: (() => { const p = x.participants.find((y: any) => y.userId === x.ground.initiatorId); return p ? { firstName: p.user?.firstName ?? null, lastName: p.user?.lastName ?? null, email: p.email } : null; })(), participants: x.participants });
  const org = { ...(R2.org as any[]).find((o) => o.id === R.ground.organizationId), directMorningOn: opts.directMorning ?? false, personJudgementsOn: opts.judgements ?? true, release1bTabsOn: true, release1SalesBoardOn: true };
  return withNothing({
    organization: { findUnique: jest.fn(async () => structuredClone(org)), findMany: jest.fn(async () => [structuredClone(org)]) },
    ground: {
      findUnique: jest.fn(async ({ where }: any = {}) => structuredClone(ground(all.find((x) => x.R.ground.id === (where?.id ?? R.ground.id))?.R ?? R))),
      findFirst: jest.fn(async ({ where }: any = {}) => structuredClone(ground(all.find((x) => x.R.ground.id === (where?.id ?? R.ground.id))?.R ?? R))),
      findMany: jest.fn(async ({ where }: any = {}) => all.map((x) => x.R).filter((x) => matches(x.ground, where)).map((x) => structuredClone({ ...x.ground, label: x.ground.label }))),
    },
    groundParticipant: table(R.participants),
    /* A check-in carries its turns, as a read that selects them gets them. */
    checkIn: table(R.checkIns.map((c: any) => ({ ...c, turns: R.turns.filter((x: any) => x.checkInId === c.id) }))),
    recordEntry: table(R.lines),
    groundCommitment: table(R.commitments),
    groundDependency: table(R.waits),
    /* A turn is read by its check-in's person, as `where: { checkIn: { participantId } }` reads it. */
    conversationTurn: (() => {
      const whose = new Map((R.checkIns as any[]).map((c) => [c.id, c.participantId]));
      const t = table(R.turns.map((x: any) => ({ ...x, checkIn: { participantId: whose.get(x.checkInId) ?? null, groundId: R.ground.id } })));
      return t;
    })(),
    workItem: table(R.items),
    itemEvidence: table(R.evidence),
    groundDocument: table(R.documents),
    groundObjective: table(R.objectives),
    groundContextItem: table(R.contextItems),
    personRecord: opts.personRecord ?? aPersonRecordTable(),
  });
}

/** A person of the run, by first name, in one check-in. */
export function thePersonOf(g: AGroundOfTheRun, firstName: string): { participantId: string; userId: string } {
  const p = (R2[g].participants as any[]).find((x) => x.user?.firstName === firstName);
  if (!p) throw new Error(`${firstName} is not in ${g}`);
  return { participantId: p.id, userId: p.userId };
}
export const theLeadOfTheRun = (g: AGroundOfTheRun) => R2[g].ground.initiatorId as string;

/** The end of the run: Tuesday 20 October, in the morning, before anybody had checked in that day. */
export const THE_END_OF_THE_RUN = new Date('2026-10-20T08:00:00Z');

/**
 * The people's records as the run would have kept them: rebuilt each evening a check-in finished, from the rows written by then, and
 * once more at the end of the run. Returns the table they are kept in.
 */
export async function theRunRebuiltEachEvening(g: AGroundOfTheRun, rebuild: (prisma: any, groundId: string, at: Date) => Promise<number>, table = aPersonRecordTable()) {
  const days = [...new Set((R2[g].checkIns as any[]).filter((c) => c.completedAt).map((c) => String(c.completedAt).slice(0, 10)))].sort();
  for (const d of days) {
    const at = new Date(`${d}T17:00:00Z`);
    if (at.getTime() > THE_END_OF_THE_RUN.getTime()) continue;
    await rebuild(theRunAsADatabase(g, { asOf: at, personRecord: table }), R2[g].ground.id, at);
  }
  await rebuild(theRunAsADatabase(g, { personRecord: table }), R2[g].ground.id, THE_END_OF_THE_RUN);
  return table;
}
