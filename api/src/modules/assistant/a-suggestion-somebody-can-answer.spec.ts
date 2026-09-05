import { AssistantService } from './assistant.service';
import { route } from './the-router-is-deterministic';
import { daysLeft, howSure } from './a-suggestion-you-can-answer';

/**
 * THE LOOP THAT WAS OPEN AT BOTH ENDS.
 *
 * The suggestions existed, `decide` existed, and between them there was nothing - so every one of
 * them expired unread. These tests are written against the flow rather than the wording, because
 * the wording is not what was missing.
 */
function svc(opts: { pending?: any[]; parked?: any; decideThrows?: boolean } = {}) {
  const writes: any[] = [];
  const decided: any[] = [];
  const prisma: any = {
    person: { findFirst: jest.fn(async () => ({ id: 'p1', externalId: 'u-1', active: true })) },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
    assistantProposal: {
      findFirst: jest.fn(async () => opts.parked ?? null),
      create: jest.fn(async ({ data }: any) => { writes.push({ op: 'create', ...data }); return { id: 'pr1', ...data }; }),
      update: jest.fn(async ({ where, data }: any) => { writes.push({ op: 'update', id: where.id, ...data }); return data; }),
    },
    subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    detectionQuietPeriod: { findMany: jest.fn(async () => []) },
  };
  const scenarios: any = {
    pendingFor: jest.fn(async () => opts.pending ?? []),
    decide: jest.fn(async (_o: string, id: string, who: string, accept: boolean) => {
      if (opts.decideThrows) throw new Error('No such suggestion.');
      decided.push({ id, who, accept });
      return { id, scenario: 'PIP', evidence: { says: 's' }, confidence: 0.8, personExternalId: 'u-2', expiresAt: new Date() };
    }),
  };
  const knowledge: any = { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) };
  const engine: any = { respond: jest.fn(async () => { throw new Error('model off'); }) };
  const service = new AssistantService(
    prisma, engine, knowledge,
    { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any,
    { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
    scenarios,
    { start: async () => { throw new Error('no drafting in these tests'); } } as any,
  );
  return { service, writes, decided, scenarios };
}

/**
 * SHAPED LIKE THE ROW, NOT LIKE THE TYPE, and the difference is not cosmetic.
 *
 * `scenario_candidates` has no `says` column - `propose` folds it into `evidence`. The first
 * version of this fake put `says` at the top level, which is where I had assumed it was, and all
 * ten tests passed against a shape the database never returns. Reading the table found it.
 */
const suggestion = (over: { id?: string; says?: string; scenario?: string; expiresAt?: Date } = {}) => ({
  id: over.id ?? 'cand-1',
  scenario: over.scenario ?? 'DRIFT',
  evidence: { says: over.says ?? 'Priya has had no check-in since the project changed direction in March.', sinceDays: 90 },
  confidence: 0.8,
  personExternalId: 'u-2',
  expiresAt: over.expiresAt ?? new Date(Date.now() + 5 * 86_400_000),
});

const text = (r: any) => r.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n');

describe('a suggestion somebody can answer', () => {
  it('reaches the person it was addressed to, in the detectors own words', async () => {
    const { service } = svc({ pending: [suggestion()] });
    const body = text(await service.respond('org-a', 'p1', 'what should we talk about?'));

    /*
     * QUOTED, NOT REWORDED. `says` carries the evidence and this lane skips the composer for that
     * reason - a substring check is the only way to catch a paraphrase creeping back in.
     */
    expect(body).toContain('Priya has had no check-in since the project changed direction in March.');
    expect(body).toContain('worth acting on for another 5 days');
  });

  it('says plainly when nothing is pending, rather than reading as a failure to look', async () => {
    const { service } = svc({ pending: [] });
    const body = text(await service.respond('org-a', 'p1', 'any suggestions?'));
    expect(body).toContain('Nothing is waiting on you');
  });

  it('asks about one and lists the rest, so nothing waiting is hidden', async () => {
    const { service, writes } = svc({
      pending: [suggestion(), suggestion({ id: 'cand-2', says: 'Second thing.' }), suggestion({ id: 'cand-3', says: 'Third thing.' })],
    });
    const body = text(await service.respond('org-a', 'p1', 'what should we talk about?'));

    expect(body).toContain('2 more waiting on you');
    expect(body).toContain('Second thing.');
    expect(body).toContain('Third thing.');

    /* Exactly one parked, because a bare "yes" against two open questions answers neither. */
    const parked = writes.filter((w) => w.op === 'create');
    expect(parked).toHaveLength(1);
    expect(parked[0].payload.candidateId).toBe('cand-1');
    expect(parked[0].kind).toBe('scenario');
  });

  it('turns a yes into a recorded decision and a way to set it up', async () => {
    const { service, decided } = svc({
      parked: { id: 'pr1', kind: 'scenario', payload: { candidateId: 'cand-1', scenario: 'DRIFT' } },
    });
    const body = text(await service.respond('org-a', 'p1', 'yes'));

    expect(decided).toEqual([{ id: 'cand-1', who: 'u-1', accept: true }]);

    /**
     * THE WORDS NO LONGER CARRY THE PATH, AND THAT IS THE FIX.
     *
     * The reply used to read "Open /grounds/new?scenario=PIP to set it up". In the product that
     * works. In the embedded panel the same sentence is read on the customer's own page, where a
     * relative path resolves against THEIR origin - so the one instruction it gave was broken
     * exactly where the API story lives, and read fine everywhere it was tested.
     */
    expect(body).not.toContain('/grounds/new');

    const reply = await svc({
      parked: { id: 'pr1', kind: 'scenario', payload: { candidateId: 'cand-1', scenario: 'DRIFT' } },
    }).service.respond('org-a', 'p1', 'yes');
    const step = reply.blocks.find((b: { type: string }) => b.type === 'next_step') as {
      href: string; kind: string; context: Record<string, string>;
    };
    expect(step).toBeDefined();
    expect(step.kind).toBe('set_up_a_check_in');
    /* The stored value, not the picker label - the label map lives in the client and copying it
       here is how the two would drift apart. */
    expect(step.href).toBe('/grounds/new?scenario=PIP');
    expect(step.context.scenario).toBe('PIP');
  });

  it('turns a no into a decline, which is the only thing that starts the cooling period', async () => {
    const { service, decided } = svc({
      parked: { id: 'pr1', kind: 'scenario', payload: { candidateId: 'cand-1', scenario: 'DRIFT' } },
    });
    const body = text(await service.respond('org-a', 'p1', 'no'));

    expect(decided).toEqual([{ id: 'cand-1', who: 'u-1', accept: false }]);
    expect(body).toContain('90 days');
  });

  it('never writes a commitment when the parked question was a suggestion', async () => {
    /*
     * THE BUG THIS IS HERE FOR. Everything below the branch in `resolveParked` reads
     * `payload.text` and creates a commitment. Without the branch on `kind`, answering a suggestion
     * would have written a commitment whose text was undefined - and `prisma.commitment` is absent
     * from this fake on purpose, so that path throws rather than passing quietly.
     */
    const { service } = svc({
      parked: { id: 'pr1', kind: 'scenario', payload: { candidateId: 'cand-1', scenario: 'DRIFT' } },
    });
    await expect(service.respond('org-a', 'p1', 'yes')).resolves.toBeDefined();
  });

  it('does not blame the person when the suggestion expired between the asking and the answer', async () => {
    const { service } = svc({
      parked: { id: 'pr1', kind: 'scenario', payload: { candidateId: 'cand-1', scenario: 'DRIFT' } },
      decideThrows: true,
    });
    const body = text(await service.respond('org-a', 'p1', 'yes'));
    expect(body).toContain('no longer open');
    expect(body).not.toMatch(/not found|404|error/i);
  });

  it('cannot be made to answer a suggestion that was put to somebody else', async () => {
    /*
     * DRIVEN AGAINST POSTGRES BEFORE IT WAS WRITTEN HERE. A parked proposal pointing at another
     * person's candidate was inserted by hand and answered "yes": the candidate stayed PROPOSED and
     * the reply recorded nothing. The check lives in `decide`, which is why this service never
     * queries `scenarioCandidate` itself - a where-clause written here would be a second copy of
     * that rule, and the weaker of the two.
     *
     * The reply is the same one an expired suggestion gets, deliberately. A distinct message would
     * confirm that somebody else's suggestion exists.
     */
    const { service } = svc({
      parked: { id: 'forged', kind: 'scenario', payload: { candidateId: 'not-mine', scenario: 'PIP' } },
      decideThrows: true,
    });
    const body = text(await service.respond('org-a', 'p1', 'yes'));
    expect(body).toContain('no longer open');
  });

  it('routes the shapes people use, and does not steal the ones other lanes own', () => {
    expect(route('what should we talk about?').lane).toBe('what_should_we_talk_about');
    expect(route('any suggestions?').lane).toBe('what_should_we_talk_about');
    expect(route('what do you suggest').lane).toBe('what_should_we_talk_about');
    expect(route('what needs my deciding').lane).toBe('what_should_we_talk_about');

    /* The neighbours it sits above. If it takes these, it has been written too wide. */
    expect(route("what's blocked").lane).toBe('what_is_stuck');
    expect(route('who is waiting on me').lane).toBe('what_is_stuck');
    expect(route('how am I doing').lane).toBe('how_am_i_doing');
    expect(route('how do I run a check-in').lane).toBe('how_we_work');
    expect(route('my objectives').lane).toBe('what_am_i_on');

    /*
     * Found by uploading a real handbook and asking it the questions the handbook answers: the
     * document had a section headed LOCKED OUT and this reached no lane at all.
     */
    expect(route('what do I do if I am locked out').lane).toBe('how_we_work');
    expect(route('who do I ask about leave').lane).toBe('how_we_work');
    /* Still owned by the lanes above it. */
    expect(route("i'm stuck").lane).toBe('how_am_i_doing');
    expect(route('what am I waiting on').lane).toBe('what_is_stuck');
  });

  it('counts the last day as a day, because rounding it away is what makes somebody miss it', () => {
    const now = new Date('2026-03-01T09:00:00Z');
    expect(daysLeft({ expiresAt: new Date('2026-03-01T18:00:00Z') } as any, now)).toBe(1);
    expect(daysLeft({ expiresAt: new Date('2026-03-01T08:00:00Z') } as any, now)).toBe(0);
    expect(daysLeft({ expiresAt: new Date('2026-03-06T09:00:00Z') } as any, now)).toBe(5);
  });

  it('reads says out of the evidence blob, and never renders the word undefined at a person', async () => {
    const { service } = svc({ pending: [{ ...suggestion(), evidence: { sinceDays: 90 } }] });
    const body = text(await service.respond('org-a', 'p1', 'what should we talk about?'));
    expect(body).not.toContain('undefined');
    expect(body).toContain('drift conversation');
  });

  it('says how sure it is in words, never as a percentage about a colleague', () => {
    expect(howSure(0.9)).toContain('strong');
    expect(howSure(0.6)).toContain('some signs');
    expect(howSure(0.2)).toContain('faint');
    for (const c of [0.9, 0.6, 0.2]) expect(howSure(c)).not.toMatch(/\d/);
  });
});
