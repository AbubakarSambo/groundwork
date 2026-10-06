import { SuitesService } from '../suites/suites.service';
import { AssistantService } from './assistant.service';

/**
 * ONE ORGANISATION WITH NO SUITE SET UP YET, for the specs of setting a suite up by talking (decision
 * 85). The real AssistantService and the real SuitesService run over an in-memory database, so a spec
 * reads what each person is told word for word and what is then stored. Test-only; nothing in the
 * product imports it.
 *
 * Baridi Appliances, Saturday 3 October 2026.
 *   - Grace Achieng, admin.
 *   - Fatuma Hassan, lead, heads Operations (the only job anybody holds so far).
 *   - Wairimu Kamau, lead of Sales. Kamau Njenga, member, Operations.
 *   - Omar Said, member, Finance. Miriam Wanjiku, member, Sales. Tomas, a guest.
 */
export const ORG = 'org-baridi';
export const TODAY = new Date('2026-10-03T09:00:00Z');

export const roles: Record<string, string> = {
  'u-grace': 'ADMIN', 'u-fatuma': 'LEAD', 'u-wairimu': 'LEAD', 'u-kamau': 'MEMBER', 'u-omar': 'MEMBER', 'u-miriam': 'MEMBER', 'u-tomas': 'GUEST',
};
const names: Record<string, [string, string]> = {
  'u-grace': ['Grace', 'Achieng'], 'u-fatuma': ['Fatuma', 'Hassan'], 'u-wairimu': ['Wairimu', 'Kamau'], 'u-kamau': ['Kamau', 'Njenga'],
  'u-omar': ['Omar', 'Said'], 'u-miriam': ['Miriam', 'Wanjiku'], 'u-tomas': ['Tomas', 'Guest'],
};
const entry = (u: string, department: string | null, manager: string | null) => ({
  id: `pid-${u.slice(2)}`, externalId: `p-${u.slice(2)}`, linkedUserId: u, department, managerExternalId: manager, active: true, email: null,
  givenName: names[u][0], displayName: names[u].join(' '),
});
const DIRECTORY = [
  entry('u-grace', null, null), entry('u-fatuma', 'Operations', 'p-grace'), entry('u-wairimu', 'Sales', 'p-grace'),
  entry('u-kamau', 'Operations', 'p-fatuma'), entry('u-omar', 'Finance', 'p-grace'), entry('u-miriam', 'Sales', 'p-wairimu'),
];

export function anOrganisationToSetUp(opts: { suites?: Record<string, { isOn: boolean; answers: unknown }> } = {}) {
  let n = 0;
  const suites: Record<string, any> = {
    duties: { isOn: false, answers: { departmentHeads: { Operations: 'u-fatuma' } }, changedById: 'u-grace' },
    ...(opts.suites ?? {}),
  };
  const changes: any[] = [];
  const proposals: any[] = [];
  const writes: string[] = [];
  const prisma: any = {
    organizationSuite: {
      findUnique: jest.fn(async ({ where }: any) => suites[where.organizationId_suite.suite] ?? null),
      findMany: jest.fn(async () => Object.entries(suites).map(([suite, r]) => ({ suite, ...r }))),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const k = where.organizationId_suite.suite;
        writes.push(k);
        suites[k] = suites[k] ? { ...suites[k], ...update } : create;
        return suites[k];
      }),
    },
    suiteRuleChange: {
      create: jest.fn(async ({ data }: any) => { changes.push({ changedAt: TODAY, ...data }); return data; }),
      findMany: jest.fn(async () => [...changes].reverse()),
    },
    organizationMembership: {
      findUnique: jest.fn(async ({ where }: any) => {
        const { userId, organizationId } = where.userId_organizationId;
        return organizationId === ORG && roles[userId] ? { role: roles[userId], createdAt: new Date('2025-01-06') } : null;
      }),
      findMany: jest.fn(async ({ where }: any = {}) => Object.keys(roles)
        .filter((u) => (typeof where?.role === 'string' ? roles[u] === where.role : !(where?.role?.not && roles[u] === where.role.not)))
        .map((userId) => ({ userId, user: { firstName: names[userId][0], lastName: names[userId][1] } }))),
    },
    person: {
      findMany: jest.fn(async () => DIRECTORY),
      findFirst: jest.fn(async ({ where }: any) => DIRECTORY.find((p) => (where.id === undefined || p.id === where.id) && (where.externalId === undefined || p.externalId === where.externalId) && (where.linkedUserId === undefined || p.linkedUserId === where.linkedUserId)) ?? null),
    },
    user: {
      findMany: jest.fn(async ({ where }: any) => (where.id?.in ?? []).filter((id: string) => names[id]).map((id: string) => ({ id, firstName: names[id][0], lastName: names[id][1] }))),
    },
    assistantProposal: {
      findFirst: jest.fn(async ({ where }: any) => [...proposals].reverse().find((p) => p.state === 'PARKED' && p.personExternalId === where.personExternalId) ?? null),
      create: jest.fn(async ({ data }: any) => { const p = { id: `pr-${++n}`, state: 'PARKED', createdAt: new Date(), ...data }; proposals.push(p); return p; }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(proposals.find((p) => p.id === where.id) ?? {}, data)),
    },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })), findMany: jest.fn(async () => []) },
  };
  const suitesSvc = new SuitesService(prisma);
  const assistant = new AssistantService(
    prisma, { respond: jest.fn(async () => { throw new Error('model off'); }) } as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    undefined, undefined, undefined, undefined, undefined, suitesSvc,
  );
  const as = (userId: string) => ({ userId, organizationId: ORG });
  /** What a person reads back from Ask Groundwork, as the text blocks joined. */
  const says = async (userId: string, message: string) => {
    const r: any = await assistant.respond(ORG, `pid-${userId.slice(2)}`, message);
    return r.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n');
  };
  /** A whole conversation, each reply in order. */
  const talk = async (userId: string, messages: string[]) => {
    const out: string[] = [];
    for (const m of messages) out.push(await says(userId, m));
    return out;
  };
  return { prisma, suites: suitesSvc, assistant, as, says, talk, changes, proposals, writes, rows: suites };
}
