import * as RUN from '../board/__fixtures__/drop-access-short-run.json';

/**
 * DROP ACCESS, THE SHORT RUN (12 to 14 October, gw_sweep_drop3), AS A DATABASE THE REPORTS CAN READ (Hafsah's quality pass of
 * 18 October, sections 4 to 7).
 *
 * Every row of the run exactly as the record held it on 18 October (`__fixtures__/drop-access-short-run.json`), served by a
 * stand-in for the database that answers each read the reports make: the ground and its people, the check-ins, the lines, the
 * deals, the waits, the documents, the typed turns and the open questions. Release 1's switch is on, the organisation's day is
 * Nairobi's. No model is called and nothing is written.
 */
export const R: any = RUN;
export const G: string = R.dependencies[0].groundId;
const at = (s: any) => (s ? new Date(s) : null);
const dated = (o: any) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) ? new Date(v) : v]));

export const pidOf = (first: string): string => R.participants.find((p: any) => p.user.firstName === first).id;
export const uidOf = (first: string): string => R.participants.find((p: any) => p.user.firstName === first).userId;

/** A row matches a `where` on the keys it holds: a value, `{ in: [...] }`, `{ not: x }`, `{ gte, lte }`. Keys the row does not hold are not read. */
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

export const SHORT_PARTICIPANTS = R.participants.map((p: any, i: number) => ({ ...p, groundId: G, managingOnly: false, nameGiven: null, createdAt: new Date(Date.UTC(2026, 9, 12, 7, i)), email: null, organisationGiven: null, roleAsDescribed: null, user: { ...p.user, email: null } }));
const CHECK_INS = R.checkIns.map((c: any) => ({ ...c, groundId: G, isSetup: !!c.isSetup, completedAt: at(c.completedAt), availableFrom: at(c.availableFrom), createdAt: at(c.createdAt) }));
const LINES = R.lines.map((l: any) => ({ ...l, createdAt: at(l.createdAt), confirmedAt: at(l.confirmedAt), disputedAt: null }));
const ITEMS = R.items.map((i: any) => ({ ...i, groundId: G, createdAt: at(i.createdAt), updatedAt: at(i.updatedAt), dueAt: at(i.dueAt) }));
const WAITS = R.dependencies.map((d: any) => ({ ...d, createdAt: at(d.createdAt), updatedAt: at(d.updatedAt), clearedAt: at(d.clearedAt), escalatedAt: at(d.escalatedAt), dueOn: at(d.dueOn) }));
/* With the people each wait is from and on, as a read that joins them gets them. */
const withPeople = (w: any) => {
  const p = (id: string | null) => (id ? (() => { const x = R.participants.find((y: any) => y.id === id); return x ? { ...x, managingOnly: false, leftAt: null, nameGiven: null, user: { ...x.user, awaitingOrgApproval: false } } : null; })() : null);
  return { ...w, fromParticipant: p(w.fromParticipantId), onParticipant: p(w.onParticipantId) };
};
const DOCS = R.documents.map(dated);
const TURNS = R.turns.map((t: any, i: number) => ({ ...t, id: `t${i}`, createdAt: at(t.createdAt), checkIn: { participantId: CHECK_INS.find((c: any) => c.id === t.checkInId)?.participantId } }));
const GAPS = R.gaps.map(dated);

export function theShortRunsDatabase(opts: { switchOn?: boolean } = {}) {
  const switchOn = opts.switchOn ?? true;
  const ground = {
    id: G, label: R.ground.label, organizationId: R.ground.organizationId, initiatorId: R.ground.initiatorId, createdByUserId: R.ground.initiatorId,
    kindOfWork: R.ground.kindOfWork, workStages: null, scenario: R.ground.scenario, participants: SHORT_PARTICIPANTS,
    cadence: 'DAILY', whoSeesTargets: 'THEIR_OWN', peersVisibleToEachOther: true, status: 'ACTIVE', objectives: R.objectives.map(dated), personObjectives: [],
  };
  /* The weekly report the run keeps: built when a check-in comes in, read as kept. */
  let week: any = null;
  return {
    organization: { findUnique: jest.fn(async ({ select }: any = {}) => (select?.release1SalesBoardOn ? { release1SalesBoardOn: switchOn } : { timeZone: 'Africa/Nairobi', release1SalesBoardOn: switchOn })) },
    ground: { findUnique: jest.fn(async () => structuredClone(ground)), findFirst: jest.fn(async () => structuredClone(ground)) },
    groundParticipant: table(SHORT_PARTICIPANTS),
    checkIn: table(CHECK_INS),
    workItem: table(ITEMS),
    recordEntry: table(LINES),
    groundDependency: table(WAITS.map(withPeople)),
    groundDocument: table(DOCS),
    conversationTurn: table(TURNS),
    checkInGap: table(GAPS),
    groundContextItem: table([]),
    groundObjective: table(R.objectives.map(dated)),
    groundObjectiveSnapshot: table([]),
    groundCommitment: table([]),
    patternDetection: table([]),
    personObjective: table([]),
    weeklyReport: {
      upsert: jest.fn(async ({ create, update }: any) => { week = { ...(week ?? create), ...(update ?? {}), weekStart: create.weekStart, builtAt: new Date() }; return week; }),
      findFirst: jest.fn(async () => week),
      findUnique: jest.fn(async () => week),
    },
    user: table([]),
    person: table([]),
  };
}
