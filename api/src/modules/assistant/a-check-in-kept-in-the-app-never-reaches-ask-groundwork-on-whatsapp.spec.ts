import { AssistantService } from './assistant.service';
import { WhatIsTrueService } from './what-is-true.service';
import { route } from './the-router-is-deterministic';

/**
 * DECISION 82, ITEM 7: ASK GROUNDWORK ON WHATSAPP NEVER ANSWERS FROM A CHECK-IN KEPT IN THE APP.
 *
 * Baridi has two check-ins led by Wairimu. "Sales team, Q3" goes over WhatsApp as usual. "Performance
 * plan, Femi" is kept in the app (`overWhatsApp = false`), and in it Femi said: "I missed the Westgate
 * visit because my mother was in hospital." Its report asks "Can Femi get the Westgate visits back on
 * track?", and Femi committed in it to "visit Westgate every Tuesday".
 *
 * The assistant is the real one; the database is pretend but honours every where clause it is given,
 * so a check-in left out by the read is truly never selected. Each question is asked twice: on
 * WhatsApp, where nothing from the performance plan may reach the reply or the assembled prompt, and
 * in the app, where Ask Groundwork is unchanged and does read it (which proves the test feeds it).
 */

const ORG = 'org-baridi';
const PIP_WORDS = 'I missed the Westgate visit because my mother was in hospital.';
const PIP_QUESTION = 'Can Femi get the Westgate visits back on track?';
const PIP_PROMISE = 'visit Westgate every Tuesday';
const SALES_WORDS = 'We closed two shops in Kilimani.';

const PEOPLE: Record<string, any> = {
  'pe-wairimu': { id: 'pe-wairimu', externalId: 'x-wairimu', email: 'wairimu@baridi.test', linkedUserId: 'u-wairimu', displayName: 'Wairimu Kamau', role: 'LEAD' },
  'pe-femi': { id: 'pe-femi', externalId: 'x-femi', email: 'femi@baridi.test', linkedUserId: 'u-femi', displayName: 'Femi Ade', role: 'MEMBER' },
};
const GROUNDS = [
  { id: 'g-sales', organizationId: ORG, label: 'Sales team, Q3', scenario: 'REALIGN_TEAM', status: 'ACTIVE', overWhatsApp: null, initiatorId: 'u-wairimu', createdByUserId: 'u-wairimu', createdAt: new Date(2), participants: [{ userId: 'u-wairimu' }, { userId: 'u-femi' }] },
  { id: 'g-pip', organizationId: ORG, label: 'Performance plan, Femi', scenario: 'PIP', status: 'ACTIVE', overWhatsApp: false, initiatorId: 'u-wairimu', createdByUserId: 'u-wairimu', createdAt: new Date(1), participants: [{ userId: 'u-femi' }] },
];
const REPORTS: Record<string, any> = {
  'g-sales': { releasedAt: new Date('2026-09-25'), centralQuestion: 'Where do the Kilimani shops stand?', agreements: [], divergences: [] },
  'g-pip': { releasedAt: new Date('2026-09-28'), centralQuestion: PIP_QUESTION, agreements: [], divergences: [] },
};
const SAID: Record<string, string> = { 'g-sales': SALES_WORDS, 'g-pip': PIP_WORDS };

/** Ids a where clause on a check-in allows: `id: { notIn }` or `id: { in }`, inside AND or not. */
function groundIdAllowed(id: string, w: any): boolean {
  if (!w) return true;
  if (w.id?.notIn && w.id.notIn.includes(id)) return false;
  if (w.id?.in && !w.id.in.includes(id)) return false;
  for (const a of w.AND ?? []) if (!groundIdAllowed(id, a.ground ?? a)) return false;
  return true;
}

function aBaridi() {
  const reportsRead: string[] = [];
  const prompts: string[] = [];
  const prisma: any = {
    person: {
      findFirst: jest.fn(async ({ where }: any) => (where.id ? PEOPLE[where.id] : Object.values(PEOPLE).find((p) => p.externalId === where.externalId)) ?? null),
      findMany: jest.fn(async () => []),
    },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => ({ role: Object.values(PEOPLE).find((p) => p.linkedUserId === where.userId_organizationId.userId)?.role ?? null })) },
    ground: {
      findMany: jest.fn(async ({ where }: any) => GROUNDS.filter((g) => g.organizationId === where.organizationId
        && (where.overWhatsApp === undefined || g.overWhatsApp === where.overWhatsApp)
        && (where.status === undefined || g.status === where.status)
        && (where.initiatorId === undefined || g.initiatorId === where.initiatorId)
        && groundIdAllowed(g.id, where))),
    },
    checkIn: {
      findMany: jest.fn(async ({ where }: any) => (where.groundId && groundIdAllowed(where.groundId, where)
        ? [{ sessionNumber: 1, completedAt: new Date('2026-09-28') }]
        : [])),
    },
    groundParticipant: {
      findMany: jest.fn(async ({ where }: any) => GROUNDS
        .filter((g) => g.participants.some((p) => p.userId === Object.values(PEOPLE).find((x) => x.email === where.email)?.linkedUserId) && groundIdAllowed(g.id, where.ground))
        .map((g) => ({ id: `gp-${g.id}`, ground: { id: g.id, label: g.label, initiatorId: g.initiatorId, whoSeesTargets: 'EVERYONE', objectives: [], participants: [], report: REPORTS[g.id] } }))),
    },
    commitment: {
      findMany: jest.fn(async ({ where }: any) => [
        { id: 'c-1', text: PIP_PROMISE, dueSaid: null, state: 'OPEN', statedAt: new Date('2026-09-28'), dueAt: null, lastFollowedUpAt: null, sourceGroundId: 'g-pip', personExternalId: 'x-femi' },
        { id: 'c-2', text: 'call the Kilimani shops on Friday', dueSaid: null, state: 'OPEN', statedAt: new Date('2026-09-25'), dueAt: null, lastFollowedUpAt: null, sourceGroundId: 'g-sales', personExternalId: 'x-femi' },
      ].filter((c) => c.personExternalId === where.personExternalId && (where.AND ?? []).every((a: any) => (a.OR ?? [a]).some((o: any) => (o.sourceGroundId === null ? c.sourceGroundId === null : o.sourceGroundId?.notIn ? !o.sourceGroundId.notIn.includes(c.sourceGroundId) : true))))),
    },
    coachingState: {
      /* Newest first: the plan's step is the newer one. */
      findFirst: jest.fn(async ({ where }: any) => [
        { groundId: 'g-pip', currentStep: 'Tell Wairimu by Monday when you can next visit Westgate.', staircase: null },
        { groundId: 'g-sales', currentStep: 'Ask the Kilimani shops for a reorder date.', staircase: null },
      ].find((c) => groundIdAllowed(c.groundId, { id: where.participant.groundId })) ?? null),
    },
    contribution: { aggregate: jest.fn(async () => ({ _sum: { weight: 0 } })) },
    subject: { findMany: jest.fn(async () => []) },
    knowledgeCard: { findMany: jest.fn(async () => []) },
    assistantProposal: { findFirst: jest.fn(async () => null), create: jest.fn(async ({ data }: any) => ({ id: 'pr', ...data })) },
    assistantTurn: { count: jest.fn(async () => 3), createMany: jest.fn(async () => ({ count: 2 })) },
  };
  const engine: any = {
    extract: jest.fn(async (system: string, messages: any[]) => { prompts.push(`${system}\n${messages.map((m) => m.content).join('\n')}`); return null; }),
    respond: jest.fn(async (system: string, messages: any[]) => { prompts.push(`${system}\n${messages.map((m) => m.content).join('\n')}`); throw new Error('model off'); }),
  };
  const reports: any = {
    sessionReport: jest.fn(async (groundId: string) => {
      reportsRead.push(groundId);
      return { whatEachPersonSaid: [{ who: 'Femi Ade', isYou: false, lines: [SAID[groundId]] }] };
    }),
  };
  const service = new AssistantService(
    prisma, engine, { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) } as any,
    { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }), whoNeedsYouThisWeek: async () => ({ buckets: [] }) } as any,
    {} as any, { pendingFor: async () => [] } as any, {} as any,
    new WhatIsTrueService(prisma), {} as any, {} as any, {} as any,
    reports,
  );
  const ask = async (door: 'whatsapp' | 'app', personId: string, q: string) => {
    const r: any = door === 'whatsapp' ? await service.respondOnWhatsApp(ORG, personId, q) : await service.respond(ORG, personId, q);
    return r.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n');
  };
  return { ask, reportsRead, prompts };
}

const PIP = [PIP_WORDS, PIP_QUESTION, PIP_PROMISE, 'Performance plan, Femi', 'Westgate'];
const noneOf = (text: string) => PIP.filter((p) => text.includes(p));

describe('a check-in kept in the app, asked about on WhatsApp', () => {
  it('the questions go to the lanes that read the record', () => {
    expect(route('what did Femi say').lane).toBe('what_did_they_say');
    expect(route('help me think through how to support Femi').lane).toBe('think_it_through');
    expect(route('what came of our last check-in').lane).toBe('what_came_of_it');
    expect(route('what did I commit to').lane).toBe('what_did_i_commit_to');
    expect(route('how am I doing').lane).toBe('how_am_i_doing');
  });

  it('"how am I doing": the coaching step from the plan is not given on WhatsApp', async () => {
    const onThePhone = await aBaridi().ask('whatsapp', 'pe-femi', 'how am I doing');
    expect(noneOf(onThePhone)).toEqual([]);
    expect(onThePhone).toContain('Ask the Kilimani shops for a reorder date.');
    expect(await aBaridi().ask('app', 'pe-femi', 'how am I doing')).toContain('visit Westgate');
  });

  it('"what did Femi say": Wairimu reads only the sales team on WhatsApp, and the plan is never read', async () => {
    const wa = aBaridi();
    const onThePhone = await wa.ask('whatsapp', 'pe-wairimu', 'what did Femi say');
    expect(noneOf(onThePhone)).toEqual([]);
    expect(onThePhone).toContain(SALES_WORDS);
    expect(wa.reportsRead).not.toContain('g-pip');
    expect(wa.prompts.filter((p) => noneOf(p).length)).toEqual([]);

    const app = aBaridi();
    expect(await app.ask('app', 'pe-wairimu', 'what did Femi say')).toContain(SALES_WORDS);
    expect(app.reportsRead).toContain('g-pip');
  });

  it('"think it through": Femi\'s words in the plan never reach the assembled prompt on WhatsApp', async () => {
    const wa = aBaridi();
    await wa.ask('whatsapp', 'pe-wairimu', 'help me think through how to support Femi');
    expect(wa.prompts.length).toBeGreaterThan(0);
    expect(wa.prompts.filter((p) => p.includes(PIP_WORDS))).toEqual([]);
    expect(wa.prompts.some((p) => p.includes(SALES_WORDS))).toBe(true);
    expect(wa.reportsRead).not.toContain('g-pip');

    /* In the app the same question reads the plan, as before: the test feeds a real kept-in-app check-in. */
    const app = aBaridi();
    await app.ask('app', 'pe-wairimu', 'help me think through how to support Femi');
    expect(app.prompts.some((p) => p.includes(PIP_WORDS))).toBe(true);
  });

  it('"what came of it": Femi is never recalled the plan\'s report on WhatsApp', async () => {
    const wa = aBaridi();
    const onThePhone = await wa.ask('whatsapp', 'pe-femi', 'what came of our last check-in');
    expect(noneOf(onThePhone)).toEqual([]);
    expect(onThePhone).toContain('Kilimani');
    expect(noneOf((await aBaridi().ask('app', 'pe-femi', 'what came of our last check-in')))).not.toEqual([]);
  });

  it('"what did I commit to": a promise made in the plan is not listed on WhatsApp', async () => {
    const onThePhone = await aBaridi().ask('whatsapp', 'pe-femi', 'what did I commit to');
    expect(noneOf(onThePhone)).toEqual([]);
    expect(onThePhone).toContain('call the Kilimani shops on Friday');
    expect(await aBaridi().ask('app', 'pe-femi', 'what did I commit to')).toContain(PIP_PROMISE);
  });
});
