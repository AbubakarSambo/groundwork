import { LeaveBoardService } from '../the-leave-board.service';
import { SpendingService } from '../the-spending.service';
import { ApprovalsQueueService } from '../the-approvals-queue.service';

/**
 * BAOBAB DISTRIBUTION: A HUNDRED PEOPLE, READ FROM MEMORY, for the specs of the suites at scale. It has the
 * shape of api/journey/seed-a-hundred-people-for-the-suites.ts (nine teams of eleven and a chief
 * executive, finance and HR named, leave and spending on with approval steps) and a hundred and fifty
 * requests in every state, in a small in-memory database that counts every call made to it.
 *
 * "Today" is Wednesday 7 October 2026. This week:
 *   - Sales' manager (Wairimu Sow) is on approved leave Tuesday to Friday, and the head of Sales stands in.
 *   - Operations' manager is away Monday to Friday, and Customer Support's manager stands in.
 *   - Customer Support's manager is away Wednesday and Thursday with nobody standing in.
 *   - Procurement's manager is away Tuesday to Thursday, and a plain member of Procurement stands in.
 * Test-only; nothing in the product imports it.
 */

export const ORG = 'org-baobab';
export const TODAY = new Date('2026-10-07T09:00:00Z');
export const TEAMS = [
  { key: 'sales', name: 'Sales' }, { key: 'ops', name: 'Operations' }, { key: 'finance', name: 'Finance' }, { key: 'hr', name: 'HR' },
  { key: 'support', name: 'Customer Support' }, { key: 'eng', name: 'Engineering' }, { key: 'marketing', name: 'Marketing' },
  { key: 'logistics', name: 'Logistics' }, { key: 'procurement', name: 'Procurement' },
] as const;

const FIRST = ['Amina', 'Daniel', 'Grace', 'Peter', 'Sara', 'Joseph', 'Wairimu', 'Omar', 'Aisha', 'Brian', 'Fatuma', 'Kamau', 'Neema', 'Tobi', 'Zainab', 'Imani',
  'Kofi', 'Zuri', 'Thabo', 'Nia', 'Jabari', 'Asha', 'Femi', 'Ayana', 'Sekou', 'Nadia', 'Obi', 'Lerato', 'Idris', 'Chiamaka', 'Tendai', 'Hawa', 'Musa', 'Amara',
  'Sade', 'Bakari', 'Rania', 'Gugu', 'Yusuf', 'Dalia', 'Kito', 'Nalu', 'Baraka', 'Lucy', 'Juma', 'Mercy', 'Linet', 'Salma', 'Rukia', 'Njeri'];
const LAST = ['Mbeki', 'Asante', 'Okafor', 'Dube', 'Hassan', 'Mwangi', 'Diallo', 'Nkosi', 'Bello', 'Juma', 'Osei', 'Keita', 'Abara', 'Zuma', 'Toure', 'Sanusi',
  'Adeyemi', 'Moyo', 'Camara', 'Danjuma', 'Eze', 'Njoroge', 'Balogun', 'Mutua', 'Farah', 'Ndlovu', 'Sow', 'Kone', 'Achieng', 'Were', 'Otieno', 'Kamau',
  'Wekesa', 'Kerubo', 'Lindqvist', 'Okoro', 'Yusuf', 'Park', 'Mwende', 'Barasa'];

export interface APerson { key: string; first: string; last: string; role: 'ADMIN' | 'LEAD' | 'MEMBER'; team: string | null; manager: string | null }
export function thePeople(): APerson[] {
  const out: APerson[] = [];
  const name = (i: number) => ({ first: FIRST[i % FIRST.length], last: LAST[(i * 7 + 3) % LAST.length] });
  out.push({ key: 'ceo', ...name(0), role: 'ADMIN', team: null, manager: null });
  TEAMS.forEach((t, d) => {
    const base = 1 + d * 11;
    out.push({ key: `${t.key}.head`, ...name(base), role: t.key === 'ops' ? 'ADMIN' : 'LEAD', team: t.name, manager: 'ceo' });
    out.push({ key: `${t.key}.manager`, ...name(base + 1), role: 'LEAD', team: t.name, manager: `${t.key}.head` });
    for (let m = 1; m <= 9; m++) out.push({ key: `${t.key}.m${m}`, ...name(base + 1 + m), role: 'MEMBER', team: t.name, manager: `${t.key}.manager` });
  });
  return out;
}

export const idOf = (key: string) => `u-${key}`;
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
export const at = (s: string) => new Date(`${s}T08:00:00.000Z`);

/** A small matcher for the `where` the queue and the boards use. */
function matches(row: any, where: any): boolean {
  return Object.entries(where ?? {}).every(([k, v]: [string, any]) => {
    if (v === undefined) return true;
    if (k === 'AND') return (v as any[]).every((w) => matches(row, w));
    if (k === 'OR') return (v as any[]).some((w) => matches(row, w));
    if (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
      if ('in' in v && !v.in.includes(row[k])) return false;
      if ('not' in v && row[k] === v.not) return false;
      if ('lte' in v && !(row[k] <= v.lte)) return false;
      if ('gte' in v && !(row[k] >= v.gte)) return false;
      if ('lt' in v && !(row[k] < v.lt)) return false;
      if ('equals' in v && row[k] !== v.equals) return false;
      return true;
    }
    return row[k] === v;
  });
}

export interface Options {
  /** How many of the nine teams carry requests: all nine is the hundred-and-fifty-request organisation; fewer, a small one. */
  teams?: number;
  /** Extra settings laid over the approval steps. */
  workflows?: unknown;
}

export function aHundredPeople(opts: Options = {}) {
  const people = thePeople();
  const roles = new Map(people.map((p) => [idOf(p.key), p.role]));
  const users = people.map((p) => ({ id: idOf(p.key), email: `${p.key}@baobab.test`, firstName: p.first, lastName: p.last, deletedAt: null as Date | null, organizationId: ORG }));
  const directory = people.map((p) => ({
    organizationId: ORG, externalId: p.key, linkedUserId: idOf(p.key), email: `${p.key}@baobab.test`, givenName: p.first, familyName: p.last, displayName: `${p.first} ${p.last}`,
    department: p.team, managerExternalId: p.manager, active: true, phone: null as string | null, createdAt: d('2025-01-06'),
  }));
  const memberships = people.map((p) => ({ organizationId: ORG, userId: idOf(p.key), role: p.role }));

  const duties = {
    finance: idOf('finance.m1'), hr: idOf('hr.m1'), chiefExecutive: idOf('ceo'),
    departmentHeads: Object.fromEntries(TEAMS.map((t) => [t.name, idOf(`${t.key}.head`)])),
    budgetOwners: Object.fromEntries(TEAMS.map((t) => [t.name, idOf(`${t.key}.manager`)])),
  };
  const suites: Record<string, { organizationId: string; suite: string; isOn: boolean; answers: any }> = {};
  const set = (suite: string, isOn: boolean, answers: unknown) => { suites[suite] = { organizationId: ORG, suite, isOn, answers }; };
  set('leave', true, { days: 21, approver: 'Their manager' });
  set('spend', true, { currency: 'KES', limit: 50_000, above: idOf('finance.m1') });
  set('duties', false, duties);
  set('workflows', false, opts.workflows ?? {
    leave: { steps: [['manager', 'departmentHead', 'admin']], escalateAfter: 2 },
    spend: { steps: [['manager', 'admin'], ['finance', 'admin']], stepsAbove: [['manager', 'admin'], ['departmentHead', 'admin'], ['finance', 'admin']], escalateAfter: 2 },
  });
  set('spendRules', false, { categories: ['Fuel', 'Travel', 'Equipment'].map((name) => ({ name })) });

  let seq = 0;
  const leave: any[] = [];
  const spend: any[] = [];
  const events: any[] = [];
  const l = (k: string, from: string, to: string, extra: Record<string, unknown> = {}) => {
    const row = {
      id: `l-${++seq}`, organizationId: ORG, userId: idOf(k), startsOn: d(from), endsOn: d(to), kind: 'annual', standInUserId: null, status: 'waiting', decidedById: null, decidedAt: null,
      askedAt: at('2026-10-06'), step: 0, escalatedTo: 0, stepSince: null as Date | null, approvedByIds: [] as string[], declineReason: null, ...extra,
    };
    leave.push(row);
    return row;
  };
  const approved = (k: string, from: string, to: string, by: string, standIn?: string) =>
    l(k, from, to, { status: 'approved', decidedById: idOf(by), decidedAt: at('2026-09-20'), approvedByIds: [idOf(by)], askedAt: at('2026-09-18'), ...(standIn ? { standInUserId: idOf(standIn) } : {}) });

  /* Who is away this week, and who stands in. */
  approved('sales.manager', '2026-10-06', '2026-10-09', 'sales.head', 'sales.head');
  approved('ops.manager', '2026-10-05', '2026-10-09', 'ops.head', 'support.manager');
  approved('support.manager', '2026-10-07', '2026-10-08', 'support.head');
  approved('procurement.manager', '2026-10-06', '2026-10-08', 'procurement.head', 'procurement.m1');
  /* Four in Operations are off the same three days next week, and two more are asking for them. */
  for (const [m, [a, b]] of [[1, ['2026-10-14', '2026-10-16']], [2, ['2026-10-14', '2026-10-15']], [3, ['2026-10-15', '2026-10-16']], [4, ['2026-10-14', '2026-10-14']]] as [number, [string, string]][]) approved(`ops.m${m}`, a, b, 'ops.manager');
  for (const m of [5, 6]) l(`ops.m${m}`, '2026-10-14', '2026-10-16', { askedAt: at('2026-10-06') });

  let n = 0;
  const s = (team: (typeof TEAMS)[number], member: number, amount: number, createdAt: string, extra: Record<string, unknown> = {}) => {
    n += 1;
    const row = {
      id: `s-${++seq}`, organizationId: ORG, userId: idOf(`${team.key}.m${member}`), amount, what: ['Fuel for the Karen route', 'Two tablets for the field team', 'Travel to the Westlands shops'][n % 3],
      team: team.name, status: 'waiting', decidedById: null, decidedAt: null, createdAt: at(createdAt), step: 0, escalatedTo: 0, stepSince: null as Date | null, approvedByIds: [] as string[],
      category: ['Fuel', 'Travel', 'Equipment'][n % 3], evidenceNeeded: [], declineReason: null, verifiedById: null, verifiedAt: null, code: null, paidOn: null, paidById: null, evidenceGiven: [], ...extra,
    };
    spend.push(row);
    return row;
  };

  TEAMS.slice(0, opts.teams ?? TEAMS.length).forEach((t, i) => {
    const mgr = idOf(`${t.key}.manager`);
    const head = idOf(`${t.key}.head`);
    /* Leave: two fresh, one that has waited far past the two working days, one approved last month, one declined. */
    l(`${t.key}.m1`, '2026-10-21', '2026-10-23', { askedAt: at('2026-10-06') });
    l(`${t.key}.m2`, '2026-10-26', '2026-10-26', { askedAt: at('2026-10-07') });
    l(`${t.key}.m3`, '2026-11-02', '2026-11-06', { askedAt: at('2026-09-28') });
    approved(`${t.key}.m7`, '2026-09-01', '2026-09-03', `${t.key}.manager`);
    l(`${t.key}.m9`, '2026-10-12', '2026-10-14', { status: 'declined', decidedById: mgr, decidedAt: at('2026-10-02'), declineReason: 'Two people are already away that week.', askedAt: at('2026-10-01') });
    /* Spending: two fresh at the manager, one that has waited past the deadline, two with finance, one above the limit with the head, one above it with finance. */
    s(t, 1, 8_500 + i * 500, '2026-10-06');
    s(t, 3, 42_000, '2026-10-07');
    s(t, 4, 12_500, '2026-09-28');
    s(t, 5, 26_000, '2026-10-02', { step: 1, approvedByIds: [mgr], stepSince: at('2026-10-05') });
    s(t, 6, 9_800, '2026-09-30', { step: 1, approvedByIds: [mgr], stepSince: at('2026-10-01') });
    s(t, 7, 120_000, '2026-10-05', { step: 1, approvedByIds: [mgr], stepSince: at('2026-10-05') });
    s(t, 8, 240_000, '2026-10-01', { step: 2, approvedByIds: [mgr, head], stepSince: at('2026-10-06') });
    /* Approved and paid, and one declined. */
    s(t, 9, 15_000, '2026-10-01', { status: 'approved', decidedById: idOf('finance.m1'), decidedAt: at('2026-10-03'), approvedByIds: [mgr, idOf('finance.m1')] });
    s(t, 2, 31_000, '2026-09-10', { status: 'approved', decidedById: idOf('finance.m1'), decidedAt: at('2026-09-12'), approvedByIds: [mgr, idOf('finance.m1')], paidOn: d('2026-09-20') });
    if (i < 6) s(t, 4, 64_000, '2026-09-20', { status: 'declined', decidedById: mgr, decidedAt: at('2026-09-22'), declineReason: 'The budget is committed.' });
  });

  /* Every call made to the database, by table and method. */
  const calls: string[] = [];
  const table = (name: string, rows: any[], more: Record<string, (...a: any[]) => any> = {}) => {
    const t: Record<string, (...a: any[]) => any> = {
      findMany: async ({ where, orderBy }: any = {}) => {
        let out = rows.filter((r) => matches(r, where));
        if (orderBy && typeof orderBy === 'object' && !Array.isArray(orderBy)) {
          const [[k, dir]] = Object.entries(orderBy) as [string, string][];
          out = [...out].sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (dir === 'desc' ? -1 : 1));
        }
        return out.map((r) => ({ ...r }));
      },
      findFirst: async ({ where }: any = {}) => rows.find((r) => matches(r, where)) ?? null,
      findUnique: async ({ where }: any) => {
        const w = where.userId_organizationId ? { userId: where.userId_organizationId.userId, organizationId: where.userId_organizationId.organizationId }
          : where.organizationId_suite ? { organizationId: where.organizationId_suite.organizationId, suite: where.organizationId_suite.suite } : where;
        const r = rows.find((x) => matches(x, w));
        return r ? { ...r } : null;
      },
      update: async ({ where, data }: any) => Object.assign(rows.find((r) => r.id === where.id), data),
      updateMany: async ({ where, data }: any) => { const hit = rows.filter((r) => matches(r, where)); hit.forEach((r) => Object.assign(r, data)); return { count: hit.length }; },
      create: async ({ data }: any) => { const r = { id: `${name}-${++seq}`, at: new Date(), ...data }; rows.push(r); return r; },
      count: async ({ where }: any = {}) => rows.filter((r) => matches(r, where)).length,
      ...more,
    };
    return new Proxy(t, { get: (target, prop: string) => (typeof target[prop] === 'function' ? (...a: any[]) => { calls.push(`${name}.${prop}`); return target[prop](...a); } : target[prop]) });
  };
  const suiteRows = Object.values(suites);
  const prisma: any = {
    user: table('user', users),
    organizationMembership: table('organizationMembership', memberships),
    person: table('person', directory),
    organizationSuite: table('organizationSuite', suiteRows),
    leaveRequest: table('leaveRequest', leave),
    spendRequest: table('spendRequest', spend),
    suiteEvent: table('suiteEvent', events),
    suiteQuestion: table('suiteQuestion', []),
    teamBudget: table('teamBudget', []),
    assistantProposal: table('assistantProposal', []),
  };

  const queue = new ApprovalsQueueService(prisma);
  const told: { to: string[]; request: any }[] = [];
  const decided: { request: any; outcome: string; by: string }[] = [];
  const whatsapp: any = {
    approversOf: async (_o: string, who: any) => (who.kind === 'admin' ? [idOf('ceo'), idOf('ops.head')] : [who.userId]),
    firstNameOf: async (id: string) => users.find((u) => u.id === id)?.firstName ?? '',
    waiting: async (_o: string, to: string[], request: any) => { told.push({ to, request }); },
    decided: async (_o: string, request: any, outcome: string, by: string) => { decided.push({ request, outcome, by }); return true; }, asked: async () => true, answered: async () => true,
  };
  const leaveBoard = new LeaveBoardService(prisma, whatsapp);
  const spending = new SpendingService(prisma, whatsapp);
  const as = (key: string) => ({ userId: idOf(key), organizationId: ORG });
  const queryCount = () => calls.length;
  return { prisma, queue, leaveBoard, spending, as, leave, spend, events, people, calls, queryCount, told, suites, roles, directory, decided };
}
