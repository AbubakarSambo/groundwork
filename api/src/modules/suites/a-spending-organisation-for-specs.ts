import { SpendingService } from './the-spending.service';
import { SuitesService } from './suites.service';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';
import { AssistantService } from '../assistant/assistant.service';

/**
 * ONE ORGANISATION WITH SPENDING SWITCHED ON, EVERYTHING AROUND IT MOCKED, so a spec can read what
 * each person is served word for word. Test-only; nothing in the product imports it.
 *
 * Baridi Appliances, Monday 5 October 2026. The suite is on with KES, "the most a manager may approve on
 * their own" of 20,000, and Grace for anything above it.
 *   - Grace Achieng, admin, the chief executive. Manages Fatuma and Wairimu.
 *   - Fatuma Hassan, lead of Operations, manages Kamau and Joseph.
 *   - Wairimu Kamau, lead of Sales, manages Miriam.
 *   - Kamau Njenga, member, Operations. Joseph Otieno, member, Operations, holds the Operations budget.
 *   - Omar Said, member, Finance, looks after finance.
 *   - Miriam Wanjiku, member, Sales.
 * Budgets for October: Operations 250,000 (212,000 already approved), Sales 400,000.
 */
export const ORG = 'org-baridi';
export const TODAY = new Date('2026-10-05T09:00:00Z');
export const OCT = new Date('2026-10-01T00:00:00Z');

export const roles: Record<string, string> = {
  'u-grace': 'ADMIN', 'u-fatuma': 'LEAD', 'u-wairimu': 'LEAD', 'u-kamau': 'MEMBER', 'u-joseph': 'MEMBER', 'u-omar': 'MEMBER', 'u-miriam': 'MEMBER', 'u-tomas': 'GUEST',
};
export const names: Record<string, [string, string]> = {
  'u-grace': ['Grace', 'Achieng'], 'u-fatuma': ['Fatuma', 'Hassan'], 'u-wairimu': ['Wairimu', 'Kamau'], 'u-kamau': ['Kamau', 'Njenga'],
  'u-joseph': ['Joseph', 'Otieno'], 'u-omar': ['Omar', 'Said'], 'u-miriam': ['Miriam', 'Wanjiku'], 'u-tomas': ['Tomas', 'Guest'],
};
const entry = (u: string, department: string | null, manager: string | null) => ({
  id: `pid-${u.slice(2)}`, externalId: `p-${u.slice(2)}`, linkedUserId: u, department, managerExternalId: manager, active: true, email: null,
  givenName: names[u][0], displayName: names[u].join(' '), phone: `+2547100${Object.keys(names).indexOf(u)}`,
});
export const DIRECTORY = [
  entry('u-grace', null, null), entry('u-fatuma', 'Operations', 'p-grace'), entry('u-wairimu', 'Sales', 'p-grace'),
  entry('u-kamau', 'Operations', 'p-fatuma'), entry('u-joseph', 'Operations', 'p-fatuma'), entry('u-omar', 'Finance', 'p-grace'), entry('u-miriam', 'Sales', 'p-wairimu'),
];

function matches(row: any, where: any): boolean {
  return Object.entries(where ?? {}).every(([k, v]: [string, any]) => {
    if (v === undefined) return true;
    if (k === 'OR') return v.some((x: any) => matches(row, x));
    if (k === 'AND') return v.every((x: any) => matches(row, x));
    if (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
      if ('in' in v) return v.in.includes(row[k]);
      if ('not' in v) return row[k] !== v.not;
      if ('equals' in v) return row[k] === v.equals;
      return (v.gte === undefined || row[k] >= v.gte) && (v.lt === undefined || row[k] < v.lt) && (v.lte === undefined || row[k] <= v.lte);
    }
    if (v === null) return row[k] == null;
    return row[k] instanceof Date && v instanceof Date ? row[k].getTime() === v.getTime() : row[k] === v;
  });
}

export function aSpendingOrganisation(opts: { rules?: unknown; duties?: unknown; workflows?: unknown; on?: boolean } = {}) {
  let n = 0;
  const suites: Record<string, any> = {
    spend: { isOn: opts.on ?? true, answers: { currency: 'KES', limit: 20000, above: 'u-grace' } },
    duties: { isOn: false, answers: opts.duties ?? { finance: 'u-omar', chiefExecutive: 'u-grace', budgetOwners: { Operations: 'u-joseph' } } },
  };
  if (opts.rules !== undefined) suites.spendRules = { isOn: false, answers: opts.rules };
  if (opts.workflows !== undefined) suites.workflows = { isOn: false, answers: opts.workflows };
  const requests: any[] = [];
  const req = (userId: string, amount: number, what: string, team: string | null, status = 'waiting', createdAt = new Date('2026-10-02T08:00:00Z'), more: any = {}) => {
    const r = { id: `s-${++n}`, organizationId: ORG, userId, amount, what, team, status, createdAt, decidedById: null, decidedAt: null, step: 0, escalatedTo: 0, stepSince: null, approvedByIds: [], category: null, evidenceNeeded: [], ...more };
    requests.push(r);
    return r;
  };
  req('u-fatuma', 212000, 'freezer parts', 'Operations', 'approved', new Date('2026-10-01T08:00:00Z'), { decidedById: 'u-grace', decidedAt: new Date('2026-10-01T10:00:00Z'), approvedByIds: ['u-grace'] });
  const budgets = [
    { organizationId: ORG, team: 'Operations', month: OCT, amount: 250000 },
    { organizationId: ORG, team: 'Sales', month: OCT, amount: 400000 },
  ];
  const events: any[] = [];
  const changes: any[] = [];
  const proposals: any[] = [];
  const questions: any[] = [];
  const created: any[] = [];
  const prisma: any = {
    organizationSuite: {
      findUnique: jest.fn(async ({ where }: any) => suites[where.organizationId_suite.suite] ?? null),
      findMany: jest.fn(async () => Object.entries(suites).map(([suite, r]) => ({ suite, ...r }))),
      upsert: jest.fn(async ({ where, create, update }: any) => { const k = where.organizationId_suite.suite; suites[k] = suites[k] ? { ...suites[k], ...update } : create; return suites[k]; }),
    },
    suiteRuleChange: { create: jest.fn(async ({ data }: any) => { changes.push({ changedAt: TODAY, ...data }); return data; }), findMany: jest.fn(async () => [...changes].reverse()) },
    organizationMembership: {
      findUnique: jest.fn(async ({ where }: any) => {
        const { userId, organizationId } = where.userId_organizationId;
        return organizationId === ORG && roles[userId] ? { role: roles[userId], createdAt: new Date('2025-01-06') } : null;
      }),
      findMany: jest.fn(async ({ where }: any = {}) => Object.keys(roles).filter((u) => !(where?.role?.not && roles[u] === where.role.not)).map((userId) => ({ userId, user: { firstName: names[userId][0], lastName: names[userId][1] } }))),
    },
    person: {
      findMany: jest.fn(async ({ where }: any = {}) => DIRECTORY.filter((p) => matches(p, { linkedUserId: where?.linkedUserId, department: where?.department }))),
      findFirst: jest.fn(async ({ where }: any) => DIRECTORY.find((p) => matches(p, { id: where.id, externalId: where.externalId, linkedUserId: where.linkedUserId })) ?? null),
    },
    user: {
      findMany: jest.fn(async ({ where }: any) => (where.id?.in ?? []).filter((id: string) => names[id]).map((id: string) => ({ id, firstName: names[id][0], lastName: names[id][1], email: null }))),
      findUnique: jest.fn(async ({ where }: any) => (names[where.id] ? { firstName: names[where.id][0], phoneNumber: null, deletedAt: null, awaitingOrgApproval: false } : null)),
    },
    spendRequest: {
      findMany: jest.fn(async ({ where, orderBy, take }: any) => {
        let out = requests.filter((r) => matches(r, where));
        if (orderBy?.createdAt === 'desc') out = [...out].sort((a, b) => b.createdAt - a.createdAt);
        return take ? out.slice(0, take) : out;
      }),
      findUnique: jest.fn(async ({ where }: any) => requests.find((r) => r.id === where.id) ?? null),
      update: jest.fn(async ({ where, data }: any) => Object.assign(requests.find((r) => r.id === where.id)!, data)),
      create: jest.fn(async ({ data }: any) => { created.push(data); const r = req(data.userId, data.amount, data.what, data.team, 'waiting', TODAY, { category: data.category ?? null, evidenceNeeded: data.evidenceNeeded ?? [] }); return { id: r.id }; }),
    },
    teamBudget: {
      findMany: jest.fn(async ({ where }: any) => budgets.filter((b) => !where?.month || b.month.getTime() === where.month.getTime())),
      findUnique: jest.fn(async ({ where }: any) => {
        const k = where.organizationId_team_month;
        return budgets.find((b) => b.team === k.team && b.month.getTime() === k.month.getTime()) ?? null;
      }),
    },
    suiteEvent: {
      create: jest.fn(async ({ data }: any) => { events.push({ at: TODAY, ...data }); return data; }),
      findMany: jest.fn(async ({ where }: any) => events.filter((e) => matches(e, where))),
    },
    suiteQuestion: {
      create: jest.fn(async ({ data }: any) => { const q = { id: `q-${++n}`, answer: null, answeredAt: null, askedAt: TODAY, ...data }; questions.push(q); return { id: q.id }; }),
      findMany: jest.fn(async ({ where }: any) => questions.filter((q) => matches(q, where))),
      update: jest.fn(async ({ where, data }: any) => Object.assign(questions.find((q) => q.id === where.id), { ...data, answeredAt: new Date('2026-10-06T08:00:00Z') })),
    },
    assistantProposal: {
      findFirst: jest.fn(async ({ where }: any) => [...proposals].reverse().find((p) => p.state === 'PARKED' && p.personExternalId === where.personExternalId) ?? null),
      create: jest.fn(async ({ data }: any) => { const p = { id: `pr-${++n}`, state: 'PARKED', createdAt: new Date(), ...data }; proposals.push(p); return p; }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(proposals.find((p) => p.id === where.id) ?? {}, data)),
      updateMany: jest.fn(async ({ where, data }: any) => {
        for (const p of proposals) if (p.kind === where.kind && p.state === where.state && (!where.payload || p.payload?.requestId === where.payload.equals)) Object.assign(p, data);
        return {};
      }),
    },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })), findMany: jest.fn(async () => []) },
  };
  const sent: { to: string; text: string; context?: any }[] = [];
  const whatsapp: any = { sendFor: jest.fn(async (_o: string, to: string, text: string, context?: any) => { sent.push({ to, text, context }); return { sent: true }; }) };
  const told = new ARequestToldOnWhatsApp(prisma, whatsapp);
  const svc = new SpendingService(prisma, told);
  const suitesSvc = new SuitesService(prisma);
  const assistant = new AssistantService(
    prisma, { respond: jest.fn(async () => { throw new Error('model off'); }) } as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    undefined, undefined, undefined, undefined, svc,
  );
  const as = (userId: string) => ({ userId, organizationId: ORG });
  /** What a person reads back from Ask Groundwork, as the text blocks joined. */
  const says = async (userId: string, message: string) => {
    const r: any = await assistant.respond(ORG, `pid-${userId.slice(2)}`, message);
    return r.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n');
  };
  return { prisma, svc, suites: suitesSvc, assistant, as, says, requests, req, events, changes, proposals, questions, created, sent, budgets, suiteRows: suites };
}

export const phoneOf = (u: string) => DIRECTORY.find((p) => p.linkedUserId === u)!.phone;
