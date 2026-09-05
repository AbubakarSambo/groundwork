import { AssistantService } from './assistant.service';
import { route } from './the-router-is-deterministic';
import { lines, recall, saidOf } from './what-the-last-round-produced';

/**
 * MEMORY OF THE WORK, NOT ONLY OF THE CONVERSATION.
 *
 * The assistant could recall what somebody typed at it and nothing about what their check-ins
 * produced. These tests are about the read - which rows are selected, which fields cross, and what
 * happens to a person who was in none of them.
 */
function svc(opts: { participations?: any[] } = {}) {
  const queries: any[] = [];
  const prisma: any = {
    person: { findFirst: jest.fn(async () => ({ id: 'p1', externalId: 'u-1', email: 'ada@northwind.test', active: true })) },
    groundParticipant: {
      findMany: jest.fn(async (args: any) => { queries.push(args); return opts.participations ?? []; }),
    },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
    assistantProposal: { findFirst: jest.fn(async () => null), create: jest.fn(async () => ({})), update: jest.fn(async () => ({})) },
  };
  const service = new AssistantService(
    prisma,
    { respond: jest.fn(async () => { throw new Error('model off'); }) } as any,
    { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) } as any,
    { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any,
    { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
    { pendingFor: async () => [], decide: async () => { throw new Error('n/a'); } } as any,
    { start: async () => { throw new Error('no drafting in these tests'); } } as any,
    { forPerson: async () => { throw new Error('no assembly in these tests'); } } as any,
  );
  return { service, queries };
}

const round = (over: any = {}) => ({
  ground: {
    label: over.label ?? 'Atlas delivery',
    report: {
      /* `??` would swallow an explicit null, which is exactly the case these tests need most. */
      releasedAt: 'releasedAt' in over ? over.releasedAt : new Date(Date.now() - 20 * 86_400_000),
      centralQuestion: over.centralQuestion ?? 'Whether Atlas ships this quarter or the scope changes.',
      agreements: over.agreements ?? ['Scope drops the reporting module.', 'Weekly written update from each side.'],
      divergences: over.divergences ?? [{ text: 'Whether the delay was capacity or unclear requirements.' }],
      ...over.report,
    },
  },
});

const text = (r: any) => r.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n');

describe('the assistant remembers the work', () => {
  it('recalls what a finished check-in came down to', async () => {
    const { service } = svc({ participations: [round()] });
    const body = text(await service.respond('org-a', 'p1', 'what did we agree?'));

    expect(body).toContain('Atlas delivery');
    expect(body).toContain('Whether Atlas ships this quarter or the scope changes.');
    expect(body).toContain('Scope drops the reporting module.');
    /* The gap is the most useful part and the first thing a recollection loses. */
    expect(body).toContain('Whether the delay was capacity or unclear requirements.');
    expect(body).toContain('2 weeks ago');
  });

  it('reaches reports only through the participant row, and only released ones', async () => {
    /*
     * THE WHOLE ACCESS RULE IS THIS QUERY. There is no filtering step afterwards to get wrong -
     * somebody who was not in a check-in does not select its row. If this query ever stops being
     * scoped by the reader's own email, every report in the organisation is one question away.
     */
    const { service, queries } = svc({ participations: [] });
    await service.respond('org-a', 'p1', 'what came out of the last one');

    expect(queries).toHaveLength(1);
    expect(queries[0].where.email).toBe('ada@northwind.test');
    expect(queries[0].where.ground.organizationId).toBe('org-a');

    /* Only the four shared fields. The rest of a report is per-person - see own-reads-only.ts. */
    const fields = Object.keys(queries[0].select.ground.select.report.select);
    expect(fields.sort()).toEqual(['agreements', 'centralQuestion', 'divergences', 'releasedAt']);
    for (const forbidden of ['engagement', 'finalSynthesis', 'arcSignals', 'inferences', 'sharedPicture']) {
      expect(fields).not.toContain(forbidden);
    }
  });

  it('never recalls a report that has not been released to everybody in it', async () => {
    const { service } = svc({ participations: [round({ releasedAt: null, label: 'NOT RELEASED YET' })] });
    const body = text(await service.respond('org-a', 'p1', 'what did we agree?'));
    expect(body).not.toContain('NOT RELEASED YET');
    expect(body).toContain('reaches me once its report is released');
  });

  it('tells apart having no check-ins from having none that have finished', async () => {
    const none = svc({ participations: [] });
    expect(text(await none.service.respond('org-a', 'p1', 'what did we agree?'))).toContain('no finished check-ins of yours');

    const running = svc({ participations: [round({ releasedAt: null })] });
    expect(text(await running.service.respond('org-a', 'p1', 'what did we agree?'))).toContain('Nothing has finished yet');
  });

  it('caps what it pastes and says where the rest is', async () => {
    const many = [1, 2, 3, 4, 5].map((n) => round({ label: `Check-in ${n}`, releasedAt: new Date(Date.now() - n * 86_400_000) }));
    const { service } = svc({ participations: many });
    const body = text(await service.respond('org-a', 'p1', 'what did we agree?'));

    /* Newest first, and the oldest two named only as a count. */
    expect(body).toContain('Check-in 1');
    expect(body).toContain('Check-in 3');
    expect(body).not.toContain('Check-in 5');
    expect(body).toContain('2 earlier check-ins');
  });

  it('reads the shapes agreements have actually been stored in, and renders no object at anybody', () => {
    expect(lines(['a', 'b'])).toEqual(['a', 'b']);
    expect(lines([{ text: 'from text' }, { statement: 'from statement' }])).toEqual(['from text', 'from statement']);
    expect(lines({ 'Party A': 'keyed by label' })).toEqual(['keyed by label']);
    /* The failure this is here for: an unrecognised shape is dropped, never stringified. */
    expect(lines([{ nothing: 'useful' }, 42, null])).toEqual([]);
    expect(lines(null)).toEqual([]);
    expect(JSON.stringify(lines([{ nested: { a: 1 } }]))).not.toContain('object Object');
  });

  it('names the check-in every recall came from, so it can be checked against the report', () => {
    const said = saidOf(recall({
      groundLabel: 'Atlas delivery',
      releasedAt: new Date(),
      centralQuestion: 'Q',
      agreements: ['one'],
      divergences: [],
    }), 'last week');
    expect(said[0]).toBe('Atlas delivery, last week.');
  });

  it('owns "what did we agree" without stealing "what did I agree to"', () => {
    expect(route('what did we agree?').lane).toBe('what_came_of_it');
    expect(route('what came out of the last check-in').lane).toBe('what_came_of_it');
    expect(route('our last check-in').lane).toBe('what_came_of_it');

    /* One pronoun apart, and a different question. Pinned next to each other on purpose. */
    expect(route('what did I agree to').lane).toBe('what_did_i_commit_to');
    expect(route('my commitments').lane).toBe('what_did_i_commit_to');
    expect(route('what should we talk about').lane).toBe('what_should_we_talk_about');
    expect(route('how do I run a check-in').lane).toBe('how_we_work');
  });
});
