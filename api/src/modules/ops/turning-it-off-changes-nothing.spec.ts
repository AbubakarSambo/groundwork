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
          title: 'Companies attached to the sprint',
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

  const serviceWith = (evidenceBody: unknown) => {
    const recorded: Record<string, unknown>[] = [];
    const prisma = {
      opsIntegration: {
        findUnique: async () => ({
          id: 'the-one-row',
          enabled: true,
          baseUrl: 'https://gw.test',
          clientId: 'c',
          clientSecret: 's',
        }),
        update: async ({ data }: never) => {
          recorded.push(data as Record<string, unknown>);
          return {};
        },
      },
      opsPeriod: { findUnique: async () => ({ startsOn: new Date('2026-09-01'), endsOn: new Date('2026-09-30') }) },
      opsActivity: { findMany: async () => [] },
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
    // Stand in for the network: the token, the subject, then the evidence.
    const replies = [
      { status: 200, body: { access_token: 't', expires_in: 900, scope: '' } },
      { status: 201, body: { externalId: 'kr1' } },
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
    const result = await service.push('sept-2026-sprint');
    expect(result.ok).toBe(false);
  });

  it('and says what to do about it, rather than just failing', async () => {
    const { service } = serviceWith({ received: [{ objectiveExternalId: 'kr1', matched: false }] });
    const result = await service.push('sept-2026-sprint');
    expect(result.advice).toMatch(/objective on a check-in/);
  });

  it('and the connection screen says it too, so it is not only in one response', async () => {
    const { service, recorded } = serviceWith({ received: [{ objectiveExternalId: 'kr1', matched: false }] });
    await service.push('sept-2026-sprint');
    expect(recorded.some((r) => String(r.lastSyncSummary).includes('matched no objective'))).toBe(true);
  });

  it('but is happy when the evidence lands', async () => {
    const { service } = serviceWith({ received: [{ objectiveExternalId: 'kr1', matched: true }] });
    const result = await service.push('sept-2026-sprint');
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
    const result = await service.push('sept-2026-sprint');
    expect(result.ok).toBe(true);
  });
});
