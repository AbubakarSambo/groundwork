import { LeaveBoardService } from './the-leave-board.service';
import { SuitesService } from './suites.service';
import { sayBackLeave, sendLeave } from './leave-said-in-chat';
import { LEAVE_RULES_ROW } from './the-leave-rules';
import { WORKFLOWS_ROW } from './the-approval-steps';

/**
 * ONE ORGANISATION WITH LEAVE SWITCHED ON, for the specs of leave by length and of the same approver
 * twice (decision 85). The real LeaveBoardService, SuitesService and the say-back run over an
 * in-memory database. Test-only; nothing in the product imports it.
 *
 * Baridi Appliances, Monday 5 October 2026. Each person has 21 days a year; the manager approves.
 *   - Grace Achieng, admin.
 *   - Joseph Mwangi, lead, heads Sales. Wairimu Kamau, lead in Sales, manages Aisha and Miriam, and
 *     Joseph manages her.
 *   - Kamau Njenga, lead, heads Operations. Aisha Otieno and Miriam Wanjiku, members in Sales.
 *   - Joy Mutua, member in Operations, looks after HR.
 */
export const ORG = 'org-baridi';
export const TODAY = new Date('2026-10-05T09:00:00Z');
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

export const roles: Record<string, string> = {
  'u-grace': 'ADMIN', 'u-joseph': 'LEAD', 'u-wairimu': 'LEAD', 'u-kamau': 'LEAD', 'u-aisha': 'MEMBER', 'u-miriam': 'MEMBER', 'u-joy': 'MEMBER',
};
const names: Record<string, [string, string]> = {
  'u-grace': ['Grace', 'Achieng'], 'u-joseph': ['Joseph', 'Mwangi'], 'u-wairimu': ['Wairimu', 'Kamau'], 'u-kamau': ['Kamau', 'Njenga'],
  'u-aisha': ['Aisha', 'Otieno'], 'u-miriam': ['Miriam', 'Wanjiku'], 'u-joy': ['Joy', 'Mutua'],
};
const person = (u: string, department: string, manager: string | null) => ({
  linkedUserId: u, externalId: `p-${u.slice(2)}`, department, managerExternalId: manager, active: true, email: null,
  givenName: names[u][0], displayName: names[u].join(' '), createdAt: d('2025-01-06'),
});
const directory = [
  person('u-grace', 'Finance', null), person('u-joseph', 'Sales', null), person('u-wairimu', 'Sales', 'p-joseph'),
  person('u-kamau', 'Operations', null), person('u-aisha', 'Sales', 'p-wairimu'), person('u-miriam', 'Sales', 'p-wairimu'),
  person('u-joy', 'Operations', 'p-kamau'),
];

function matches(row: any, where: any): boolean {
  return Object.entries(where ?? {}).every(([k, v]: [string, any]) => {
    if (v === undefined) return true;
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      if ('in' in v) return v.in.includes(row[k]);
      if ('not' in v) return row[k] !== v.not;
      return (v.lte === undefined || row[k] <= v.lte) && (v.gte === undefined || row[k] >= v.gte) && (v.lt === undefined || row[k] < v.lt);
    }
    return row[k] === v;
  });
}

export function aLeaveOrganisation(opts: { rules?: unknown; workflows?: unknown; duties?: unknown } = {}) {
  const suites: Record<string, any> = {
    leave: { isOn: true, answers: { days: 21, approver: 'Their manager' } },
    duties: { isOn: false, answers: opts.duties ?? { hr: 'u-joy', departmentHeads: { Sales: 'u-joseph', Operations: 'u-kamau' } } },
  };
  if (opts.rules !== undefined) suites[LEAVE_RULES_ROW] = { isOn: false, answers: opts.rules };
  if (opts.workflows !== undefined) suites[WORKFLOWS_ROW] = { isOn: false, answers: opts.workflows };
  const rows: any[] = [];
  const events: any[] = [];
  const changes: any[] = [];
  let n = 0;
  const prisma: any = {
    organizationSuite: {
      findUnique: jest.fn(async ({ where }: any) => suites[where.organizationId_suite.suite] ?? null),
      findMany: jest.fn(async () => Object.entries(suites).map(([suite, r]) => ({ suite, ...r }))),
      upsert: jest.fn(async ({ where, create, update }: any) => { const k = where.organizationId_suite.suite; suites[k] = suites[k] ? { ...suites[k], ...update } : create; return suites[k]; }),
    },
    suiteRuleChange: { create: jest.fn(async ({ data }: any) => { changes.push({ changedAt: TODAY, ...data }); return data; }), findMany: jest.fn(async () => [...changes].reverse()) },
    organizationMembership: {
      findUnique: jest.fn(async ({ where }: any) => {
        const u = where.userId_organizationId.userId;
        return roles[u] ? { role: roles[u], createdAt: d('2025-01-06') } : null;
      }),
      findMany: jest.fn(async ({ where }: any = {}) => Object.keys(roles)
        .filter((u) => (typeof where?.role === 'string' ? roles[u] === where.role : !(where?.role?.not && roles[u] === where.role.not)))
        .map((userId) => ({ userId, user: { firstName: names[userId][0], lastName: names[userId][1] } }))),
    },
    person: {
      findFirst: jest.fn(async ({ where }: any) => directory.find((p) => matches(p, { linkedUserId: where.linkedUserId, externalId: where.externalId })) ?? null),
      findMany: jest.fn(async ({ where }: any = {}) => directory.filter((p) => matches(p, { linkedUserId: where?.linkedUserId, department: where?.department }))),
    },
    user: {
      findMany: jest.fn(async ({ where }: any) => (where.id?.in ?? []).filter((id: string) => names[id]).map((id: string) => ({ id, firstName: names[id][0], lastName: names[id][1], email: null }))),
      findUnique: jest.fn(async ({ where }: any) => (names[where.id] ? { firstName: names[where.id][0] } : null)),
    },
    leaveRequest: {
      findMany: jest.fn(async ({ where }: any) => rows.filter((r) => matches(r, where))),
      findUnique: jest.fn(async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null),
      update: jest.fn(async ({ where, data }: any) => Object.assign(rows.find((r) => r.id === where.id), data)),
      create: jest.fn(async ({ data }: any) => { const r = { id: `r-${++n}`, status: 'waiting', kind: 'annual', standInUserId: null, decidedById: null, decidedAt: null, askedAt: TODAY, ...data }; rows.push(r); return { id: r.id }; }),
    },
    suiteEvent: {
      create: jest.fn(async ({ data }: any) => { events.push({ at: TODAY, ...data }); return data; }),
      findMany: jest.fn(async ({ where }: any) => events.filter((e) => e.ref === where.ref)),
    },
  };
  const leave = new LeaveBoardService(prisma);
  const suitesSvc = new SuitesService(prisma);
  const as = (userId: string) => ({ userId, organizationId: ORG });
  /** The say-back the person reads before they say yes. */
  const ask = async (userId: string, startsOn: string, endsOn: string) => (await sayBackLeave(prisma, leave, as(userId), { startsOn, endsOn }, TODAY)) as { ok: boolean; say: string };
  /** The say-back, then the yes: the request as kept, and what the person is told. */
  const send = async (userId: string, startsOn: string, endsOn: string) => {
    await ask(userId, startsOn, endsOn);
    const told = await sendLeave(leave, prisma, as(userId), { startsOn, endsOn });
    return { row: rows[rows.length - 1], told };
  };
  /** Where a waiting request stands on a reader's board, in their words, or null when it is not served to them. */
  const onTheBoard = async (userId: string, id: string) => {
    const board = await leave.board(as(userId), TODAY);
    const w = board.waiting.find((x) => x.id === id);
    return w ? { where: w.where, mayDecide: w.mayDecide } : null;
  };
  return { prisma, leave, suites: suitesSvc, as, ask, send, onTheBoard, rows, events, changes };
}
