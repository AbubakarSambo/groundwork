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

/**
 * The set-up's first message, as the admin reads it (20 November 2026): the offer to work from a written policy, then the first
 * question, each its own paragraph. Written out here, never imported, so a change of wording fails the specs that read it.
 */
/* The offer to take the reporting lines in one message is part of every set-up's opening (the leave policy, 21 November 2026). */
export const theOpening = (suite: string, ask: string) =>
  `If you have a written policy for ${suite}, paste it here and I will set it up from it. Or add it to the Desk with the + button below, then tell me "set up ${suite}" again. You can also tell me who reports to whom in one message, for example “Amina and Brian report to Joseph”, or paste your whole list of reporting lines. Otherwise I will ask you, one question at a time, and nothing is set until you say yes.\n\n${ask}`;

/** The say-back as the admin reads it (20 November 2026): a paragraph to open, one "- " line for each rule, and the question on its own. */
export const theSaidBack = (opening: string, rules: string[]) =>
  `${opening}\n\n${rules.map((l) => `- ${l}`).join('\n')}\n\nShall I set it up like this? Nothing changes until you say yes.`;

/** `engine` is a pretend model, for the specs where the model reads the message; without it there is no model, as before. */
/**
 * `engine` is a pretend model, for the specs where the model reads the message; `extract` is the model's reading alone, for the specs
 * of a written policy read into the set-up. Without either there is no model, as before.
 */
export function anOrganisationToSetUp(opts: {
  suites?: Record<string, { isOn: boolean; answers: unknown }>;
  engine?: any;
  extract?: (prompt: string, history: { role: string; content: string }[], tool: any) => Promise<any>;
} = {}) {
  let n = 0;
  const suites: Record<string, any> = {
    duties: { isOn: false, answers: { departmentHeads: { Operations: 'u-fatuma' } }, changedById: 'u-grace' },
    ...(opts.suites ?? {}),
  };
  const changes: any[] = [];
  const proposals: any[] = [];
  const writes: string[] = [];
  /* The leave policy's offices, who works from each, and public holidays (the-leave-places.ts). */
  const offices: any[] = [];
  const holidays: any[] = [];
  const officeOf: Record<string, string | null> = {};
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
        .filter((u) => (where?.officeId?.not === null ? !!officeOf[u] : true))
        .map((userId) => ({ userId, officeId: officeOf[userId] ?? null, user: { firstName: names[userId][0], lastName: names[userId][1] } }))),
      updateMany: jest.fn(async ({ where, data }: any) => {
        for (const u of Object.keys(roles)) {
          if (where.userId?.in && !where.userId.in.includes(u)) continue;
          if (where.userId?.notIn && where.userId.notIn.includes(u)) continue;
          if (where.officeId?.in && !where.officeId.in.includes(officeOf[u])) continue;
          if (typeof where.officeId === 'string' && officeOf[u] !== where.officeId) continue;
          officeOf[u] = data.officeId;
        }
        writes.push('officeOf');
        return { count: 1 };
      }),
    },
    leaveOffice: {
      findMany: jest.fn(async () => [...offices]),
      findFirst: jest.fn(async ({ where }: any) => offices.find((o) => o.name.toLowerCase() === String(where.name.equals).toLowerCase()) ?? null),
      create: jest.fn(async ({ data }: any) => { const o = { id: `o-${offices.length + 1}`, ...data }; offices.push(o); writes.push('leaveOffice'); return o; }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(offices.find((o) => o.id === where.id), data)),
      deleteMany: jest.fn(async ({ where }: any) => { for (const id of where.id.in) offices.splice(offices.findIndex((o) => o.id === id), 1); return { count: 1 }; }),
    },
    publicHoliday: {
      findMany: jest.fn(async ({ where }: any = {}) => holidays.filter((h) => where?.confirmed === undefined || h.confirmed === where.confirmed)),
      deleteMany: jest.fn(async ({ where }: any) => {
        for (let i = holidays.length - 1; i >= 0; i--) {
          const h = holidays[i];
          const office = where.officeId?.in ? where.officeId.in.includes(h.officeId) : h.officeId === (where.officeId ?? null);
          if (office && (!where.on || (h.on >= where.on.gte && h.on <= where.on.lte))) holidays.splice(i, 1);
        }
        return { count: 1 };
      }),
      createMany: jest.fn(async ({ data }: any) => { for (const h of data) holidays.push({ id: `h-${holidays.length + 1}`, ...h }); writes.push('publicHoliday'); return { count: data.length }; }),
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
    prisma, opts.engine ?? ({ respond: jest.fn(async () => { throw new Error('model off'); }), ...(opts.extract ? { extract: jest.fn(opts.extract) } : {}) } as any), {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
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
  return { prisma, suites: suitesSvc, assistant, as, says, talk, changes, proposals, writes, rows: suites, offices, holidays, officeOf };
}
