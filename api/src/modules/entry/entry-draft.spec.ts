import { EntryService, overlayDraftOntoBody } from './entry.service';

/**
 * GW-ENTRY-DRAFT tripwires.
 *
 * The server-side draft (written at entry-save, the ISSUE-17 consent moment)
 * is what makes the post-verification commit independent of which browser
 * opens the magic link. Pin every behavior the fix depends on:
 *  - commit falls back to the draft when the body is an empty skeleton,
 *  - commit is IDEMPOTENT once the draft is consumed (replays return the
 *    same ground - kills the double-fire duplicate risk),
 *  - commit with nothing anywhere fails EXPLICITLY (NO_ENTRY_SESSION), never
 *    silently succeeds or strands the user,
 *  - the legacy path (no draft row, payload in the body) works unchanged,
 *  - zero contributors flips ACTIVE (deliberate solo start) but a TOTAL
 *    invite failure keeps the ground OPEN - failure is not intent,
 *  - patchDraft is token-gated,
 *  - ISSUE-17: the stateless endpoints (chat, onboard, report) never touch
 *    the draft table.
 */

const HISTORY = [
  { role: 'user', content: 'my side of it' },
  { role: 'assistant', content: 'noted' },
];

function makeService(opts: { draft?: any; failAllInvites?: boolean } = {}) {
  const prisma: any = {
    entryDraft: {
      findUnique: jest.fn(async () => opts.draft ?? null),
      updateMany: jest.fn(async () => ({ count: 1 })),
      update: jest.fn(async () => ({})),
      create: jest.fn(async () => ({})),
      upsert: jest.fn(async () => ({})),
    },
    organization: { update: jest.fn(async () => ({})) },
    groundParticipant: { findFirst: jest.fn(async () => ({ id: 'p1' })), update: jest.fn(async () => ({})) },
    checkIn: { findFirst: jest.fn(async () => ({ id: 'ci1' })), update: jest.fn(async () => ({})) },
    conversationTurn: { createMany: jest.fn(async () => ({ count: 2 })) },
    ground: { findUnique: jest.fn(async () => ({ id: 'g-existing', joinToken: 'jt-existing' })), update: jest.fn(async () => ({})) },
    leadContextNote: { create: jest.fn(async () => ({})) },
  };
  const grounds: any = {
    create: jest.fn(async () => ({ id: 'g-new' })),
    createForLead: jest.fn(async () => ({ id: 'g-lead', joinToken: 'lead-jt' })),
    addParticipant: jest.fn(async () => {
      if (opts.failAllInvites) throw new Error('smtp down');
      return { devUrl: undefined };
    }),
  };
  const conversation: any = { extractRecordEntries: jest.fn(async () => []) };
  const events: any = { emit: jest.fn() };
  const service = new EntryService(
    { respond: jest.fn(async () => 'ok') } as any, // anthropic
    prisma,
    grounds,
    {} as any, // jwt
    {} as any, // email
    conversation,
    events,
  );
  return { service, prisma, grounds };
}

const EMPTY_BODY = { groundLabel: '', history: [] as any[], contributors: [] as any[] };

describe('commit falls back to the server-side draft (the vanish fix)', () => {
  const draft = {
    id: 'd1', userId: 'u1', consumedAt: null, groundId: null,
    payload: {
      groundLabel: 'Launch checklist ownership',
      orgName: 'Acme Ops',
      scenario: 'NEW_PROJECT',
      contributors: [{ email: 'nia@acme.test', context: 'Designer' }],
    },
    history: HISTORY,
  };

  it('commits from the draft when the body is an empty skeleton (cross-browser case)', async () => {
    const { service, prisma, grounds } = makeService({ draft });
    const res = await service.commit('org1', 'u1', EMPTY_BODY as any);

    expect(grounds.create).toHaveBeenCalledTimes(1);
    expect(grounds.create.mock.calls[0][2]).toMatchObject({ label: 'Launch checklist ownership' });
    expect(prisma.organization.update).toHaveBeenCalledWith({ where: { id: 'org1' }, data: { name: 'Acme Ops' } });
    expect(prisma.conversationTurn.createMany).toHaveBeenCalled(); // transcript from the DRAFT
    expect(grounds.addParticipant).toHaveBeenCalledTimes(1); // contributor from the DRAFT
    expect(res.groundId).toBe('g-new');
  });

  it('claims the draft atomically up front, then stamps the ground it became', async () => {
    const { service, prisma } = makeService({ draft });
    await service.commit('org1', 'u1', EMPTY_BODY as any);
    // 1. the claim: consumedAt set, guarded on consumedAt: null (concurrency gate)
    expect(prisma.entryDraft.updateMany).toHaveBeenCalledWith({
      where: { id: 'd1', consumedAt: null },
      data: { consumedAt: expect.any(Date) },
    });
    // 2. the stamp: groundId recorded for idempotent replays
    expect(prisma.entryDraft.updateMany).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { groundId: 'g-new' },
    });
  });

  it('a LOST claim race returns the winner\'s ground instead of creating a duplicate', async () => {
    const { service, prisma, grounds } = makeService({ draft });
    prisma.entryDraft.updateMany = jest.fn(async () => ({ count: 0 })); // someone else claimed first
    let reads = 0;
    prisma.entryDraft.findUnique = jest.fn(async () =>
      ++reads === 1 ? draft : { ...draft, consumedAt: new Date(), groundId: 'g-existing' },
    );
    const res = await service.commit('org1', 'u1', EMPTY_BODY as any);
    expect(res.groundId).toBe('g-existing');
    expect(grounds.create).not.toHaveBeenCalled();
  });

  it('a FAILED winner un-claims the draft so a retry can succeed', async () => {
    const { service, prisma, grounds } = makeService({ draft });
    grounds.create = jest.fn(async () => { throw new Error('db hiccup'); });
    await expect(service.commit('org1', 'u1', EMPTY_BODY as any)).rejects.toThrow('db hiccup');
    expect(prisma.entryDraft.updateMany).toHaveBeenCalledWith({
      where: { id: 'd1', groundId: null },
      data: { consumedAt: null },
    });
  });

  it('is idempotent: a consumed draft returns the existing ground, creating nothing', async () => {
    const consumed = { ...draft, consumedAt: new Date(), groundId: 'g-existing' };
    const { service, grounds, prisma } = makeService({ draft: consumed });
    const res = await service.commit('org1', 'u1', EMPTY_BODY as any);
    expect(res.groundId).toBe('g-existing');
    expect(res.joinToken).toBe('jt-existing');
    expect(grounds.create).not.toHaveBeenCalled();
    expect(grounds.createForLead).not.toHaveBeenCalled();
    expect(prisma.conversationTurn.createMany).not.toHaveBeenCalled();
  });

  it('fails EXPLICITLY (NO_ENTRY_SESSION) when there is no draft and no usable body', async () => {
    const { service, grounds } = makeService();
    await expect(service.commit('org1', 'u1', EMPTY_BODY as any)).rejects.toThrow('NO_ENTRY_SESSION');
    expect(grounds.create).not.toHaveBeenCalled();
  });

  it('legacy path unchanged: no draft row, payload in the body commits as before', async () => {
    const { service, grounds } = makeService();
    const res = await service.commit('org1', 'u1', {
      groundLabel: 'Legacy ground', history: HISTORY, contributors: [],
    } as any);
    expect(grounds.create).toHaveBeenCalledTimes(1);
    expect(grounds.create.mock.calls[0][2]).toMatchObject({ label: 'Legacy ground' });
    expect(res.groundId).toBe('g-new');
  });
});

describe('solo-ACTIVE split: failure is not intent', () => {
  it('zero contributors = deliberate solo start, ground flips ACTIVE', async () => {
    const { service, prisma } = makeService();
    await service.commit('org1', 'u1', { groundLabel: 'Solo', history: HISTORY, contributors: [] } as any);
    expect(prisma.ground.update).toHaveBeenCalledWith({ where: { id: 'g-new' }, data: { status: 'ACTIVE' } });
  });

  it('TOTAL invite failure keeps the ground OPEN and reports every failure', async () => {
    const { service, prisma } = makeService({ failAllInvites: true });
    const res = await service.commit('org1', 'u1', {
      groundLabel: 'Team', history: HISTORY,
      contributors: [{ email: 'a@x.test' }, { email: 'b@x.test' }],
    } as any);
    expect(res.failedInvites).toEqual(['a@x.test', 'b@x.test']);
    const activeFlips = prisma.ground.update.mock.calls.filter((c: any[]) => c[0]?.data?.status === 'ACTIVE');
    expect(activeFlips).toHaveLength(0); // stays OPEN - surfaced, not rebranded as solo
  });
});

describe('patchDraft is token-gated', () => {
  it('rejects a missing/unknown token and refuses consumed drafts', async () => {
    const { service } = makeService(); // findUnique -> null
    await expect(service.patchDraft('', { orgName: 'X' })).rejects.toThrow('draftToken required');
    await expect(service.patchDraft('bad-token', { orgName: 'X' })).rejects.toThrow('Draft not found');
  });

  it('shallow-merges the patch into the stored payload', async () => {
    const draft = { id: 'd1', consumedAt: null, payload: { groundLabel: 'Old', orgName: undefined } };
    const { service, prisma } = makeService();
    prisma.entryDraft.findUnique = jest.fn(async () => draft);
    await service.patchDraft('tok', { orgName: 'Acme Ops' });
    expect(prisma.entryDraft.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { payload: { groundLabel: 'Old', orgName: 'Acme Ops' } },
    });
  });
});

describe('overlayDraftOntoBody', () => {
  const draft = {
    payload: { groundLabel: 'Draft label', orgName: 'Draft org', contributors: [{ email: 'a@x.test' }] },
    history: HISTORY,
  };

  it('empty body -> pure draft (cross-browser)', () => {
    const m = overlayDraftOntoBody(draft, EMPTY_BODY);
    expect(m.groundLabel).toBe('Draft label');
    expect(m.orgName).toBe('Draft org');
    expect(m.contributors).toEqual([{ email: 'a@x.test' }]);
    expect(m.history).toEqual(HISTORY);
  });

  it('non-empty body values win field-by-field (same-browser freshness)', () => {
    const m = overlayDraftOntoBody(draft, {
      groundLabel: 'Fresh label', history: [], contributors: [{ email: 'b@y.test' }],
    });
    expect(m.groundLabel).toBe('Fresh label');
    expect(m.orgName).toBe('Draft org'); // gap filled from draft
    expect(m.contributors).toEqual([{ email: 'b@y.test' }]);
    expect(m.history).toEqual(HISTORY); // body had no turns -> draft transcript
  });

  it('maps the stored reportSummary into the report shape so the brief populates', () => {
    const m = overlayDraftOntoBody(
      { payload: { reportSummary: { whatGroundworkSaw: 'The gap is ownership.' } }, history: HISTORY },
      EMPTY_BODY,
    );
    expect(m.report).toEqual({ whatGroundworkSaw: 'The gap is ownership.' });
  });
});

describe('ISSUE-17 tripwire: stateless endpoints never touch the draft table', () => {
  it('onboard, chat and report create/read no drafts', async () => {
    const { service, prisma } = makeService();
    // Any draft-table access from the stateless endpoints must blow up the test.
    for (const fn of Object.keys(prisma.entryDraft)) {
      prisma.entryDraft[fn] = jest.fn(async () => { throw new Error(`ISSUE-17 violation: entryDraft.${fn} called`); });
    }
    const anthropic: any = (service as any).anthropic;
    anthropic.respond = jest.fn(async () =>
      JSON.stringify({ reply: 'ok', extracted: {}, ready: false }),
    );
    await service.onboard([{ role: 'user', content: 'hello' }] as any);
    anthropic.respond = jest.fn(async () => 'a plain reply');
    await service.chat([{ role: 'user', content: 'hello' }] as any, undefined, undefined);
    anthropic.extract = jest.fn(async () => null);
    await service.report([{ role: 'user', content: 'hello' }] as any, undefined, undefined);
  });
});
