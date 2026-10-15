import { NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { TheBlockerTraceService } from './the-blocker-trace.service';

/**
 * REQUEST 18 (c): WHERE THE BLOCKER STARTED, AS EACH READER IS SERVED IT (D3, trace.txt).
 *
 * Westgate Deli's deposit, stored without names. One organisation:
 *   - "Sales team, Q3": Wairimu runs it; Miriam and Brian take part. People see each other.
 *   - "Finance, Q3": Grace runs it; Tendai takes part. People see each other.
 *   - "Leadership, Q3": Amani runs it.
 *   - "Kwame, first 90 days" keeps people apart; a second stored trace runs through it.
 * And Omar, in another organisation.
 * The chain: need (Sales), request (Sales), approval (Finance), priority (Leadership), effect (Sales).
 *
 * The rule under test: a reader is served only the steps from check-ins they may open, and nothing at
 * all if the end is in one they cannot, or the start is and the person here named no team for it.
 * Where steps are hidden, the reader still reads which team it waits on and since when (decision 75,
 * item 5). Names are swapped in when it is served.
 */
const ORG = 'org-baridi';
const person = (id: string, userId: string, first: string, last: string, partyType: string) => ({
  id, userId, partyType, roleAsDescribed: null, createdAt: new Date('2026-09-01'), email: `${first.toLowerCase()}@baridi.test`, nameGiven: null, organisationGiven: null,
  user: { firstName: first, lastName: last },
});
const ground = (id: string, label: string, initiatorId: string, participants: any[], peers = true, scenario = 'OKR_ALIGNMENT') => ({
  id, label, organizationId: ORG, initiatorId, scenario, peersVisibleToEachOther: peers, report: { sharedAs: null }, participants,
});
const sales = ground('sales', 'Sales team, Q3', 'u-wairimu', [
  person('p-s-wairimu', 'u-wairimu', 'Wairimu', 'Kamau', 'INITIATOR'), person('p-s-miriam', 'u-miriam', 'Miriam', 'Wanjiku', 'PARTICIPANT'), person('p-s-brian', 'u-brian', 'Brian', 'Otieno', 'PARTICIPANT'),
]);
const finance = ground('finance', 'Finance, Q3', 'u-grace', [
  person('p-f-grace', 'u-grace', 'Grace', 'Achieng', 'INITIATOR'), person('p-f-tendai', 'u-tendai', 'Tendai', 'Moyo', 'PARTICIPANT'),
]);
const leadership = ground('leadership', 'Leadership, Q3', 'u-amani', [person('p-l-amani', 'u-amani', 'Amani', 'Njoroge', 'INITIATOR')]);
const kwame = ground('kwame', 'Kwame, first 90 days', 'u-wairimu', [
  person('p-k-wairimu', 'u-wairimu', 'Wairimu', 'Kamau', 'INITIATOR'), person('p-k-kwame', 'u-kwame', 'Kwame', 'Ndungu', 'PARTICIPANT'), person('p-k-miriam', 'u-miriam', 'Miriam', 'Wanjiku', 'PARTICIPANT'),
], false, 'PIP');
const all = [sales, finance, leadership, kwame];

const step = (kind: string, groundId: string, personId: string | null, text: string, sourceId: string) => ({ kind, groundId, personId, text, sourceId });
const westgate = {
  id: 't-westgate', organizationId: ORG, anchorDependencyId: 'h-terms', endGroundId: 'sales', startGroundId: 'sales', createdAt: new Date('2026-09-20'),
  steps: [
    step('need', 'sales', 'p-s-miriam', 'Credit terms for Westgate Deli are needed before 30 September.', 'h1'),
    step('request', 'sales', 'p-s-miriam', 'Credit terms were asked of Finance on 14 September, without Westgate’s trade references.', 'h1'),
    step('approval', 'finance', 'p-f-grace', 'Credit terms over 30 days need a sign-off since August.', 'h2'),
    step('priority', 'leadership', 'p-l-amani', 'The sign-off is queued behind the supplier decision.', 'h3'),
    step('effect', 'sales', 'p-s-wairimu', 'One of the three ways to close the gap for 25 sales is at risk.', 'h1'),
  ],
  whereItStarted: 'Where it started: the request went to Finance without Westgate’s references, and August’s new sign-off rule then queued it behind the supplier decision.',
  decisionNeeded: 'Decision needed: sign off Westgate’s credit terms this week?',
  decisionOwnerParticipantId: 'p-l-amani',
};
const hidden = {
  id: 't-hidden', organizationId: ORG, anchorDependencyId: 'h-k', endGroundId: 'sales', startGroundId: 'kwame', createdAt: new Date('2026-09-21'),
  steps: [
    step('need', 'kwame', 'p-k-kwame', 'KWAME-PRIVATE the demo freezer is needed for Thursday.', 'k1'),
    step('effect', 'sales', 'p-s-wairimu', 'The Thursday demo for the freezer range may move.', 'k2'),
  ],
  whereItStarted: 'Where it started: the freezer request sits in a check-in that keeps people apart.',
  decisionNeeded: null, decisionOwnerParticipantId: null,
};

const readers = {
  wairimu: { userId: 'u-wairimu', email: 'wairimu@baridi.test', role: 'LEAD', organizationId: ORG },
  miriam: { userId: 'u-miriam', email: 'miriam@baridi.test', role: 'MEMBER', organizationId: ORG },
  brian: { userId: 'u-brian', email: 'brian@baridi.test', role: 'MEMBER', organizationId: ORG },
  tendai: { userId: 'u-tendai', email: 'tendai@baridi.test', role: 'MEMBER', organizationId: ORG },
  amani: { userId: 'u-amani', email: 'amani@baridi.test', role: 'LEAD', organizationId: ORG },
  admin: { userId: 'u-admin', email: 'admin@baridi.test', role: 'ADMIN', organizationId: ORG },
  omar: { userId: 'u-omar', email: 'omar@kijani.test', role: 'LEAD', organizationId: 'org-kijani' },
};

function setup(traces: any[] = [westgate]) {
  const prisma: any = {
    blockerTrace: { findMany: jest.fn(async ({ where }: any) => traces.filter((t) => t.organizationId === where.organizationId && t.endGroundId === where.endGroundId)) },
    ground: { findMany: jest.fn(async ({ where }: any) => all.filter((g) => where.id.in.includes(g.id) && g.organizationId === where.organizationId)) },
    /* The handoff in Sales each chain was followed from: Miriam asked Finance on 14 September; Wairimu's freezer wait names no team. */
    groundDependency: { findUnique: jest.fn(async ({ where }: any) => ({
      'h-terms': { id: 'h-terms', groundId: 'sales', fromParticipantId: 'p-s-miriam', onParticipantId: null, onLabel: 'Finance', waitingOnGroundId: 'finance', createdAt: new Date('2026-09-14T09:00:00Z') },
      'h-k': { id: 'h-k', groundId: 'sales', fromParticipantId: 'p-s-wairimu', onParticipantId: null, onLabel: null, waitingOnGroundId: 'kwame', createdAt: new Date('2026-09-21T09:00:00Z') },
    } as any)[where.id] ?? null) },
  };
  const grounds: any = {
    list: jest.fn(async (org: string, userId: string, _e: string, role: string) => {
      if (org !== ORG) return [];
      return role === 'ADMIN' ? all : all.filter((g) => g.initiatorId === userId || g.participants.some((p) => p.userId === userId));
    }),
  };
  const reports = Object.create(ReportsService.prototype) as any;
  reports.logger = { log: () => {}, warn: () => {} };
  const svc = new TheBlockerTraceService(prisma, grounds, reports);
  return { svc, prisma, read: (who: keyof typeof readers, id = 'sales') => svc.forReader(id, readers[who], new Date('2026-10-02T12:00:00Z')) };
}

/** Everything a person reads, as one string. */
const everything = (o: unknown) => JSON.stringify(o);

describe('the admin who only reads', () => {
  it('reads the whole chain, every step with its check-in and its owner, then the sentence and the decision', async () => {
    const { traces } = await setup().read('admin');
    expect(traces).toHaveLength(1);
    const t = traces[0];
    expect(t.steps.map((s) => [s.kind, s.checkIn, s.owner])).toEqual([
      ['need', 'Sales team, Q3', 'Miriam Wanjiku'],
      ['request', 'Sales team, Q3', 'Miriam Wanjiku'],
      ['approval', 'Finance, Q3', 'Grace Achieng'],
      ['priority', 'Leadership, Q3', 'Amani Njoroge'],
      ['effect', 'Sales team, Q3', 'Wairimu Kamau'],
    ]);
    expect(t.whereItStarted).toBe('Where it started: the request went to Finance without Westgate’s references, and August’s new sign-off rule then queued it behind the supplier decision.');
    expect(t.decisionNeeded).toBe('Decision needed: sign off Westgate’s credit terms this week?');
    expect(t.decidedBy).toBe('Amani Njoroge decides.');
    /* Every step is hers to read, so nothing needs saying about a team she cannot see. */
    expect(t.waitingOn).toBeNull();
  });
});

describe('a lead who runs only the check-in it ends in', () => {
  it.each(['wairimu'] as const)('%s reads only the steps from Sales, without the sentences written from the whole chain', async (who) => {
    const { traces } = await setup().read(who);
    expect(traces[0].steps.map((s) => s.kind)).toEqual(['need', 'request', 'effect']);
    expect(traces[0].steps.map((s) => s.checkIn)).toEqual(['Sales team, Q3', 'Sales team, Q3', 'Sales team, Q3']);
    expect(traces[0].whereItStarted).toBeNull();
    expect(traces[0].decisionNeeded).toBeNull();
    expect(traces[0].decidedBy).toBeNull();
    const out = everything(traces);
    expect(out).not.toMatch(/Finance, Q3|Leadership|Grace|Amani|sign-off|supplier decision/);
    /* Decision 75, item 5: but always which team it waits on, and since when, from Miriam's own words in Sales. */
    expect(traces[0].waitingOn).toBe('This is waiting on Finance since 14 September.');
  });
});

describe('a person in the check-in', () => {
  it('Miriam reads her own steps as "You", and her colleague by name, and nothing from Finance or Leadership', async () => {
    const { traces } = await setup().read('miriam');
    expect(traces[0].steps.map((s) => [s.kind, s.owner])).toEqual([['need', 'You'], ['request', 'You'], ['effect', 'Wairimu Kamau']]);
    expect(traces[0].waitingOn).toBe('This is waiting on Finance since 14 September.');
    expect(everything(traces)).not.toMatch(/Finance, Q3|Leadership|Grace|Amani|sign-off/);
  });
});

describe('a colleague on a check-in they cannot open', () => {
  it('Tendai, in Finance only, is told there is nothing, because the start and the end are not in a check-in he may open', async () => {
    const { traces } = await (async () => {
      const s = setup();
      /* Tendai may open Finance and not Sales: asking for Sales' trace is NotFound, asking for Finance has none of its own. */
      await expect(s.read('tendai', 'sales')).rejects.toBeInstanceOf(NotFoundException);
      return s.read('tendai', 'finance');
    })();
    expect(traces).toEqual([]);
  });

  it('gives nothing at all when the end is in a check-in the reader cannot open, even if the start is in one they can', async () => {
    const t = { ...westgate, id: 't-end-elsewhere', endGroundId: 'finance', startGroundId: 'finance', steps: [westgate.steps[2], westgate.steps[3], westgate.steps[4]] };
    const { traces } = await setup([t]).read('tendai', 'finance');
    expect(traces).toEqual([]);
  });

  it('Brian, in Sales, reads the same as Miriam and never the Finance sign-off', async () => {
    const { traces } = await setup().read('brian');
    expect(traces[0].steps.map((s) => s.checkIn)).not.toContain('Finance, Q3');
  });
});

describe('a step from a check-in that keeps people apart', () => {
  it('is read only by the person it is about, by whoever runs that check-in, or by an admin', async () => {
    const s = setup([hidden]);
    /* Brian is in Sales only: the start is in Kwame's check-in, which he cannot open. */
    expect((await s.read('brian')).traces).toEqual([]);
    /* Miriam is in Kwame's check-in but the step is Kwame's, and people there do not see each other. */
    expect((await s.read('miriam')).traces).toEqual([]);
    const wairimu = (await s.read('wairimu')).traces[0];
    expect(wairimu.steps[0].text).toMatch(/KWAME-PRIVATE/);
    expect(wairimu.steps[0].owner).toBe('Kwame Ndungu');
    const admin = (await s.read('admin')).traces[0];
    expect(admin.steps).toHaveLength(2);
  });
});

describe('another organisation', () => {
  it('is told the check-in is not found, as for any guess', async () => {
    await expect(setup().read('omar')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('what any reader reads is plain', () => {
  it.each(['admin', 'wairimu', 'miriam'] as const)('%s reads no label, no rating and no judgement of anybody', async (who) => {
    const { traces } = await setup().read(who);
    const out = everything(traces);
    expect(out).not.toMatch(/participant [A-Z]|the initiator|person \d|@baridi|specificity|\bPIP\b|at risk of leaving|\bslow\b|\bfault\b|\bscore\b/i);
    for (const t of traces) for (const sentence of [t.whereItStarted, t.decisionNeeded, t.decidedBy, ...t.steps.map((x) => x.text)]) {
      if (sentence) expect(sentence).toMatch(/[.?]$/);
    }
  });

  it('opening it asks no model and writes nothing', async () => {
    const { prisma, read } = setup();
    await read('admin');
    await read('miriam');
    expect(Object.keys(prisma.blockerTrace)).toEqual(['findMany']);
  });
});
