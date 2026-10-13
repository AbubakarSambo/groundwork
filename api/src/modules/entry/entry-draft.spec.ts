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

function makeService(opts: { draft?: any; failAllInvites?: boolean; pendingSignup?: any } = {}) {
  const prisma: any = {
    /**
     * A draft token may belong to a PENDING SIGNUP rather than an EntryDraft.
     *
     * Since GW-001, a brand-new address creates nothing until the verification
     * link is opened, so between pressing save and opening the mail the session
     * lives only in `pendingSignup`. `patchDraft` checks there first - without it
     * every post-email edit (the org name is the main one) would 404 for that
     * whole window. Defaults to "no pending signup", so these cases exercise the
     * EntryDraft path exactly as they did before.
     */
    pendingSignup: {
      findUnique: jest.fn(async () => opts.pendingSignup ?? null),
      update: jest.fn(async () => ({})),
    },
    entryDraft: {
      findUnique: jest.fn(async () => opts.draft ?? null),
      updateMany: jest.fn(async () => ({ count: 1 })),
      update: jest.fn(async () => ({})),
      create: jest.fn(async () => ({})),
      upsert: jest.fn(async () => ({})),
    },
    user: { findUnique: jest.fn(async () => ({ role: 'ADMIN' })) },
    organization: {
      /* `commit` now checks who may open a check-in here before either path. */
      findUnique: jest.fn(async () => ({ whoMayOpenCheckIns: 'NAMED_LEADS', checkInsNeedApproval: true })), update: jest.fn(async () => ({})) },
    groundParticipant: { findMany: jest.fn(async () => [{ id: 'p1' }]), findFirst: jest.fn(async () => ({ id: 'p1' })), update: jest.fn(async () => ({})) },
    /* The round-closing call runs inside these flows now; see grounds/round-completion.ts. */
    roundCompletion: { create: jest.fn(async (a: any) => a.data) },
    checkIn: { count: jest.fn(async () => 1), findFirst: jest.fn(async () => ({ id: 'ci1' })), update: jest.fn(async () => ({})) },
    conversationTurn: { createMany: jest.fn(async () => ({ count: 2 })) },
    ground: {
      // `participants` is part of the real shape: the idempotent path selects the
      // invited participants so a second commit can still say who was invited,
      // rather than reporting an empty list the verify page reads as "nobody".
      // Without it this mock returns a ground Prisma would never return.
      findUnique: jest.fn(async () => ({ id: 'g-existing', joinToken: 'jt-existing', participants: [] })),
      update: jest.fn(async () => ({})),
    },
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
  const conversation: any = {
    extractRecordEntries: jest.fn(async () => []),
    extractExpectations: jest.fn(async () => undefined),
    /* And writes the private summary afterwards, un-awaited. The commit used to chain it off the
       extraction with `.then`, so this double never needed it. */
    buildSoloArtifact: jest.fn(async () => undefined),
    // The commit schedules session 2 now, so the mock has to answer for it.
    ensureNextSession: jest.fn(async () => undefined),
  };
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
    /*
     * The draft's transcript no longer becomes a conversation: setup stopped counting as the lead's
     * own check-in on 15 September 2026, so nothing is written onto session 1 and she answers it
     * herself. What this spec is actually for is that the DRAFT is what commit read when the body
     * arrived empty, and the assertions above and below prove that from the label, the org name and
     * the contributor. The transcript still travels - it is what the targets are read from.
     */
    /* CHANGED 11 OCTOBER (decision 133): the transcript is the check-in that followed setup, which is
       the lead's first check-in, so it is written onto session 1. Setup itself is never in it. */
    expect(prisma.conversationTurn.createMany).toHaveBeenCalledWith({ data: [
      { checkInId: 'ci1', content: 'my side of it', role: 'PERSON' },
      { checkInId: 'ci1', content: 'noted', role: 'AI' },
    ] });
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

/**
 * The window between saving an email and opening the link.
 *
 * Since GW-001 nothing is provisioned for a new address until verification, so
 * during that window the session exists only as a pending signup. Post-email
 * edits still have to land - the organisation name arrives this way - or the
 * name the person typed is silently lost at commit.
 */
describe('patchDraft reaches a signup that has no user yet', () => {
  it('updates the pending signup instead of 404ing', async () => {
    const { service, prisma } = makeService({
      pendingSignup: { id: 'ps1', payload: { groundLabel: 'New hire' } },
    });
    await expect(service.patchDraft('tok', { orgName: 'Meridian Health' })).resolves.toEqual({ ok: true });
    expect(prisma.pendingSignup.update).toHaveBeenCalled();
    // The EntryDraft path must not be touched - there is no draft yet.
    expect(prisma.entryDraft.update).not.toHaveBeenCalled();
  });

  it('merges rather than replacing what was already parked', async () => {
    const { service, prisma } = makeService({
      pendingSignup: { id: 'ps1', payload: { groundLabel: 'New hire', cadence: 'WEEKLY' } },
    });
    await service.patchDraft('tok', { orgName: 'Meridian Health' });
    const data = (prisma.pendingSignup.update as jest.Mock).mock.calls[0][0].data;
    expect(data.payload).toEqual({ groundLabel: 'New hire', cadence: 'WEEKLY', orgName: 'Meridian Health' });
  });

  it('also lifts the org name onto its own column, which verification reads', async () => {
    // verifyEmail names the organisation from `orgName` before any draft is
    // read, so leaving it only inside the payload would lose it.
    const { service, prisma } = makeService({ pendingSignup: { id: 'ps1', payload: {} } });
    await service.patchDraft('tok', { orgName: 'Meridian Health' });
    const data = (prisma.pendingSignup.update as jest.Mock).mock.calls[0][0].data;
    expect(data.orgName).toBe('Meridian Health');
  });

  it('leaves the org name column alone when the patch does not carry one', async () => {
    const { service, prisma } = makeService({ pendingSignup: { id: 'ps1', payload: {} } });
    await service.patchDraft('tok', { groundLabel: 'New hire' });
    const data = (prisma.pendingSignup.update as jest.Mock).mock.calls[0][0].data;
    expect(data.orgName).toBeUndefined();
  });
});

describe('patchDraft is token-gated', () => {
  /*
   * CHANGED IN THE U.2 REVIEW, and why. An unknown token used to be refused with "Draft not found".
   * entry-save now gives an address with an account a token of the same shape that is stored nowhere,
   * so a 404 here would say which addresses have accounts (Hafsah's rule of 26 September). An
   * unknown or used token is answered { ok: true } and NOTHING IS WRITTEN, which is what this test
   * protects: it is still token-gated.
   */
  it('refuses a missing token, and writes nothing for an unknown or used one', async () => {
    const { service, prisma } = makeService(); // findUnique -> null
    await expect(service.patchDraft('', { orgName: 'X' })).rejects.toThrow('This draft has lost its place, so start the draft again.');
    await expect(service.patchDraft('bad-token', { orgName: 'X' })).resolves.toEqual({ ok: true });
    expect(prisma.entryDraft.update).not.toHaveBeenCalled();
    expect(prisma.pendingSignup.update).not.toHaveBeenCalled();
    prisma.entryDraft.findUnique = jest.fn(async () => ({ id: 'd1', consumedAt: new Date(), payload: {} }))
    await expect(service.patchDraft('used-token', { orgName: 'X' })).resolves.toEqual({ ok: true });
    expect(prisma.entryDraft.update).not.toHaveBeenCalled();
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

describe('the commit says why an invitation waits (U.6 review)', () => {
  /* The page the link opens lists as invited only those written to, and says why each other one
     was not; it can only do that if the commit passes the reason on. */
  it('passes on "starts later" and "no seat", with the seat sentence', async () => {
    const { service, grounds } = makeService();
    grounds.addParticipant
      .mockResolvedValueOnce({ invitedAt: null, notInvitedBecause: 'starts_later' })
      .mockResolvedValueOnce({ invitedAt: null, notInvitedBecause: 'no_seat', saying: 'Held for a seat.' })
      .mockResolvedValueOnce({ invitedAt: new Date() });
    const res: any = await service.commit('org1', 'u1', {
      groundLabel: 'Help someone get back on track', history: HISTORY, scenario: 'PIP',
      contributors: [{ email: 'later@x.test' }, { email: 'guest@other.test' }, { email: 'sent@x.test' }],
    } as any);
    expect(res.contributors).toEqual([
      expect.objectContaining({ email: 'later@x.test', waiting: true, waitingBecause: 'starts_later' }),
      expect.objectContaining({ email: 'guest@other.test', waiting: true, waitingBecause: 'no_seat', saying: 'Held for a seat.' }),
      expect.objectContaining({ email: 'sent@x.test', waiting: false }),
    ]);
    expect(res.contributors[2].waitingBecause).toBeUndefined();
  });
});

describe('a future start holds the invitations from the commit too (U.6 review)', () => {
  /* Read live: start 5 October, and the invitation went the moment the confirmation link was opened
     on 27 September. addParticipant holds an invitation only when it is handed the start (see
     an-invite-waits-for-the-first-day.spec.ts, and the on-the-day cron that sends it); the commit
     never handed it one. */
  it('hands each person the check-in\'s start, so nothing is sent before it', async () => {
    const { service, grounds } = makeService();
    grounds.addParticipant.mockResolvedValue({ invitedAt: null, notInvitedBecause: 'starts_later' });
    const res: any = await service.commit('org1', 'u1', {
      groundLabel: 'Help someone get back on track', history: HISTORY, scenario: 'PIP', checkInBy: '2026-10-05',
      contributors: [{ email: 'daniel@x.test' }],
    } as any);
    expect(grounds.addParticipant.mock.calls[0][3]).toMatchObject({ email: 'daniel@x.test', startsAt: '2026-10-05' });
    expect(res.contributors[0]).toMatchObject({ waiting: true, waitingBecause: 'starts_later' });
  });

  it('and with "Now", hands no start, so it goes at once', async () => {
    const { service, grounds } = makeService();
    grounds.addParticipant.mockResolvedValue({ invitedAt: new Date() });
    await service.commit('org1', 'u1', {
      groundLabel: 'Help someone get back on track', history: HISTORY, scenario: 'PIP',
      contributors: [{ email: 'daniel@x.test' }],
    } as any);
    expect(grounds.addParticipant.mock.calls[0][3].startsAt).toBeUndefined();
  });
});

describe('a second setup is a second check-in, by its key, never by its name (U.6 review)', () => {
  /* Read live: Daniel's check-in, then Grace's a few minutes later, both "Help someone get back on
     track"; the second save handed back Daniel's check-in and Grace's was never made. */
  function withAStatefulDraft(start: any) {
    const made = makeService();
    let row: any = start ? { ...start } : null;
    let n = 0;
    made.grounds.create.mockImplementation(async () => ({ id: `g-${++n}` }));
    made.prisma.entryDraft.findUnique = jest.fn(async () => (row ? { ...row } : null));
    made.prisma.entryDraft.create = jest.fn(async ({ data }: any) => { if (row) throw new Error('unique'); row = { id: 'd1', updatedAt: new Date(), groundId: null, ...data }; return row; });
    made.prisma.entryDraft.updateMany = jest.fn(async ({ where, data }: any) => {
      if (!row || where.id !== row.id) return { count: 0 };
      if ('consumedAt' in where && where.consumedAt === null && row.consumedAt) return { count: 0 };
      if (where.updatedAt && row.updatedAt.getTime() !== new Date(where.updatedAt).getTime()) return { count: 0 };
      if ('groundId' in where && where.groundId === null && row.groundId) return { count: 0 };
      row = { ...row, ...data, updatedAt: new Date(row.updatedAt.getTime() + 1) };
      return { count: 1 };
    });
    made.prisma.ground.findUnique = jest.fn(async ({ where }: any) => ({ id: where.id, joinToken: `jt-${where.id}`, participants: [] }));
    return { ...made, row: () => row };
  }
  const body = (setupKey: string) => ({ setupKey, groundLabel: 'Help someone get back on track', scenario: 'PIP', history: HISTORY, contributors: [] });

  it('two different setups a minute apart, with the same topic name, make two check-ins', async () => {
    const s = withAStatefulDraft({ id: 'd1', userId: 'u1', consumedAt: new Date(Date.now() - 60_000), groundId: 'g-daniel', updatedAt: new Date(), payload: { setupKey: 'daniel' }, history: [] });
    const grace: any = await s.service.commit('org1', 'u1', body('grace') as any);
    expect(s.grounds.create).toHaveBeenCalledTimes(1);
    expect(grace.groundId).toBe('g-1');
    expect(grace.groundId).not.toBe('g-daniel');
  });

  it('the same save retried makes one check-in', async () => {
    const s = withAStatefulDraft(null);
    const first: any = await s.service.commit('org1', 'u1', body('grace') as any);
    const again: any = await s.service.commit('org1', 'u1', body('grace') as any);
    expect(s.grounds.create).toHaveBeenCalledTimes(1);
    expect(again.groundId).toBe(first.groundId);
  });

  it('and with no key, a different check-in soon after is still made, not handed the old one', async () => {
    const s = withAStatefulDraft({ id: 'd1', userId: 'u1', consumedAt: new Date(Date.now() - 60_000), groundId: 'g-daniel', updatedAt: new Date(), payload: {}, history: [] });
    s.prisma.ground.findUnique = jest.fn(async ({ where }: any) => ({ id: where.id, label: 'Daniel, first weeks', joinToken: 'jt', participants: [] }));
    const res: any = await s.service.commit('org1', 'u1', { ...body(''), setupKey: undefined, groundLabel: 'Grace, first weeks' } as any);
    expect(s.grounds.create).toHaveBeenCalledTimes(1);
    expect(res.groundId).toBe('g-1');
  });
});
