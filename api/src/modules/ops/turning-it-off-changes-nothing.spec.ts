/**
 * Turn the adapter off and every ops board reads exactly the same.
 *
 * This is the acceptance test for the whole eight-phase build, stated as one
 * sentence in the brief: swap the ops system for somebody else's ERP and every
 * check-in still works; turn check-ins off and we can still run the company.
 * The second half is what this proves.
 *
 * The way it fails is never dramatic. Somebody needs a figure, the integration
 * happens to have it, they read it from there, and now the company's board
 * depends on a third-party API being up. Nobody notices until it is down.
 *
 * Two things are asserted, and the second is the one with teeth: no ops code
 * outside the adapter mentions the adapter at all.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { GroundworkApiClient } from './the-groundwork-api-as-a-customer';
import { subjectsFrom, evidenceFrom, interactionsFrom, OUR_SOURCE_SYSTEM } from './what-we-send-to-groundwork';

const OPS_DIR = __dirname;
const ADAPTER_FILES = [
  'the-groundwork-api-as-a-customer.ts',
  'what-we-send-to-groundwork.ts',
  'ops-integration.service.ts',
  /*
   * RECEIVING IS THE OTHER HALF OF THE ADAPTER, and it belongs here rather than
   * on an exemption list. We pushed for months and subscribed to nothing; these
   * two are the half that was missing.
   *
   * The property this file protects still holds: nothing arrives when Groundwork
   * is down, so every board reads exactly the same. What would break it is an ops
   * board reading an EVENT to produce a figure — and the guard below still fails
   * on that, because these files are the adapter and boards may not mention them.
   */
  'ops-groundwork-events.service.ts',
  'what-groundwork-tells-us.ts',
  /* The door those events arrive at. Its own controller because its caller is a
     server holding no login of ours, and the ordinary ops guards ask questions
     that mean nothing about one. */
  'ops-inbound.controller.ts',
];

const withoutComments = (t: string) =>
  t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function opsFilesExcludingTheAdapter(): string[] {
  const out: string[] = [];
  for (const name of readdirSync(OPS_DIR)) {
    const full = join(OPS_DIR, name);
    if (statSync(full).isDirectory()) continue;
    if (!name.endsWith('.ts') || name.endsWith('.spec.ts')) continue;
    if (ADAPTER_FILES.includes(name)) continue;
    // The module wires everything and the controller offers the screen; both
    // are allowed to know the adapter exists. Neither may read from it.
    if (name === 'ops.module.ts' || name === 'ops.controller.ts') continue;
    out.push(full);
  }
  return out;
}

describe('nothing in the ops system reads from the Groundwork adapter', () => {
  const files = opsFilesExcludingTheAdapter();

  it('has files to check, so this cannot pass on an empty directory', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it('and none of them imports it', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const source = withoutComments(readFileSync(file, 'utf8'));
      for (const adapter of ADAPTER_FILES) {
        const stem = adapter.replace(/\.ts$/, '');
        if (new RegExp(`from\\s+'\\./${stem}'`).test(source)) {
          offenders.push(`${file.split('/').pop()} imports ${stem}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('and no board or metric mentions the integration table', () => {
    const offenders = files.filter((file) =>
      /opsIntegration/.test(withoutComments(readFileSync(file, 'utf8'))),
    );
    expect(offenders.map((f) => f.split('/').pop())).toEqual([]);
  });
});

describe('what we send is our own work, in the shapes the API takes', () => {
  const objectives = [
    {
      id: 'o1',
      title: 'Ten companies lined up',
      keyResults: [
        {
          id: 'kr1',
          title: 'Companies attached to the target list',
          target: 10,
          unit: 'companies',
          current: 3,
          dueDate: new Date('2026-09-30'),
          typedByHand: false,
        },
      ],
    },
  ];

  it('sends a key result as a subject the API will accept', () => {
    const [subject] = subjectsFrom(objectives);
    expect(subject).toMatchObject({
      externalId: 'kr1',
      sourceSystem: OUR_SOURCE_SYSTEM,
      type: 'objective',
      measure: 'companies',
      target: '10',
    });
  });

  it('sends evidence as counts and short labels, which is the API’s own rule', () => {
    const [evidence] = evidenceFrom(objectives, new Date('2026-09-15'));
    expect(evidence.objectiveExternalId).toBe('kr1');
    for (const value of Object.values(evidence.state)) {
      if (typeof value === 'string') expect(value.length).toBeLessThanOrEqual(40);
    }
  });

  it('and says whether a number was typed, so a check-in can ask a different question', () => {
    const [computed] = evidenceFrom(objectives);
    expect(computed.state.source).toBe('computed');

    const byHand = evidenceFrom([
      { ...objectives[0], keyResults: [{ ...objectives[0].keyResults[0], typedByHand: true }] },
    ]);
    expect(byHand[0].state.source).toBe('by hand');
  });

  it('drops activity nobody did, so a person’s record never includes what they did not do', () => {
    const interactions = interactionsFrom([
      { id: 'a1', kind: 'call', happenedAt: new Date(), actorPersonId: 'p1', companyId: 'c1', note: null },
      { id: 'a2', kind: 'stage_lapsed', happenedAt: new Date(), actorPersonId: null, companyId: 'c1', note: null },
    ]);
    expect(interactions.map((i) => i.externalId)).toEqual(['a1']);
  });

  it('and sends none of the money', () => {
    /**
     * Not because Groundwork would misuse it, but because a customer wiring
     * their ERP in would send objectives and client activity and nothing else.
     * Send more than that and we are no longer testing the thing we sell.
     */
    const source = readFileSync(join(OPS_DIR, 'what-we-send-to-groundwork.ts'), 'utf8');
    const code = withoutComments(source);
    for (const forbidden of ['opsExpense', 'opsEarnings', 'balance', 'askAmount', 'committedAmount']) {
      expect(code).not.toContain(forbidden);
    }
  });
});

describe('the client behaves like a client', () => {
  const responses: Array<{ status: number; body: unknown }> = [];
  let calls: Array<{ url: string; init: RequestInit }> = [];

  const fakeFetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = responses.shift() ?? { status: 200, body: {} };
    return {
      ok: next.status < 400,
      status: next.status,
      json: async () => next.body,
    };
  }) as unknown as typeof fetch;

  beforeEach(() => {
    calls = [];
    responses.length = 0;
  });

  it('takes a token before it sends anything', async () => {
    responses.push({ status: 200, body: { access_token: 't', expires_in: 900, scope: 'subjects:write' } });
    responses.push({ status: 200, body: { ok: true } });

    const client = new GroundworkApiClient(
      { baseUrl: 'https://gw.test', clientId: 'c', clientSecret: 's' },
      fakeFetch,
    );
    await client.pushSubject({ externalId: 'x' });

    expect(calls[0].url).toContain('/oauth/token');
    expect(calls[1].url).toContain('/subjects');
    expect((calls[1].init.headers as Record<string, string>).authorization).toBe('Bearer t');
  });

  it('reuses the token rather than taking one per request', async () => {
    responses.push({ status: 200, body: { access_token: 't', expires_in: 900, scope: '' } });
    responses.push({ status: 200, body: {} }, { status: 200, body: {} });

    const client = new GroundworkApiClient(
      { baseUrl: 'https://gw.test', clientId: 'c', clientSecret: 's' },
      fakeFetch,
    );
    await client.pushSubject({ a: 1 });
    await client.pushSubject({ a: 2 });

    expect(calls.filter((c) => c.url.includes('/oauth/token'))).toHaveLength(1);
  });

  it('takes a fresh token and retries once on a 401 mid-batch', async () => {
    responses.push({ status: 200, body: { access_token: 'old', expires_in: 900, scope: '' } });
    responses.push({ status: 401, body: { message: 'expired' } });
    responses.push({ status: 200, body: { access_token: 'new', expires_in: 900, scope: '' } });
    responses.push({ status: 200, body: { ok: true } });

    const client = new GroundworkApiClient(
      { baseUrl: 'https://gw.test', clientId: 'c', clientSecret: 's' },
      fakeFetch,
    );
    const result = await client.pushSubject({ a: 1 });

    expect(result.ok).toBe(true);
    expect(calls.filter((c) => c.url.includes('/oauth/token'))).toHaveLength(2);
  });

  it('hands back a refusal verbatim rather than throwing it away', async () => {
    responses.push({ status: 200, body: { access_token: 't', expires_in: 900, scope: '' } });
    responses.push({ status: 400, body: { message: 'state.note is too long. Evidence is counts and short labels.' } });

    const client = new GroundworkApiClient(
      { baseUrl: 'https://gw.test', clientId: 'c', clientSecret: 's' },
      fakeFetch,
    );
    const result = await client.pushEvidence([{ objectiveExternalId: 'kr1' }]);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ message: expect.stringContaining('counts and short labels') });
  });

  it('and says plainly when the credentials are refused', async () => {
    responses.push({ status: 401, body: { message: 'Those credentials were not accepted.' } });

    const client = new GroundworkApiClient(
      { baseUrl: 'https://gw.test', clientId: 'c', clientSecret: 'wrong' },
      fakeFetch,
    );
    await expect(client.pushSubject({ a: 1 })).rejects.toThrow(/would not issue a token/);
  });
});

describe('a 200 is not the same as something happening', () => {
  /**
   * The first real push against the running API reported "5 sent, 0 refused"
   * and had written nothing. Every piece of evidence came back
   * `{"matched": false}` inside a 200.
   *
   * The API is not wrong to do that — it says so in its own comment: a nightly
   * push across an organisation will name objectives that are not on anybody's
   * check-in, and failing the batch for that would be useless. But a caller
   * reading only the status code sees success, and this is exactly the failure
   * a customer would hit and not notice for a month.
   *
   * Found by using the API rather than by reading it, which was the whole
   * argument for making this adapter speak HTTP.
   */
  const { OpsIntegrationService } = jest.requireActual('./ops-integration.service');

  const serviceWith = (evidenceBody: unknown, checkInId: string | null = 'ground-1') => {
    const recorded: Record<string, unknown>[] = [];
    const prisma = {
      opsIntegration: {
        findUnique: async () => ({
          id: 'the-one-row',
          enabled: true,
          baseUrl: 'https://gw.test',
          clientId: 'c',
          clientSecret: 's',
          /* A check-in to land on. Without one the advice is about that instead,
             which is a different problem with a different answer. */
          checkInId,
        }),
        update: async ({ data }: never) => {
          recorded.push(data as Record<string, unknown>);
          return {};
        },
      },
      opsPeriod: { findUnique: async () => ({ startsOn: new Date('2026-09-01'), endsOn: new Date('2026-09-30') }) },
      opsActivity: { findMany: async () => [] },
      opsPerson: { findMany: async () => [] },
      opsGrant: { findFirst: async () => ({ person: { key: 'hafsah' } }) },
      /* WHAT THE COMPANY DECIDED, which the push now sends before the objectives.
         Empty here on purpose: this spec is about what happens when evidence does
         not land, and a company with nothing written down must still be able to
         push. An empty set produces no cards and no noise. */
      opsProductStatement: { findFirst: async () => null },
      opsMoatComponent: { findMany: async () => [] },
      opsPhase: { findMany: async () => [] },
      opsFreeze: { findFirst: async () => null },
      opsResource: { findMany: async () => [] },
    };

    const intent = {
      objectives: async () => [
        {
          id: 'o1',
          title: 'An objective',
          keyResults: [
            {
              id: 'kr1',
              title: 'A number',
              target: 10,
              unit: 'things',
              current: 3,
              dueDate: new Date('2026-09-30'),
              typedByHand: false,
            },
          ],
        },
      ],
    };

    const service = new OpsIntegrationService(prisma, intent);
    /*
     * Stand in for the network: the token, the subject, the objectives, ONE CARD,
     * then the evidence.
     *
     * The card is not optional and that is why it is here. Everything the company
     * decided is read from our tables and this fake has none of it — but what a
     * piece of work has to serve is a CONSTANT, read from the enum so the card
     * cannot drift from the rule, so it sends whether or not anybody has written
     * anything down. Leaving it out shifted every later reply by one and the
     * evidence answered with the wrong body.
     */
    const replies = [
      { status: 200, body: { access_token: 't', expires_in: 900, scope: '' } },
      { status: 201, body: { externalId: 'kr1' } },
      { status: 200, body: { seeded: [{ externalId: 'kr1' }] } },
      { status: 200, body: { key: 'what-work-can-serve' } },
      { status: 200, body: evidenceBody },
    ];
    /**
     * Assigned rather than spied on. jest.restoreAllMocks() DELETES a spied
     * global that was not an own property, so the first test passed and the
     * next three failed with "Property `fetch` does not exist" — a failure
     * about the test harness wearing the costume of a failure about the code.
     */
    global.fetch = (async () => {
      const next = replies.shift() ?? { status: 200, body: {} };
      return { ok: next.status < 400, status: next.status, json: async () => next.body };
    }) as never;

    return { service, recorded };
  };

  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('does not report success when every piece of evidence matched nothing', async () => {
    const { service } = serviceWith({ received: [{ objectiveExternalId: 'kr1', matched: false }] });
    const result = await service.push('sept-2026-target-list');
    expect(result.ok).toBe(false);
  });

  it('and says what to do about it, rather than just failing', async () => {
    const { service } = serviceWith({ received: [{ objectiveExternalId: 'kr1', matched: false }] });
    const result = await service.push('sept-2026-target-list');
    expect(result.advice).toMatch(/objectives may not have seeded/);
  });

  it('and gives different advice when there is no check-in at all', async () => {
    /*
     * Two different problems with two different answers, and the first version
     * gave one sentence for both. "Somebody has to open a check-in" is useless
     * to somebody who already has, and "the objectives may not have seeded" is
     * useless to somebody with nowhere for them to seed onto.
     */
    const { service } = serviceWith({ received: [{ objectiveExternalId: 'kr1', matched: false }] }, null);
    const result = await service.push('sept-2026-target-list');
    expect(result.advice).toMatch(/no check-in for these numbers to land on/);
    expect(result.advice).toMatch(/will not open one for you/);
  });

  it('and the connection screen says it too, so it is not only in one response', async () => {
    const { service, recorded } = serviceWith({ received: [{ objectiveExternalId: 'kr1', matched: false }] });
    await service.push('sept-2026-target-list');
    expect(recorded.some((r) => String(r.lastSyncSummary).includes('matched no objective'))).toBe(true);
  });

  it('but is happy when the evidence lands', async () => {
    const { service } = serviceWith({ received: [{ objectiveExternalId: 'kr1', matched: true }] });
    const result = await service.push('sept-2026-target-list');
    expect(result.ok).toBe(true);
    expect(result.advice).toBeUndefined();
  });

  it('and a partly-matched batch is not treated as a total miss', async () => {
    const { service } = serviceWith({
      received: [
        { objectiveExternalId: 'kr1', matched: true },
        { objectiveExternalId: 'kr2', matched: false },
      ],
    });
    const result = await service.push('sept-2026-target-list');
    expect(result.ok).toBe(true);
  });
});

describe('the order of the push, and why it is that order', () => {
  /**
   * People, then subjects, then objectives on the check-in, then evidence.
   *
   * Every one of those refers to the one before it. Sending an objective for
   * somebody Groundwork has never heard of fails — with a message about the
   * objective, which is the wrong place to look. And evidence with no objective
   * to attach to returns 200 and writes nothing, which is worse than failing.
   *
   * That last one was the whole first build: subjects and evidence, no people
   * and no objectives, going green every time.
   */
  const { peopleFrom, objectivesFrom, evidenceFrom, subjectsFrom } = jest.requireActual(
    './what-we-send-to-groundwork',
  );

  const objectives = [
    {
      id: 'o1',
      title: 'Ten lined up',
      keyResults: [
        { id: 'kr1', title: 'Companies', target: 10, unit: 'companies', current: 4, dueDate: new Date('2026-09-30'), typedByHand: false },
      ],
    },
  ];

  it('sends people in the shape an identity provider does, with emails', () => {
    const [person] = peopleFrom([
      { key: 'hafsah', displayName: 'Hafsah Jumare', email: 'h@example.test', active: true },
    ]);
    expect(person).toMatchObject({ externalId: 'hafsah', email: 'h@example.test' });
  });

  it('and drops anybody with no email rather than sending a blank one', () => {
    /*
     * The API accepts a person with no email and then refuses, several calls
     * later, to open a check-in as them. Sending them is worse than not: it
     * produces a directory entry that looks fine and cannot be used.
     */
    const sent = peopleFrom([
      { key: 'sahar', displayName: 'Sahar', email: null, active: true },
      { key: 'gone', displayName: 'Gone', email: 'g@example.test', active: false },
      { key: 'hafsah', displayName: 'Hafsah', email: 'h@example.test', active: true },
    ]);
    expect(sent.map((p: { externalId: string }) => p.externalId)).toEqual(['hafsah']);
  });

  it('sends objectives with text and a kind, which is what that endpoint takes', () => {
    const [objective] = objectivesFrom(objectives);
    expect(objective).toMatchObject({ externalId: 'kr1', measure: 'companies', target: '10' });
    expect(objective.text).toContain('Ten lined up');
    // `described` is what a reasonable person sends and it is rejected.
    expect(objective).not.toHaveProperty('described');
  });

  it('and the evidence points at the same externalId the objective was seeded under', () => {
    /*
     * The join. Seed an objective under one id and push evidence under another
     * and both calls succeed, separately, for ever.
     */
    const [objective] = objectivesFrom(objectives);
    const [evidence] = evidenceFrom(objectives);
    const [subject] = subjectsFrom(objectives);

    expect(evidence.objectiveExternalId).toBe(objective.externalId);
    expect(subject.externalId).toBe(objective.externalId);
  });
});
