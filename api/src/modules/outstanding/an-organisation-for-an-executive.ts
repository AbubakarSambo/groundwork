/**
 * A SMALL IN-MEMORY ORGANISATION FOR THE TESTS OF THE OUTSTANDING REGISTER, THE DELEGATE AND THE TWO JOBS.
 *
 * Fatima (66, senior executive) runs the check-ins. Amina is her executive assistant. Tunde runs his own
 * check-in, which Fatima does not run and so may not read. Every table the assistant touches that this does
 * not describe answers with nothing, so the assistant runs for real over it, with no model.
 */
import { AssistantService } from '../assistant/assistant.service';

export const ORG = 'org-1';

type Row = Record<string, any>;

function matches(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([k, v]) => {
    if (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v) && !('in' in v) && !('notIn' in v) && !('not' in v) && !('gte' in v) && !('lte' in v) && k.includes('_')) return matches(row, v as Row);
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      if ('in' in v) return (v as any).in.includes(row[k]);
      if ('notIn' in v) return !(v as any).notIn.includes(row[k]);
      if ('not' in v) return row[k] !== (v as any).not;
      if ('equals' in v) return String(row[k] ?? '').toLowerCase() === String((v as any).equals ?? '').toLowerCase();
      if ('startsWith' in v) return String(row[k] ?? '').startsWith((v as any).startsWith);
      return true;
    }
    return (row[k] ?? null) === (v ?? null);
  });
}

export function aTable(rows: Row[], idPrefix = 'r', defaults: Row = {}) {
  let n = 0;
  return {
    rows,
    findMany: async (a: any = {}) => rows.filter((r) => matches(r, a.where)).slice(0, a.take ?? 1e9),
    findFirst: async (a: any = {}) => rows.find((r) => matches(r, a.where)) ?? null,
    findUnique: async (a: any = {}) => rows.find((r) => matches(r, a.where)) ?? null,
    create: async ({ data }: any) => {
      const row = { id: `${idPrefix}-${++n}`, createdAt: new Date(), updatedAt: new Date(), ...defaults, ...data };
      rows.push(row);
      return row;
    },
    update: async ({ where, data }: any) => Object.assign(rows.find((r) => matches(r, where)) ?? {}, data),
    upsert: async ({ where, create, update }: any) => {
      const found = rows.find((r) => matches(r, where));
      if (found) return Object.assign(found, update);
      const row = { id: `${idPrefix}-${++n}`, createdAt: new Date(), updatedAt: new Date(), notTheSameAs: [], decisionOptions: [], ...create };
      rows.push(row);
      return row;
    },
    updateMany: async ({ where, data }: any) => { const hits = rows.filter((r) => matches(r, where)); hits.forEach((r) => Object.assign(r, data)); return { count: hits.length }; },
    deleteMany: async ({ where }: any = {}) => { const keep = rows.filter((r) => !matches(r, where)); const n = rows.length - keep.length; rows.splice(0, rows.length, ...keep); return { count: n }; },
    count: async (a: any = {}) => rows.filter((r) => matches(r, a.where)).length,
  };
}

export const USERS: Record<string, [string, string, string]> = {
  'u-fatima': ['Fatima', 'Bello', 'fatima@example.com'],
  'u-amina': ['Amina', 'Yusuf', 'amina@example.com'],
  'u-tunde': ['Tunde', 'Okafor', 'tunde@example.com'],
  'u-grace': ['Grace', 'Njeri', 'grace@example.com'],
  'u-ibrahim': ['Ibrahim', 'Sule', 'ibrahim@example.com'],
};

const ROLES: Record<string, string> = { 'u-fatima': 'LEAD', 'u-amina': 'MEMBER', 'u-tunde': 'LEAD', 'u-grace': 'ADMIN', 'u-ibrahim': 'MEMBER' };

const DAY = 86_400_000;

export function anOrganisationForAnExecutive(now: Date = new Date('2026-11-10T09:00:00Z')) {
  const people: Row[] = Object.entries(USERS).map(([u, [first, last, email]]) => ({
    id: `pid-${u.slice(2)}`, organizationId: ORG, externalId: `p-${u.slice(2)}`, linkedUserId: u, active: true, email,
    givenName: first, familyName: last, displayName: `${first} ${last}`, userName: `${first}.${last}`.toLowerCase(),
  }));
  const grounds = [
    { id: 'g-ministry', organizationId: ORG, initiatorId: 'u-fatima', label: 'Ministry engagement' },
    { id: 'g-assembly', organizationId: ORG, initiatorId: 'u-fatima', label: 'National Assembly reporting' },
    { id: 'g-tunde', organizationId: ORG, initiatorId: 'u-tunde', label: 'Tunde private matter' },
  ];
  const participants = [
    { id: 'gp-amina', groundId: 'g-ministry', userId: 'u-amina', email: 'amina@example.com' },
    { id: 'gp-ibrahim', groundId: 'g-assembly', userId: 'u-ibrahim', email: 'ibrahim@example.com' },
    { id: 'gp-tunde-1', groundId: 'g-tunde', userId: 'u-ibrahim', email: 'ibrahim@example.com' },
  ];
  const t = (daysAgo: number) => new Date(now.getTime() - daysAgo * DAY);
  const tables = {
    ground: aTable(grounds, 'g'),
    groundParticipant: aTable(participants, 'gp'),
    groundCommitment: aTable([
      { id: 'c-brief-1', groundId: 'g-ministry', participantId: 'gp-amina', text: 'Send the ministry the revised brief', action: 'Amina Yusuf sends the ministry the revised brief by Friday.', whenSaid: 'by Friday', status: 'UNKNOWN', source: 'PASTE', settledBy: null, settledAt: null, createdAt: t(20), updatedAt: t(20) },
      { id: 'c-brief-2', groundId: 'g-ministry', participantId: 'gp-amina', text: 'Revised brief to the ministry', action: 'Revised brief to the ministry.', whenSaid: null, status: 'DONE', source: 'CHECK_IN', settledBy: 'PROVEN', settledAt: t(5), createdAt: t(12), updatedAt: t(5) },
      { id: 'c-minutes', groundId: 'g-assembly', participantId: 'gp-ibrahim', text: 'Circulate the committee minutes', action: 'Ibrahim Sule circulates the committee minutes.', whenSaid: 'by Friday', status: 'UNKNOWN', source: 'CHECK_IN', settledBy: null, settledAt: null, createdAt: t(3), updatedAt: t(3) },
      { id: 'c-done-said', groundId: 'g-assembly', participantId: 'gp-ibrahim', text: 'File the quarterly assembly summary', action: 'Ibrahim Sule files the quarterly assembly summary.', whenSaid: null, status: 'DONE', source: 'CHECK_IN', settledBy: 'SAID', settledAt: t(2), createdAt: t(9), updatedAt: t(2) },
      { id: 'c-nobody', groundId: 'g-assembly', participantId: null, text: 'Chase the audit letter', action: 'Chase the audit letter.', whenSaid: null, status: 'UNKNOWN', source: 'PASTE', settledBy: null, settledAt: null, createdAt: t(30), updatedAt: t(30) },
      { id: 'c-tunde-secret', groundId: 'g-tunde', participantId: 'gp-tunde-1', text: 'Finish the confidential severance letter', action: 'Finish the confidential severance letter.', whenSaid: null, status: 'UNKNOWN', source: 'CHECK_IN', settledBy: null, settledAt: null, createdAt: t(4), updatedAt: t(4) },
    ], 'c'),
    groundDependency: aTable([
      { id: 'd-ministry', groundId: 'g-ministry', fromParticipantId: 'gp-amina', onParticipantId: null, onLabel: 'the ministry', what: 'the ministry’s reply on the budget', status: 'WAITING', createdAt: t(8), updatedAt: t(8) },
    ], 'd'),
    obligation: aTable([]),
    todo: aTable([{ id: 't-private', organizationId: ORG, personExternalId: 'p-fatima', text: 'Think about my own retirement date', dueSaid: null, dueAt: null, state: 'OPEN', createdAt: t(6), doneAt: null }], 't'),
    registerNote: aTable([], 'rn'),
    delegate: aTable([], 'dg', { revokedAt: null, delegateUserId: null }),
    delegateAction: aTable([], 'da'),
    persistentJob: aTable([], 'pj'),
    person: aTable(people, 'pid'),
    user: aTable(Object.entries(USERS).map(([id, [firstName, lastName, email]]) => ({ id, firstName, lastName, email })), 'u'),
    organizationMembership: {
      findUnique: async ({ where }: any) => (ROLES[where.userId_organizationId.userId] ? { role: ROLES[where.userId_organizationId.userId] } : null),
      findMany: async () => Object.keys(ROLES).map((userId) => ({ userId, role: ROLES[userId] })),
    },
    assistantProposal: aTable([], 'pr', { state: 'PARKED' }),
  };
  /* A table this does not describe answers with nothing, so the assistant can run for real. */
  const prisma: any = new Proxy(tables as any, {
    get(target, name: string) {
      if (name in target) return target[name];
      if (name === 'then') return undefined;
      return new Proxy({}, { get: (_t, method: string) => async () => (method === 'findMany' ? [] : method === 'count' ? 0 : method.startsWith('find') ? null : {}) });
    },
  });
  /* The proposal table the assistant reads wants the newest PARKED row for a person. */
  tables.assistantProposal.findFirst = async ({ where }: any) => [...tables.assistantProposal.rows].reverse().find((p) => p.state === 'PARKED' && p.personExternalId === where.personExternalId) ?? null;

  const assistant = new AssistantService(
    prisma, { respond: async () => { throw new Error('the model is off in this test'); } } as any, {} as any, {} as any, { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any, { pendingFor: async () => [] } as any, {} as any, {} as any, {} as any, {} as any, {} as any,
  );
  const says = async (userId: string, message: string): Promise<string> => {
    const r: any = await assistant.respond(ORG, `pid-${userId.slice(2)}`, message);
    return r.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n');
  };
  return { prisma, tables, assistant, says, now };
}
