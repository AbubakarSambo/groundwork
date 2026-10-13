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
function svc(opts: { participations?: any[]; person?: any } = {}) {
  const queries: any[] = [];
  const prisma: any = {
    person: { findFirst: jest.fn(async () => opts.person ?? { id: 'p1', externalId: 'u-1', email: 'ada@northwind.test', active: true, linkedUserId: 'u-1' }) },
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
    { read: async () => ({ read: false, because: 'no reading in these tests' }) } as any,
    { sendRoundDigest: async () => { throw new Error('no mail in these tests'); } } as any,
    { create: async () => { throw new Error('no ground creation in these tests'); }, addParticipant: async () => { throw new Error('no ground creation in these tests'); } } as any,
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
    /* CHANGED 11 October 2026 (decision 139, item 1): `sharedAs` is read too, a flag saying whether the copy was shared
       without names, so the recall can go through the report's naming door the way the report page does. It holds no words. */
    expect(fields.sort()).toEqual(['agreements', 'centralQuestion', 'divergences', 'releasedAt', 'sharedAs']);
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

/**
 * A COLLEAGUE'S HIDDEN TARGET STAYS OUT OF WHAT IS RECALLED, TOO.
 *
 * `whatCameOfIt` reads a report straight off the ground rather than through reports.service.ts's
 * `get`, which is where `targetsHiddenFrom` / `withoutHiddenTargetsIn` already run for the report
 * page. On a check-in where each person sees only their own target (`whoSeesTargets: THEIR_OWN`),
 * this lane had no idea that rule existed, and would recall a colleague's number straight out of the
 * shared agreements and divergences - the same incident `a-hidden-target-stays-hidden.ts` documents
 * for the report page and the board, reached by a different door.
 */
describe('a colleague\'s hidden target is never recalled here either', () => {
  const groundBase = {
    label: 'Sales floor Q3',
    initiatorId: 'user-amaka',
    whoSeesTargets: 'THEIR_OWN',
    objectives: [{ ownerParticipantId: 'participant-kwame', target: 14 }],
    participants: [
      { id: 'participant-kwame', nameGiven: 'Kwame Mensah', partyType: 'PARTICIPANT' },
      { id: 'participant-ngozi', nameGiven: 'Ngozi Eze', partyType: 'PARTICIPANT' },
      { id: 'participant-amaka', nameGiven: 'Amaka', partyType: 'INITIATOR' },
    ],
    report: {
      releasedAt: new Date(Date.now() - 3 * 86_400_000),
      centralQuestion: 'Whether the region hits its facilities target this quarter.',
      agreements: [
        'Kwame Mensah is working towards a target of 14 approved facilities this quarter.',
        'Everybody agreed to send a written update every Friday.',
      ],
      divergences: [{ text: 'Whether fourteen approved facilities is realistic for Kwame Mensah given the team size.' }],
    },
  };
  const participation = (participantId: string) => [{ id: participantId, ground: groundBase }];

  it('takes a colleague\'s target sentence out for a colleague, in figures and in words, but keeps the rest', async () => {
    const { service } = svc({
      participations: participation('participant-ngozi'),
      person: { id: 'p1', externalId: 'u-ngozi', email: 'ngozi@northwind.test', active: true, linkedUserId: 'user-ngozi' },
    });
    const body = text(await service.respond('org-a', 'p1', 'what did we agree?'));

    expect(body).not.toContain('14 approved facilities');
    expect(body).not.toContain('fourteen approved facilities');
    expect(body).toContain('Everybody agreed to send a written update every Friday.');
  });

  it('keeps the target\'s own owner reading their own number', async () => {
    const { service } = svc({
      participations: participation('participant-kwame'),
      person: { id: 'p1', externalId: 'u-kwame', email: 'kwame@northwind.test', active: true, linkedUserId: 'user-kwame' },
    });
    const body = text(await service.respond('org-a', 'p1', 'what did we agree?'));

    expect(body).toContain('14 approved facilities');
  });

  it('keeps everything for the lead who ran the check-in', async () => {
    const { service } = svc({
      participations: participation('participant-amaka'),
      person: { id: 'p1', externalId: 'u-amaka', email: 'amaka@northwind.test', active: true, linkedUserId: 'user-amaka' },
    });
    const body = text(await service.respond('org-a', 'p1', 'what did we agree?'));

    expect(body).toContain('14 approved facilities');
    expect(body).toContain('fourteen approved facilities');
  });

  it('an admin who only reads, and was never a participant, recalls nothing from this check-in', async () => {
    /* This lane reaches a report only through the reader's own participant row (see "reaches
       reports only through the participant row" above) - an admin with no row in this ground gets
       an empty read, not the report with anything taken out of it. */
    const { service } = svc({
      participations: [],
      person: { id: 'p1', externalId: 'u-admin', email: 'admin@northwind.test', active: true, linkedUserId: 'user-admin' },
    });
    const body = text(await service.respond('org-a', 'p1', 'what did we agree?'));

    expect(body).not.toContain('14 approved facilities');
    expect(body).not.toContain('fourteen approved facilities');
    expect(body).toContain('no finished check-ins');
  });
});
