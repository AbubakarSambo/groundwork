import { TimeSheetsService } from './the-time-sheets.service';
import { SuitesService } from './suites.service';
import { AssistantService } from '../assistant/assistant.service';
import { WhatNeedsYouService } from '../grounds/what-needs-you.service';

/**
 * ONE ORGANISATION WITH TIME SHEETS SWITCHED ON, EVERYTHING AROUND IT MOCKED, so a spec can read what
 * each person is served word for word. Test-only; nothing in the product imports it.
 *
 * Baridi Appliances, Wednesday 7 October 2026 at 10:00 in Lagos, so this week is the week of Monday
 * 5 October. The clients and projects are Naivas, Lakeside and Internal, and "Their manager" approves.
 *   - Grace Achieng, admin, no team.
 *   - Wairimu Kamau, lead of Sales, manages Aisha and Brian.
 *   - Aisha Otieno and Brian Mwangi, members of Sales.
 *   - Kamau Njenga, member of Operations, with no manager.
 *   - Omar Said, member of Finance, looks after finance.
 *   - Tomas, a guest.
 * Aisha has 31 hours this week (Naivas 16, Lakeside 7, Internal 8). Last week, the week of 28
 * September, she gave 6 hours on Naivas and 2 on Internal, which Wairimu approved on 2 October; Brian
 * gave 5 hours on Lakeside, still waiting.
 */
export const ORG = 'org-baridi';
export const TODAY = new Date('2026-10-07T09:00:00Z');

export const roles: Record<string, string> = {
  'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-aisha': 'MEMBER', 'u-brian': 'MEMBER', 'u-kamau': 'MEMBER', 'u-omar': 'MEMBER', 'u-tomas': 'GUEST',
};
export const names: Record<string, [string, string]> = {
  'u-grace': ['Grace', 'Achieng'], 'u-wairimu': ['Wairimu', 'Kamau'], 'u-aisha': ['Aisha', 'Otieno'], 'u-brian': ['Brian', 'Mwangi'],
  'u-kamau': ['Kamau', 'Njenga'], 'u-omar': ['Omar', 'Said'], 'u-tomas': ['Tomas', 'Guest'],
};
const entry = (u: string, department: string | null, manager: string | null) => ({
  id: `pid-${u.slice(2)}`, externalId: `p-${u.slice(2)}`, linkedUserId: u, department, managerExternalId: manager, active: true, email: null,
  givenName: names[u][0], displayName: names[u].join(' '),
});
export const DIRECTORY = [
  entry('u-grace', null, null), entry('u-wairimu', 'Sales', null), entry('u-aisha', 'Sales', 'p-wairimu'), entry('u-brian', 'Sales', 'p-wairimu'),
  entry('u-kamau', 'Operations', null), entry('u-omar', 'Finance', null),
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

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const h = (userId: string, client: string, day: string, hours: number, billable?: boolean) =>
  ({ organizationId: ORG, userId, client, onDay: d(day), minutes: hours * 60, createdAt: d(day), ...(billable === undefined ? {} : { billable }) });

/** The record a week is drafted from (build step 11): each person's own sessions, kept commitments and owned items. */
export interface ARecordForSpecs {
  sessions?: { userId: string; label: string; startedAt?: Date | null; completedAt?: Date | null; isSetup?: boolean }[];
  commitments?: { personExternalId: string; text: string; state: string; resolvedAt: Date | null; subjectExternalId?: string | null }[];
  subjects?: { externalId: string; title: string; ownerExternalId: string | null; updatedAt: Date; sourceDeletedAt?: Date | null }[];
  workItems?: { ownerUserId: string; name: string; updatedAt: Date; label: string; kind?: string }[];
}

export function aTimeSheetsOrganisation(opts: { rules?: unknown; on?: boolean; workflows?: unknown; record?: ARecordForSpecs } = {}) {
  let n = 0;
  const suites: Record<string, any> = {
    time: { isOn: opts.on ?? true, answers: { clients: ['Naivas', 'Lakeside', 'Internal'], approver: 'Their manager' } },
    duties: { isOn: false, answers: { finance: 'u-omar' } },
  };
  if (opts.rules !== undefined) suites.timeRules = { isOn: false, answers: opts.rules };
  if (opts.workflows !== undefined) suites.workflows = { isOn: false, answers: opts.workflows };
  const entries: any[] = [
    h('u-aisha', 'Naivas', '2026-10-05', 8), h('u-aisha', 'Naivas', '2026-10-06', 8), h('u-aisha', 'Lakeside', '2026-10-07', 7), h('u-aisha', 'Internal', '2026-10-07', 8),
    h('u-aisha', 'Naivas', '2026-09-30', 6), h('u-aisha', 'Internal', '2026-10-01', 2),
    h('u-brian', 'Lakeside', '2026-09-29', 5),
  ];
  const weeks: any[] = [{ organizationId: ORG, userId: 'u-aisha', weekOf: d('2026-09-28'), approvedMinutes: 480, approvedById: 'u-wairimu', approvedAt: new Date('2026-10-02T10:00:00Z'), seenMinutes: 480, step: 0, escalatedTo: 0, approvedByIds: ['u-wairimu'] }];
  const events: any[] = [];
  const changes: any[] = [];
  const proposals: any[] = [];
  const prisma: any = {
    organizationSuite: {
      findUnique: jest.fn(async ({ where }: any) => (where.organizationId_suite.organizationId === ORG ? suites[where.organizationId_suite.suite] ?? null : null)),
      findMany: jest.fn(async () => Object.entries(suites).map(([suite, r]) => ({ suite, ...r }))),
      upsert: jest.fn(async ({ where, create, update }: any) => { const k = where.organizationId_suite.suite; suites[k] = suites[k] ? { ...suites[k], ...update } : create; return suites[k]; }),
    },
    suiteRuleChange: { create: jest.fn(async ({ data }: any) => { changes.push({ changedAt: TODAY, ...data }); return data; }), findMany: jest.fn(async () => [...changes].reverse()) },
    suiteEvent: {
      create: jest.fn(async ({ data }: any) => { events.push({ at: TODAY, ...data }); return data; }),
      findMany: jest.fn(async ({ where }: any) => events.filter((e) => matches(e, where))),
    },
    organizationMembership: {
      findUnique: jest.fn(async ({ where }: any) => {
        const { userId, organizationId } = where.userId_organizationId;
        return organizationId === ORG && roles[userId] ? { role: roles[userId] } : null;
      }),
      findMany: jest.fn(async ({ where }: any = {}) => Object.keys(roles).filter((u) => !(where?.role?.not && roles[u] === where.role.not)).map((userId) => ({ userId, user: { firstName: names[userId][0], lastName: names[userId][1] } }))),
    },
    person: {
      findMany: jest.fn(async ({ where }: any = {}) => DIRECTORY.filter((p) => matches(p, { linkedUserId: where?.linkedUserId, department: where?.department, active: where?.active }))),
      findFirst: jest.fn(async ({ where }: any) => DIRECTORY.find((p) => matches(p, { id: where.id, externalId: where.externalId, linkedUserId: where.linkedUserId })) ?? null),
    },
    user: {
      findMany: jest.fn(async ({ where }: any) => (where.id?.in ?? []).filter((id: string) => names[id]).map((id: string) => ({ id, firstName: names[id][0], lastName: names[id][1], email: null }))),
      findUnique: jest.fn(async ({ where }: any) => (names[where.id] ? { firstName: names[where.id][0], phoneNumber: null, deletedAt: null, awaitingOrgApproval: false } : null)),
    },
    timeEntry: {
      findMany: jest.fn(async ({ where }: any) => entries.filter((e) => matches(e, where))),
      createMany: jest.fn(async ({ data }: any) => { entries.push(...data.map((x: any) => ({ createdAt: TODAY, ...x }))); return { count: data.length }; }),
    },
    timeWeek: {
      findMany: jest.fn(async ({ where }: any) => weeks.filter((w) => matches(w, where))),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const k = where.organizationId_userId_weekOf;
        const w = weeks.find((x) => x.userId === k.userId && x.weekOf.getTime() === k.weekOf.getTime());
        if (w) return Object.assign(w, update);
        weeks.push(create);
        return create;
      }),
    },
    timeAgreement: { findMany: jest.fn(async () => []) },
    checkIn: {
      findMany: jest.fn(async ({ where }: any) => (opts.record?.sessions ?? [])
        .filter((x) => x.userId === where.participant?.userId && !x.isSetup && (matches(x, { startedAt: where.OR?.[0]?.startedAt }) && x.startedAt || matches(x, { completedAt: where.OR?.[1]?.completedAt }) && x.completedAt))
        .map((x) => ({ startedAt: x.startedAt ?? null, completedAt: x.completedAt ?? null, ground: { label: x.label } }))),
    },
    commitment: { findMany: jest.fn(async ({ where }: any) => (opts.record?.commitments ?? []).filter((c) => matches({ organizationId: ORG, ...c }, where))) },
    subject: { findMany: jest.fn(async ({ where }: any) => (opts.record?.subjects ?? []).filter((x) => matches({ organizationId: ORG, ...x }, where))) },
    groundParticipant: { findMany: jest.fn(async ({ where }: any) => [...new Set((opts.record?.workItems ?? []).map((w) => w.ownerUserId))].filter((u) => u === where.userId).map((u) => ({ id: `gp-${u}` }))) },
    workItem: {
      findMany: jest.fn(async ({ where }: any) => (opts.record?.workItems ?? [])
        .filter((w) => where.ownerParticipantId.in.includes(`gp-${w.ownerUserId}`) && matches(w, { updatedAt: where.updatedAt }))
        /* The query's own kind filter, as the database would apply it. */
        .filter((w) => !(where.kind?.notIn ?? []).includes(w.kind ?? 'task'))
        .map((w) => ({ name: w.name, updatedAt: w.updatedAt, kind: w.kind ?? 'task', ground: { label: w.label } }))),
    },
    assistantProposal: {
      findFirst: jest.fn(async ({ where }: any) => [...proposals].reverse().find((p) => p.state === 'PARKED' && p.personExternalId === where.personExternalId) ?? null),
      create: jest.fn(async ({ data }: any) => { const p = { id: `pr-${++n}`, state: 'PARKED', createdAt: new Date(), ...data }; proposals.push(p); return p; }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(proposals.find((p) => p.id === where.id) ?? {}, data)),
      updateMany: jest.fn(async () => ({})),
    },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })), findMany: jest.fn(async () => []) },
  };
  const svc = new TimeSheetsService(prisma);
  const suitesSvc = new SuitesService(prisma);
  const assistant = new AssistantService(
    prisma, { respond: jest.fn(async () => { throw new Error('model off'); }) } as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    undefined, undefined, undefined, svc, undefined,
  );
  const grounds: any = { list: jest.fn(async () => []), listAwaitingApproval: jest.fn(async () => []) };
  const today = new WhatNeedsYouService(prisma, grounds, undefined, svc);
  const as = (userId: string) => ({ userId, organizationId: ORG });
  /** What a person reads back from Ask Groundwork, as the text blocks joined. */
  const says = async (userId: string, message: string) => {
    const r: any = await assistant.respond(ORG, `pid-${userId.slice(2)}`, message);
    return r.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n');
  };
  /** What a person reads on Today about their own hours, if anything. */
  const onToday = async (userId: string, at = TODAY) => {
    jest.setSystemTime(at);
    const r = await today.forReader(userId, `${userId}@example.com`, ORG, roles[userId]);
    return r.needs.filter((x) => x.key === 'time-standing');
  };
  return { prisma, svc, suites: suitesSvc, assistant, today, as, says, onToday, entries, weeks, events, changes, proposals, suiteRows: suites };
}
